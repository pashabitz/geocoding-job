import { connect } from "@/db/lib";
import { jobItemsTable, jobsTable } from "@/db/schema";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
const crypto = require('crypto');

class HttpError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'HttpError';
    }
}

async function processRequestData(req: NextRequest) {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
        throw new HttpError("Missing file parameter", 400);
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new HttpError("Only CSV files are supported", 400);
    }
    if (!(file instanceof File)) {
        throw new HttpError("File parameter is not a valid file", 400);
    }

    const hasHeaderStr = formData.get("has_header");
    const hasHeader = hasHeaderStr ? hasHeaderStr === "true" : false;

    return { file, hasHeader };
}

async function findExistingJob(checksum: string, fileSize: number, dataRowsCount: number) {
    const db = connect();
    return await db.select()
        .from(jobsTable)
        .where(and(
            eq(jobsTable.checksum, checksum),
            eq(jobsTable.fileSize, fileSize),
            eq(jobsTable.dataRows, dataRowsCount)
        ));
}

async function storeFile(file: File) {
    const s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = new Date().toISOString();
    const bucket = process.env.AWS_S3_BUCKET_NAME!;
    const uploadParams = {
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
    };
    console.log(uploadParams);
    const s3PutOutput = await s3.send(new PutObjectCommand(uploadParams));
    return { s3PutOutput, key: `s3://${bucket}/${key}` };
}

type JobData = typeof jobsTable.$inferInsert;
async function logJob(job: JobData, dataLines: string[]) {
    const db = connect();
    const id = await db.transaction(async (tx) => {
        const inserted = await tx.insert(jobsTable).values(job).returning();
        const id = inserted[0].id;
        const jobItems = dataLines.map((line, index) => ({
            jobId: id,
            rowNumber: index + 1,
            data: line,
        }));
        await tx.insert(jobItemsTable).values(jobItems);
        return id;
    });
    return id;
}

export async function POST(req: NextRequest) {
    try {
        const { file, hasHeader } = await processRequestData(req);

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileSize = buffer.length;
        const contentAsString = buffer.toString();
        const lines = contentAsString.split("\n");
        const dataRowsCount = hasHeader ? lines.length - 1 : lines.length;
        const checksum = crypto.createHash('md5').update(contentAsString).digest('hex');

        const existingJobs = await findExistingJob(checksum, fileSize, dataRowsCount);
        if (existingJobs.length > 0) {
            if (existingJobs.length > 1) {
                console.warn("Multiple jobs found with the same checksum and file size. This should not happen.");
            }
            const existingJob = existingJobs[0];
            return new Response(JSON.stringify({
                success: true,
                message: "File already exists",
                jobId: existingJob.id
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const { s3PutOutput, key } = await storeFile(file);

        const jobId = await logJob({
            fileName: file.name,
            fileSize,
            checksum,
            dataRows: dataRowsCount,
            hasHeader,
            storageKey: key,
        }, hasHeader ? lines.slice(1) : lines);
        // TODO delete s3 object if write into database fails

        return new Response(JSON.stringify({
            success: true,
            message: "File received successfully",
            file_size: fileSize,
            has_header: hasHeader,
            jobId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Error processing request:", error);

        const statusCode = error instanceof HttpError ? error.statusCode : 500;
        const message = error instanceof Error ? error.message : "Failed to process request";

        return new Response(JSON.stringify({ error: message }), {
            status: statusCode,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
import { findJobByChecksum, logJob } from "@/db/lib";
import { storeFile } from "@/lib/s3";
import { NextRequest, NextResponse } from "next/server";
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
    return await findJobByChecksum(checksum, fileSize, dataRowsCount);
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
            return NextResponse.json({
                message: "File already exists",
                jobId: existingJob.id,
                hasHeader: existingJob.hasHeader,
                fileSize: existingJob.fileSize,
            }, {
                status: 200
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

        return NextResponse.json({
            message: "File received successfully",
            fileSize,
            hasHeader,
            jobId
        }, {
            status: 200
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
import { drizzle } from 'drizzle-orm/neon-serverless';
import { and, eq, gte } from 'drizzle-orm';
import ws from 'ws';
import { jobItemsTable, jobsTable } from './schema';

export const connect = () => {
    return drizzle({ connection: process.env.DATABASE_URL!, ws });
};

export const getJob = async (id: number) => {
    const db = connect();
    return await db.select().from(jobsTable).where(eq(jobsTable.id, id));
}

export const getJobItems = async (jobId: number, itemsToFetch: number, offset: number) => {
    const db = connect();
    return await db.select()
        .from(jobItemsTable)
        .where(
            and(
                eq(jobItemsTable.jobId, jobId),
                gte(jobItemsTable.id, offset)
            )
        )
        .limit(itemsToFetch);
}

export const getPendingJobItems = async (jobId: number) => {
    const db = connect();
    return await db.select()
        .from(jobItemsTable)
        .where(and(
            eq(jobItemsTable.jobId, jobId),
            eq(jobItemsTable.status, "pending")
        ));
}

type ItemCompletionParams = {
    lat: string,
    long: string
} | {
    error: string
};
export const markJobItemAsCompleted = async (id: number, completionParams: ItemCompletionParams) => {
    const db = connect();
    
    if ('lat' in completionParams && 'long' in completionParams) {
        await db.update(jobItemsTable)
            .set({
                status: "completed",
                lat: completionParams.lat,
                long: completionParams.long,
            })
            .where(eq(jobItemsTable.id, id));
    } else if ('error' in completionParams) {
        await db.update(jobItemsTable)
            .set({
                status: "completed",
                error: completionParams.error,
            })
            .where(eq(jobItemsTable.id, id));
    }
}

export const findJobByChecksum = async (checksum: string, fileSize: number, dataRowsCount: number) => {
    const db = connect();
    return await db.select()
        .from(jobsTable)
        .where(and(
            eq(jobsTable.checksum, checksum),
            eq(jobsTable.fileSize, fileSize),
            eq(jobsTable.dataRows, dataRowsCount)
        ));
}
type JobData = typeof jobsTable.$inferInsert;
export const logJob = async (job: JobData, dataLines: string[]) => {
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
type JobStatus = typeof jobsTable.$inferSelect["status"];
export const updateJobStatus = async (jobId: number, status: JobStatus) => {
    const db = connect();
    await db.update(jobsTable)
        .set({ status })
        .where(eq(jobsTable.id, jobId));
}


export const getPendingJobs = async () => {
    const db = connect();
    return await db.select()
        .from(jobsTable)
        .where(eq(jobsTable.status, "pending"));
}
import { connect } from "@/db/lib";
import { jobItemsTable, jobsTable, jobStatusEnum } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import dotenv from 'dotenv';

dotenv.config();

const db = connect();
let isRunning = true;

function handleShutdown() {
  console.log('Stopping worker...');
  isRunning = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type JobItem = typeof jobItemsTable.$inferSelect;
async function geocodeOneItem(item: JobItem) {
    console.log(`Geocoding item ${item.id}...`);
    await sleep(100);
    console.log(`Geocoded item ${item.id}`);
    return { lat: 0, long: 0 };
}

type JobStatus = typeof jobsTable.$inferSelect["status"];
async function updateJobStatus(jobId: number, status: JobStatus) {
    await db.update(jobsTable)
        .set({ status })
        .where(eq(jobsTable.id, jobId));
}

async function processOneJob(jobId: number) {
    const jobItems = await db.select()
        .from(jobItemsTable)
        .where(and(
            eq(jobItemsTable.jobId, jobId),
            eq(jobItemsTable.status, "pending")
        ));
    if (jobItems.length === 0) {
        console.log(`No pending job items found for job ID ${jobId}`);
        await updateJobStatus(jobId, "completed");
        return;
    }
    for (const jobItem of jobItems) {
        const { lat, long } = await geocodeOneItem(jobItem);
        await db.update(jobItemsTable)
            .set({ 
                status: "completed", 
                lat: lat.toString(), 
                long: long.toString(),
                processedAt: new Date(),
            })
            .where(eq(jobItemsTable.id, jobItem.id));
        console.log(`Processed job item ${jobItem.id}`);
    }
    await updateJobStatus(jobId, "completed");
}
async function processJobs() {
    const pendingJobs = await db.select()
        .from(jobsTable)
        .where(eq(jobsTable.status, "pending"));
    if (pendingJobs.length === 0) {
        return;
    }
    for (const job of pendingJobs) {
        await processOneJob(job.id);
    }
}
async function startWorker() {
  console.log('Worker started - Press Ctrl+C to exit');
  
  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
  
  while (isRunning) {
    try {
      await sleep(500);
      await processJobs();
    } catch (error) {
      console.error('Error in worker loop:', error);
      await sleep(1000);
    }
  }
  
  console.log('Worker stopped');
}

startWorker().catch(error => {
  console.error('Fatal worker error:', error);
  process.exit(1);
});

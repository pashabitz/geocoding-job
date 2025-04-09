import { getPendingJobItems, getPendingJobs, markJobItemAsCompleted, updateJobStatus } from "@/db/lib";
import { jobItemsTable } from "@/db/schema";
import dotenv from 'dotenv';

dotenv.config();

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


async function processOneJob(jobId: number) {
    const jobItems = await getPendingJobItems(jobId);
    if (jobItems.length === 0) {
        console.log(`No pending job items found for job ID ${jobId}`);
        await updateJobStatus(jobId, "completed");
        return;
    }
    await updateJobStatus(jobId, "processing");
    for (const jobItem of jobItems) {
        try {
            const { lat, long } = await geocodeOneItem(jobItem);
            await markJobItemAsCompleted(jobItem.id, { lat: lat.toString(), long: long.toString() });
        } catch (error: any) {
            console.error(`Error processing job item ${jobItem.id}:`, error);
            await markJobItemAsCompleted(jobItem.id, { error: error.message });
        }
    }
    await updateJobStatus(jobId, "completed");
}
async function processJobs() {
    const pendingJobs = await getPendingJobs();
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
}

startWorker().catch(error => {
  console.error('Fatal worker error:', error);
  process.exit(1);
});

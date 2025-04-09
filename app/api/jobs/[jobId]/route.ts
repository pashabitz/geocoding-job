import { getJob } from '@/db/lib';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ jobId: number }> }
) {
    try {
        const params = await props.params;
        const jobId = params.jobId;
        const jobs = await getJob(jobId);

        if (jobs.length === 0) {
            return NextResponse.json({ message: 'Job not found' }, { status: 404 });
        }

        if (jobs.length > 1) {
            console.log(`Multiple job records found with the same ID ${jobId}. This should not happen.`);
            return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
        }
        const job = jobs[0];

        return NextResponse.json({
            job: {
                id: job.id,
                fileSize: job.fileSize,
                checksum: job.checksum,
                dataRows: job.dataRows,
                hasHeader: job.hasHeader,
                status: job.status,
                createdAt: job.createdAt,
            },
        });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ message: "Unexpected error while fetching job" }, { status: 500 });
    }
}

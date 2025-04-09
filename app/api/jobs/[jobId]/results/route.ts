import { getJob, getJobItems } from '@/db/lib';
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

        const { searchParams } = new URL(request.url);
        let pageSize = 10;
        if (searchParams.has('pageSize')) {
            pageSize = parseInt(searchParams.get('pageSize')!);
            if (isNaN(pageSize) || pageSize <= 0) {
                return NextResponse.json({ message: 'Invalid page size' }, { status: 400 });
            }
        }
        let offset = 0;
        if (searchParams.has('offset')) {
            offset = parseInt(searchParams.get('offset')!);
            if (isNaN(offset) || offset < 0) {
                return NextResponse.json({ message: 'Invalid offset' }, { status: 400 });
            }
        }

        const items = await getJobItems(jobId, pageSize, offset);
        if (items.length === 0) {
            return NextResponse.json({ message: 'No job items found' }, { status: 404 });
        }

        return NextResponse.json({
            items
        });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ message: "Unexpected error while fetching items" }, { status: 500 });
    }

}

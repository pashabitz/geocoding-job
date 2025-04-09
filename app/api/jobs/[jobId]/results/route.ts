import { getJobItems } from '@/db/lib';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ jobId: number }> }
) {
    const params = await props.params;
    const jobId = params.jobId;
    const items = await getJobItems(jobId);
    if (items.length === 0) {
        return NextResponse.json({ message: 'No job items found' }, { status: 404 });
    }

    return NextResponse.json({
        items
    });
}

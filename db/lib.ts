import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from 'ws';
import { jobsTable } from './schema';

export const connect = () => {
    return drizzle({ connection: process.env.DATABASE_URL!, ws });
};

export const getJob = async (id: number) => {
    const db = connect();
    return await db.select().from(jobsTable).where(eq(jobsTable.id, id));
}
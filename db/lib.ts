
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
export const connect = () => {
    return drizzle({ connection: process.env.DATABASE_URL!, ws });
};
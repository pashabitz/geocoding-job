import { boolean, index, integer, pgEnum, pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "completed"]);
export const jobsTable = pgTable("jobs", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size").notNull(),
    checksum: varchar("checksum", { length: 64 }).notNull(), 
    dataRows: integer("data_rows").notNull(),
    hasHeader: boolean("has_header").notNull().default(true),
    storageKey: varchar("storage_key", { length: 512 }).notNull(),
    status: jobStatusEnum().default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
    return [
        index('checksum_idx').on(table.checksum),
    ];
});
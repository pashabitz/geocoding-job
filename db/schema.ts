import { boolean, index, integer, pgEnum, pgTable, varchar, timestamp, numeric } from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", ["pending", "processing", "completed"]);
export const jobsTable = pgTable("jobs", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    fileName: varchar("file_name", { length: 256 }).notNull(),
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

export const jobItemsTable = pgTable("job_items", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    jobId: integer("job_id").notNull().references(() => jobsTable.id),
    rowNumber: integer("row_number").notNull(),
    data: varchar("data", { length: 1024 }).notNull(),
    status: jobStatusEnum().default("pending").notNull(),
    lat: numeric("lat"),
    long: numeric("long"),
    error: varchar("error", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
});
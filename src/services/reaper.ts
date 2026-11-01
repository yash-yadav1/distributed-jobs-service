import { pool } from "../db";

export interface ReapedJob {
    id: number;
    status: "queued" | "dead";
    attempts: number;
}

export async function reapExpiredJobs(): Promise<ReapedJob[]> {
    const result = await pool.query(`
        UPDATE jobs
        SET status = CASE
                WHEN attempts > max_retries THEN 'dead'
                ELSE 'queued'
            END,
            lease_until = NULL,
            lease_token = NULL
        WHERE status = 'running'
          AND lease_until IS NOT NULL
          AND lease_until < NOW()
        RETURNING id, status, attempts
    `);

    return result.rows;
}
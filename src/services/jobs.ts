import {Job,JobStatus} from "../types";
import { pool } from "../db";
import {randomUUID} from "node:crypto";

const validStatuses : JobStatus[] = ["queued" , "running" , "succeeded" , "failed" , "dead"];

export async function createJob(project_id: number , command:string ,image:string) : Promise<Job>{
    const result = await pool.query(
        `INSERT INTO jobs (project_id,command, image, status)
         VALUES ($1, $2, $3,$4)
         RETURNING *`,
        [project_id,command, image, "queued"]
    );
    return result.rows[0];
}


export async function getJobs():Promise<Job[]> {
    const result=await pool.query(
        "SELECT * FROM jobs ORDER BY id"
    );
    return result.rows;
}

export async function getJob(id: number): Promise <Job | undefined> {
    const result=await pool.query(
        "SELECT * FROM jobs where id=$1",[id]
    );
    return result.rows[0];
}

export async function updateJobStatus(id: number,status : JobStatus) : Promise<{job?: Job,error?: string}> {

    if (!validStatuses.includes(status)) {
        return {error: "invalid status "};
    }
    
    if (status !== "queued" && status !== "dead") {
        return { error: "This status must be changed through the job execution lifecycle" }; 
    }

    const result = await pool.query(
        `UPDATE jobs
         SET status = $1,
         lease_until=NULL,
         lease_token=NULL
         WHERE id = $2
         AND status = 'queued'
         RETURNING *`,
        [status, id]
    );

    if (result.rows.length === 0) { 
        const existing = await pool.query( 
            `SELECT id, status FROM jobs WHERE id = $1`, [id] 
        ); 

        if (existing.rows.length === 0) { 
            return { error: "Job not found" }; 
        } 

        return {
            error: `Cannot change job from status '${existing.rows[0].status}' using this operation` 
        }; 

    }

    return {
        job: result.rows[0]
    };
}


export async function getJobsByProject(projectId: number) : Promise<Job[]>{
    const result = await pool.query(
        `SELECT *
         FROM jobs
         WHERE project_id = $1
         ORDER BY id`,
        [projectId]
    );

    return result.rows;
}


export async function claimJob() : Promise<Job | undefined>{
    const client=await pool.connect();

    try{
        await client.query("BEGIN");
        const result = await client.query(`
            SELECT *
            FROM jobs
            WHERE status = 'queued'
            ORDER BY id
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        `);

        if(result.rows.length===0) {
            await client.query("COMMIT");
            return undefined;
        }
        const job=result.rows[0];
        const leaseToken=randomUUID();


        const updated=await client.query(
            `UPDATE jobs
             SET status = 'running',
                attempts = attempts + 1,
                lease_until = NOW() + INTERVAL '90 seconds',
                lease_token = $1
             WHERE id = $2
             RETURNING *`,
            [leaseToken,job.id]
        );
        await client.query("COMMIT");
        return updated.rows[0];
        
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }finally {
        client.release();
    }
}


export async function completeJob(id : number,leaseToken: string,status: "succeeded"| "failed") : Promise<Job | undefined>{
    const result=await pool.query(
        `UPDATE jobs
         SET status = $1,
            lease_until = NULL,
            lease_token = NULL
        WHERE id = $2
            AND status = 'running'
            AND lease_token = $3
         RETURNING *`,
        [status, id,leaseToken]
    );
    return result.rows[0];
}


export async function failJob(id: number ,leaseToken: string) : Promise<Job | undefined > {
    const result=await pool.query(
        `
        UPDATE jobs
        SET status = CASE
                WHEN attempts <= max_retries
                THEN 'queued'
                ELSE 'dead'
            END,
            lease_until = NULL,
            lease_token = NULL
        WHERE id = $1
            AND status = 'running'
            AND lease_token = $2
         RETURNING *
        `
        ,[id,leaseToken]
    );
    return result.rows[0];
}


export async function renewLease(id: number ,leaseToken: string ) : Promise<Job | undefined> {
    const result= await  pool.query(
        `
        UPDATE jobs
        SET lease_until = NOW() + INTERVAL '90 seconds'
        WHERE id = $1
          AND status = 'running'
          AND lease_token = $2
          AND lease_until > NOW()
        RETURNING *
        `,
        [id, leaseToken]
    );
    return result.rows[0];
}

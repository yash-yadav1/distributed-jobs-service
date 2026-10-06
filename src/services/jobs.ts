import {Job,JobStatus} from "../types";
import { pool } from "../db";


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
    
    const result = await pool.query(
        `UPDATE jobs
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
    );

    if (result.rows.length === 0) {
        return {
            error: "Job not found"
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

        const updated=await client.query(
            `UPDATE jobs
             SET status = 'running',
                 attempts = attempts + 1
             WHERE id = $1
             RETURNING *`,
            [job.id]
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


export async function completeJob(id : number,status: "succeeded"| "failed") : Promise<Job | undefined>{
    const result=await pool.query(
        `UPDATE jobs
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
    );
    return result.rows[0];
}

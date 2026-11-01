import { pool } from "./db";
import { reapExpiredJobs } from "./services/reaper";

const REAPER_INTERVAL_MS = 10_000;

async function startReaper(): Promise<void> {
    console.log("Lease reaper started");

    while (true) {//complete history of what the reaper has done to the existing jobs 
        try {
            const jobs = await reapExpiredJobs();//get the result of all jobs modified by reaper 

            for (const job of jobs) {//classify them as dead or queued acc. to attempts
                if (job.status === "dead") {
                    console.log(
                        `Reaper: Job ${job.id} marked dead ` +
                        `after ${job.attempts} attempts`
                    );
                } else {
                    console.log(
                        `Reaper: Job ${job.id} requeued ` +
                        `after lease expiration`
                    );
                }
            }
        } catch (error) {//report any error which stops the reaper 
            console.error("Lease reaper error:", error);
        }

        await new Promise(resolve =>
            setTimeout(resolve, REAPER_INTERVAL_MS)
        );
    }
}

startReaper().catch(async error => {//if startReaper function gives any error print it and exit with proper exit code
    console.error("Lease reaper stopped unexpectedly:", error);
    await pool.end();
    process.exitCode = 1;
});
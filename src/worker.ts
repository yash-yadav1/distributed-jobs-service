import { claimJob ,completeJob,failJob,renewLease} from "./services/jobs";
import { runDockerJob } from "./docker";
import { pool } from "./db";

let isShuttingDown = false;

process.on("SIGINT", () => {
    console.log("\nReceived SIGINT. Shutting down worker...");
    isShuttingDown = true;
});

process.on("SIGTERM", () => {
    console.log("\nReceived SIGTERM. Shutting down worker...");
    isShuttingDown = true;
});


async function startLeaseRenewal(id: number,leaseToken: string,controller: AbortController): Promise<{
    stop: () => void;
    lostLease: () => boolean;
}> {
    let leaseLost = false;
    let stopped = false;
    let renewalTimer: ReturnType<typeof setTimeout> | undefined;

    const renew = async (): Promise<void> => {
        if (stopped || leaseLost) {
            return;
        }
        try {
            const renewedJob = await renewLease(id, leaseToken);

            if (!renewedJob) {
                leaseLost = true;
                console.error(`Job ${id}: lease lost`);
                controller.abort();
                return;
            }
        } catch (error) {
            console.error(`Job ${id}: lease renewal failed`, error);
            leaseLost = true;
            controller.abort();
            return;
        }

        if (!stopped && !leaseLost) {
            renewalTimer = setTimeout(() => {
                void renew();
            }, 30_000);
        }
    };

    renewalTimer = setTimeout(() => {
        void renew();
    }, 30_000);

    return {
        stop: () => {
            stopped = true;
            if (renewalTimer !== undefined) {
                clearTimeout(renewalTimer);
            }
        },
        lostLease: () => leaseLost
    };
}



async function startWorker() {
    console.log("worker started ");
    try {
        while(!isShuttingDown){
            try{
                const job= await claimJob();

                if(!job){
                    if (isShuttingDown) break;

                    console.log("no job available");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                console.log("claimed job : ",job);

                if (!job.lease_token) {
                    throw new Error(`Job ${job.id} was claimed without a lease token`);
                }

                const leaseToken = job.lease_token;
                const controller =  new AbortController();
                const lease = await startLeaseRenewal(job.id,leaseToken,controller); 

                try {
                    const result = await runDockerJob(
                        job.image,
                        job.command,
                        60,
                        {signal: controller.signal}
                    );//return the stdout,stderr for checking the results after every step of execution

                    console.log("Job output:", result.stdout);
                    if (lease.lostLease()) {
                        console.warn(
                            `Job ${job.id}: execution finished, but lease ownership was lost.`
                        );
                        continue;
                    }
                    const completedJob = await completeJob(job.id,leaseToken,"succeeded");

                    if (!completedJob) {
                        console.warn(
                            `Job ${job.id}: execution finished, but this worker no longer owns the job.`
                        );
                        continue;
                    }
                    console.log(`Job ${job.id} succeeded`);

                } catch (error) {

                    console.error(`Job ${job.id} failed:`, error);
                    if (lease.lostLease()) {
                        console.warn(
                            `Job ${job.id}: failure was not recorded because lease ownership was lost.`
                        );
                        continue;
                    }
                    const updatedJob = await failJob(job.id,leaseToken);

                    if (!updatedJob) {
                        console.warn(
                            `Job ${job.id}: failure could not be recorded because this worker no longer owns the job.`
                        );
                        continue;
                    }

                    console.log(`Job ${job.id} is now ${updatedJob?.status}`);
                } finally {
                    lease.stop();
                }

            } catch (error) {
                console.error("worker error :",error);

                await new Promise(resolve=>setTimeout(resolve,2000));
            }
        }
    } finally {
        console.log("Closing database connections...");
        await pool.end();
        console.log("Worker shutdown complete");
    }
}

startWorker().catch(error => {
    console.log("worker stopped unexpextedlly: ",error);
    process.exitCode=1;
}) ;
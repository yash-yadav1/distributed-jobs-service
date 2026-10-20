import { claimJob ,completeJob,failJob} from "./services/jobs";
import { runDockerJob } from "./docker";

async function startWorker() {
    console.log("worker started ");
    while(true){
        try{
            const job= await claimJob();

            if(!job){
                console.log("no job available ");
                await new Promise(resolve=>setTimeout(resolve,2000));
                continue;
            }
            console.log("claimed job : ",job);

            if (!job.lease_token) {
                throw new Error(`Job ${job.id} was claimed without a lease token`);
            }

            const leaseToken = job.lease_token;
            
            try {
                const result = await runDockerJob(
                    job.image,
                    job.command,
                    60
                );//return the stdout,stderr for checking the results after every step of execution

                console.log("Job output:", result.stdout);

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

                const updatedJob = await failJob(job.id,leaseToken);

                if (!updatedJob) {
                    console.warn(
                        `Job ${job.id}: failure could not be recorded because this worker no longer owns the job.`
                    );
                    continue;
                }

                console.log(`Job ${job.id} is now ${updatedJob?.status}`);
            }

        } catch (error) {
            console.error("worker error :",error);

            await new Promise(resolve=>setTimeout(resolve,2000));
        }
    }
}

startWorker();
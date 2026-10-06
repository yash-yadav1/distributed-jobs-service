import { resolve } from "node:dns";
import { claimJob ,completeJob} from "./services/jobs";
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
            
            try {
                const result = await runDockerJob(
                    job.image,
                    job.command
                );

                console.log("Job output:", result.stdout);

                await completeJob(job.id, "succeeded");

                console.log(`Job ${job.id} succeeded`);

            } catch (error) {

                console.error(`Job ${job.id} failed:`, error);

                await completeJob(job.id, "failed");

                console.log(`Job ${job.id} marked as failed`);
            }

        } catch (error) {
            console.error("worker error :",error);

            await new Promise(resolve=>setTimeout(resolve,2000));
        }
    }
}

startWorker();
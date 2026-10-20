import { runDockerJob } from "./docker";

async function main() {
    console.log("Starting a job with resource limits...");

    try {
        const result = await runDockerJob(
            "alpine:latest",
            "sleep 8",
            15,
            {
                memoryMB: 256,
                cpus: 0.5,
                pidslimit: 128
            }
        );

        console.log("Job completed successfully!");
        console.log("stdout:", result.stdout);
        console.log("stderr:", result.stderr);
    } catch (error) {
        console.error("Job failed:", error);
    }
}

main();


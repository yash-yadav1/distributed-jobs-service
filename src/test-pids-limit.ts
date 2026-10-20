import { runDockerJob } from "./docker";

async function main() {
    console.log("========== PID LIMIT TEST ==========");

    try {
        const result = await runDockerJob(
            "alpine:latest",
            "i=0; while [ $i -lt 100 ]; do sleep 20 & i=$((i+1)); done; echo 'Spawn attempts completed'; while :; do :; done",
            30,
            {
                memoryMB: 128,
                cpus: 0.5,
                pidslimit: 32
            }
        );

        console.log("Job completed!");
        console.log("stdout:", result.stdout);
        console.log("stderr:", result.stderr);
    } catch (error) {
        const err = error as Error & {
            code?: number;
            stdout?: string;
            stderr?: string;
        };

        console.log("Job ended:", err.message);
        console.log("Exit code:", err.code);
        console.log("stdout:", err.stdout);
        console.log("stderr:", err.stderr);
    }
}

main();
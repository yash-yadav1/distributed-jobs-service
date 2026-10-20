import { runDockerJob } from "./docker";

async function main() {
    console.log("========== MEMORY LIMIT TEST ==========");

    try {
        const result = await runDockerJob(
            "python:3.12-alpine",
            "python -c \"x = bytearray(256 * 1024 * 1024); print('Allocation succeeded')\"",
            30,
            {
                memoryMB: 64,
                cpus: 0.5,
                pidslimit: 128
            }
        );

        console.log("Job completed!");
        console.log("stdout:", result.stdout);
        console.log("stderr:", result.stderr);
    } catch (error) {
        const err = error as Error & { code?: number };

        console.log("Job failed, as expected if memory was exceeded.");
        console.log("Error:", err.message);
        console.log("Exit code:", err.code);
    }
}

main();
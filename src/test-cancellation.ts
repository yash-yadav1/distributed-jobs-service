import { runDockerJob } from "./docker";

async function testCancellation() {
    const controller = new AbortController();

    console.log("Starting Docker job...");

    const jobPromise = runDockerJob(
        "ubuntu",
        "sleep 120 && echo should-not-appear",
        60,
        { signal: controller.signal }
    );

    setTimeout(() => {
        console.log("Requesting cancellation...");
        controller.abort();
    }, 3000);

    try {
        const result = await jobPromise;

        console.error("TEST FAILED: Job completed unexpectedly.");
        console.log("Job output:", result.stdout);

        process.exitCode = 1;
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Job execution cancelled"
        ) {
            console.log("TEST PASSED: Job was cancelled successfully.");
        } else {
            console.error("TEST FAILED: Unexpected error:", error);
            process.exitCode = 1;
        }
    }

}

void testCancellation();

import { runDockerJob } from "./docker";

async function testTimeout() {
console.log("========== TEST 1: SUCCESSFUL JOB ==========");

try {
    const result = await runDockerJob(
        "ubuntu",
        "echo hello",
        5
    );

    console.log("Job succeeded!");
    console.log("stdout:", result.stdout);
    console.log("stderr:", result.stderr);
} catch (error) {
    console.error("Unexpected error:", error);
}

console.log("\n========== TEST 2: INVALID TIMEOUT ==========");

try {
    await runDockerJob(
        "ubuntu",
        "echo hello",
        0
    );

    console.error("FAIL: Expected an invalid-timeout error.");
} catch (error) {
    console.log("Invalid timeout correctly rejected.");

    if (error instanceof Error) {
        console.log("Error message:", error.message);
    }
}


console.log("\n========== TEST 3: EXECUTION TIMEOUT ==========");

const startTime = Date.now();

try {
    await runDockerJob(
        "ubuntu",
        "sleep 100",
        2
    );

    console.error("FAIL: Expected the job to time out.");
} catch (error: unknown) {
    const elapsedSeconds =
        (Date.now() - startTime) / 1000;

    console.log("Job failed as expected.");
    console.log(
        "Elapsed time:",
        elapsedSeconds.toFixed(2),
        "seconds"
    );

    if (error instanceof Error) {
        console.log("Error name:", error.name);
        console.log("Error message:", error.message);

        const processError = error as Error & {
            killed?: boolean;
            signal?: NodeJS.Signals | null;
            code?: string | number | null;
            cmd?: string;
            errno?: number | string;
            path?: string;
            syscall?: string;
            stdout?: string;
            stderr?: string;
        };

        console.log("killed:", processError.killed);
        console.log("signal:", processError.signal);
        console.log("code:", processError.code);
        console.log("cmd:", processError.cmd);
        console.log("errno:", processError.errno);
        console.log("path:", processError.path);
        console.log("syscall:", processError.syscall);
        console.log("stdout:", processError.stdout);
        console.log("stderr:", processError.stderr);

        if (
            processError.killed === true &&
            processError.signal
        ) {
            console.log(
                "Diagnostic: Child process was terminated by a signal."
            );
        } else if (processError.code === "ENOENT") {
            console.log(
                "Diagnostic: Docker executable could not be found."
            );
        } else {
            console.log(
                "Diagnostic: Inspect the error properties to classify the failure."
            );
        }
    } else {
        console.log("Unknown error:", error);
    }
}

console.log("\n========== ALL TESTS FINISHED ==========");

}

testTimeout().catch((error: unknown) => {
console.error("Test script failed unexpectedly:", error);
process.exitCode = 1;
});

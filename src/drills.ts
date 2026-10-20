import {execFile} from "child_process";//to execute external programs we use child process  like docker ps normally executed in terminal but using child_process we can execute it in our tests

//exec file seperates OS-process it starts docker cli which communicates with docker daemon
import { promisify } from "util";//to handle asynchrous code 
import assert from "node:assert/strict";//checks whether something matches the value or not
import { runDockerJob } from "./docker";

const execFileAsync=promisify(execFile);//seperate variable  

type ProcessError = Error & {
    code?: string| number;
    killed?: boolean;
    signal?: string | null;
    stdout?: string;
    stderr?: string;
};

async function leftoverContainers(): Promise<string[]> {
    const { stdout } = await execFileAsync("docker",
        ["ps", "-aq", "--filter", "name=job-"]);//daignostic command to check the state of that job 
    return stdout.split("\n").filter(Boolean);
}

async function captureError(p: Promise<unknown>): Promise<ProcessError> {//extra precaution for the execution  of program
    try {
        await p;
    } catch (e) {
        return e as ProcessError;
    }
    assert.fail("expected the job to fail, but it succeeded");
}

async function drill(name: string, body: () => Promise<void>) {
    console.log(`\n--- ${name} ---`);
    try {
        await body();
        assert.deepEqual(await leftoverContainers(), [], "a container leaked");
        console.log("PASS");
    } catch (e) {
        console.log("FAIL:", e);
        process.exitCode = 1;
    }
}

async function main() {
    await drill("nonexistent image", async () => { // this tests how the job runner behaves when there is a non-existent image 
        const err = await captureError(
            runDockerJob("nonexistent-image-xyz", "echo hi", 30));
        console.log("code:", err.code, "| stderr:", err.stderr?.trim());
        assert.equal(err.code, 125);
    });

    await drill("job exits with code 3", async () => { // deliberately make a process exit with some code to cause failure and check if it is handled properly
        const err = await captureError(runDockerJob("ubuntu", "exit 3", 10));
        assert.equal(err.code, 3);
    });

    await drill("command not found", async () => { // exit when the command does not exist with proper exit code 
        const err = await captureError(
            runDockerJob("ubuntu", "this-command-does-not-exist", 10));
        assert.equal(err.code, 127);
    });

    // await drill("memory hog hits the limit", async () => { //how job runner behaves when a container consumes excessive resources.
    //     const err = await captureError(runDockerJob("ubuntu", "tail /dev/zero", 30));
    //     //On Linux, /dev/zero provides a continuous stream of zero bytes. The tail command attempts to read and print that stream.
    //     console.log("code:", err.code, "| killed:", err.killed);
    //     assert.equal(err.code, 137);
    //     assert.notEqual(err.killed, true);// To distinguish between: 1. The container's command being killed.   2. Node.js killing its own Docker CLI child process.
    // });

    await drill("timeout kills the container", async () => {
        const start = Date.now();
        const err = await captureError(runDockerJob("ubuntu", "sleep 100", 2));
        const elapsed = (Date.now() - start) / 1000;
        console.log("elapsed:", elapsed.toFixed(2));//fix upto two decimal points 
        assert.ok(elapsed < 5, "timeout did not fire promptly");//generous limit to check if process exited within 5 sec   why 2 sec bcz-> docker startup,process scheduling ,cleanup overhead
        assert.ok(err.message.includes("timed out")); //check whether error message contains " timed out "
    });
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});

import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

interface DockerJobOptions {
    memoryMB ?: number;
    cpus ?: number;
    pidslimit ?: number;
}

export async function runDockerJob( image: string,command: string,timeoutSeconds: number,options : DockerJobOptions={} ): Promise<{ stdout: string; stderr: string }> {

    // 1. Set default resource limits.
    const memoryMB = options.memoryMB ?? 256 ;
    const cpus = options.cpus ?? 0.5 ;
    const pidslimit = options.pidslimit ?? 128 ;

    // 2. Validate the timeout.
    if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {//whether it is positive value
        throw new Error("timeoutSeconds must be a positive number");
    }

    // 3. Validate the resource limits.
    if (!Number.isSafeInteger(memoryMB) || memoryMB <= 0) {//whether it is positive and also whole integer
        throw new Error("memoryMB must be a positive integer");
    }

    if (!Number.isFinite(cpus) || cpus <= 0 ) {
        throw new Error("cpus must be a positive number");
    }

    if (!Number.isSafeInteger(pidslimit) || pidslimit <= 0 ) {
        throw new Error("pidslimit must be a positive integer");
    }

    // 4. Generate a unique name for this job's container.
    const containerName = `job-${randomUUID()}`;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;

    try {
        // 5. Start the container in detached mode with resource limits.
        await execFileAsync(
            "docker",
            [
                "run",
                "-d",
                "--name", containerName,
                "--memory", `${memoryMB}m`,
                "--cpus", String(cpus),
                "--pids-limit", String(pidslimit),
                image,
                "sh",
                "-c",
                command
            ],
            { timeout: 10000 }
        );

        // 6. Create a Promise that rejects when the job times out.
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(async () => {
                timedOut = true;

                try {
                    // Stop the actual container, not just the Docker CLI.
                    await execFileAsync(
                        "docker",
                        ["stop", "--time", "1", containerName],
                        { timeout: 5000 }
                    );
                }catch (error) {
                    console.error(
                        `Failed to stop container ${containerName}:`,
                        error
                    );
                }reject(
                    new Error(
                        `Job timed out after ${timeoutSeconds} seconds`
                    )
                );
            }, timeoutSeconds * 1000);
        });

       // 7. Wait for the container to finish.
        const waitPromise = execFileAsync(
            "docker",
            ["wait", containerName]
        );

        const { stdout: exitCodeOutput } = await Promise.race([
            waitPromise,
            timeoutPromise
        ]);
        // 8. Check whether the job exceeded its timeout.
        if (timedOut) {
            throw new Error(`Job timed out after ${timeoutSeconds} seconds`);
        }

         // 9. Retrieve the output produced by the container.
        const { stdout, stderr } = await execFileAsync(
            "docker",
            ["logs", containerName],
            { timeout: 5000 }
        );

        // 10. Read the container's exit code.
        const exitCode = Number(exitCodeOutput.trim());

        if (!Number.isInteger(exitCode)) {
            throw new Error("Docker returned an invalid exit code");
        }

        // 11. Preserve the exit code and output when the job fails.
        if (exitCode !== 0) {
            const error = new Error(
                `Job failed with exit code ${exitCode}`
            ) as Error & {
                code?: number;
                stdout?: string;
                stderr?: string;
            };

            error.code = exitCode;
            error.stdout = stdout;
            error.stderr = stderr;

            throw error;
        }

        // 12. Return the successful job's output.
        return { stdout, stderr };

    } finally {
        // 13. Cancel the timeout timer.
        if (timer !== undefined) {
            clearTimeout(timer);
        }

        // 14. Always attempt to remove the container.
        try {
            await execFileAsync(
                "docker",
                ["rm", "-f", containerName],
                { timeout: 5000 }
            );
        } catch (cleanupError) {
            console.error(
                `Failed to remove Docker container ${containerName}:`,
                cleanupError
            );
        }
    }
}
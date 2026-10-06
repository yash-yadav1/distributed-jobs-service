import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function runDockerJob(
    image: string,
    command: string
) {
    const { stdout, stderr } = await execFileAsync(
        "docker",["run","--rm",image,"sh","-c",command]
    );

    return {
        stdout,
        stderr
    };
}

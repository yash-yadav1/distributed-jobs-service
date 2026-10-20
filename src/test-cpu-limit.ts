import { runDockerJob } from "./docker";

async  function main() {
    console.log("---------------CPU LIMIT TEST-----------------");

    try{
        //just run a for loop for n number of times 
        const result=await runDockerJob(
            "alpine:latest",
            "i=0; while [ $i -lt 500000 ]; do i=$((i+1)); done; sleep 20; echo 'CPU workload completed' ",
            20,{ memoryMB:128,cpus: 0.5 , pidslimit:128}
        );
        console.log("Job completed succesfully!");
        console.log("stdout : ",result.stdout);
        console.log("stderr: ",result.stderr);
    } catch (error) {
        const err=error as Error & { code?: number};
        console.log("Job failed : ",err.message);
        console.log("Exit code : ",err.code);
    }
}

main();
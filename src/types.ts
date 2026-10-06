export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "dead";
export type Job ={
    id : number;
    command : string;
    image : string;
    status : JobStatus;
    created_at : string;
};
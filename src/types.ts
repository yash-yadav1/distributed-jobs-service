export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "dead";
export type Job ={
    id : number;
    project_id: number;
    command : string;
    image : string;
    status : JobStatus;
    created_at : string;
    attempts:number;
    max_retries:number;
    lease_until: Date | null;
    lease_token: string | null;
    timeout_seconds: number; 
};

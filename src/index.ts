console.log("hello world");

import http from "http";

import { createJob , getJob , getJobs , updateJobStatus ,getJobsByProject} from "./services/jobs";

// import "./db";

import { createProject,getProjects,getProject,updateProject } from "./services/projects";

const server=http.createServer(async (req,res)=>{

    //GET commands 

    //GET BASIC
    if (req.method === "GET" && req.url === "/") {
        res.end("Welcome to the Distributed Job Service");
        return;
    }

    //GET /jobs 
    if (req.method === "GET" && req.url === "/jobs") {
        res.setHeader("Content-Type", "application/json");

        try {
            const jobs = await getJobs();

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(jobs));
        }
        catch (error) {
            console.error(error);

            res.statusCode = 500;

            res.end(JSON.stringify({
                error: "Database error"
            }));
        }

        return;
    }

    //GET /jobs/ :  id
    if (req.method === "GET" && req.url?.startsWith("/jobs/") ) {
        const id=Number(req.url.split("/")[2]);

        res.setHeader("Content-Type","application/JSON");

        try{
            const job=await getJob(id);
            if (!job) {
                res.statusCode = 404;

                res.end(JSON.stringify({
                    error: "Job not found"
                }));

                return;
            }
            res.end(JSON.stringify(job));
        }
        catch(error) {

            console.error("DATABASE ERROR:", error);

            res.statusCode = 500;

            res.end(JSON.stringify({
                error: "Database error"
            }));
        }
        return;
    }

    //GET JOBS BY PROJECT id
    if (
        req.method === "GET" &&
        req.url?.startsWith("/projects/") &&
        req.url?.endsWith("/jobs")
    ) {
        const projectId = Number(req.url.split("/")[2]);

        try {
            const jobs = await getJobsByProject(projectId);

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");

            res.end(JSON.stringify(jobs));

        } catch (error) {
            console.error("DATABASE ERROR:", error);

            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");

            res.end(JSON.stringify({
                error: "Database error"
            }));
        }

        return;
    }
    //PATCH command 

    //PATCH /jobs/ : id
    if (req.method === "PATCH" && req.url?.startsWith("/jobs/")) {
        const id = Number(req.url.split("/")[2]);

        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        
        req.on("end", async () => {

            try {
                const data = JSON.parse(body);
                
                const result=await updateJobStatus(id,data.status);

                if (result.error) {
                    res.statusCode = result.error === "Job not found" ? 404 : 400;

                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({
                        error: result.error
                    }));

                    return;
                }
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(result.job));

            } catch (error) {
                console.log("Database ERROR : ",error);
                res.statusCode = 400;
                res.end(JSON.stringify({
                    error: "Invalid JSON"
                }));
            }
        });
        return;
    }

    // POST command

    //POST /projects/:id/jobs  => create a new job with the attributes given by the user like command & image
    if (req.method === "POST" && req.url?.startsWith("/projects/")  &&  req.url?.endsWith("/jobs")) {
        const project_id=Number(req.url.split("/")[2]);
        let body="";
        req.on("data",(chunk)=>{
            body+=chunk;
        });

        
        req.on("end",()=>{
            try{
                const data=JSON.parse(body);

                if (!data.command || !data.image) {
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");

                    res.end(JSON.stringify({
                        error: "command and image are required"
                    }));

                    return;
                }

                createJob(project_id,data.command,data.image).then((job)=>{
                    res.statusCode=201;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify(job));
                })
                .catch((error)=>{
                    console.error("DATABASE ERROR:", error);

                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");

                    res.end(JSON.stringify({
                        error: "Database error"
                    }));
                });

            }catch(error) {
                res.statusCode=400;
                res.setHeader("Content-Type","application/JSON");
                res.end(JSON.stringify({
                    error:"INVALID JSON"
                }));
                console.log(JSON.stringify({
                    error : "INVALID JSON"
                }));
            }
            
        });

        return;
    }

    //NOW PROJECTS REQUEST HANDLING


    //GET PROJECTS  

    if(req.method=="GET" && req.url==="/projects") {
        try{
            const projects = await getProjects();

            res.statusCode=200;
            res.setHeader("Content-Type","application/json");
            res.end(JSON.stringify(projects));
        }catch (error) {
            console.error("DATABASE ERROR : ",error);

            res.statusCode=500;
            res.setHeader("Content-Type","application/json");
            res.end(JSON.stringify({
                error:"Database error"
            }));
        }
        return;
    }

    //GET PROJECT /: id 
    if (req.method === "GET" && req.url?.startsWith("/projects/")) {

        const id = Number(req.url.split("/")[2]);
        res.setHeader("Content-Type", "application/json");

        try {
            const project = await getProject(id);

            if (!project) {
                res.statusCode = 404;
                res.end(JSON.stringify({
                    error: "Project not found"
                }));

                return;
            }

            res.statusCode = 200;

            res.end(JSON.stringify(project));

        } catch (error) {

            console.error("DATABASE ERROR:", error);

            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");

            res.end(JSON.stringify({
                error: "Database error"
            }));
        }

        return;
    }
    //POST projects -> to create projects

    if (req.method === "POST" && req.url === "/projects/") {

        let body = "";

        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", async () => {

            try {
                const data = JSON.parse(body);

                if (!data.name) {
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");

                    res.end(JSON.stringify({
                        error: "name is required"
                    }));

                    return;
                }

                const project = await createProject(data.name);

                res.statusCode = 201;
                res.setHeader("Content-Type", "application/json");

                res.end(JSON.stringify(project));

            } catch (error) {

                console.error("DATABASE ERROR:", error);

                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");

                res.end(JSON.stringify({
                    error: "Database error"
                }));
            }
        });

        return;
    }    

    //PATCH project 
    if(req.method=="PATCH" && req.url?.startsWith("/projects/") ){
        const id = Number(req.url.split("/")[2]);

        res.setHeader("Content-Type", "application/json");

        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        
        req.on("end", async () => {

            try {
                const data = JSON.parse(body);

                if (!data.name) {
                    res.statusCode = 400;
                    res.setHeader("Content-Type", "application/json");

                    res.end(JSON.stringify({
                        error: "name is required"
                    }));

                    return;
                }

                const project = await updateProject(id, data.name);

                if (!project) {
                    res.statusCode = 404;
                    res.setHeader("Content-Type", "application/json");

                    res.end(JSON.stringify({
                        error: "Project not found"
                    }));

                    return;
                }

                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");

                res.end(JSON.stringify(project));

            } catch (error) {

                console.log("ERROR:", error);

                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");

                res.end(JSON.stringify({
                    error: "Invalid JSON"
                }));
            }
        });
        return;
    }
    res.statusCode = 404;
    res.end("Not Found");
});

server.listen(3000);
console.log("hello world");

import http from "http";
const server=http.createServer((req,res)=>{
     if (req.method === "GET" && req.url === "/") {
        res.end("Welcome to the Distributed Job Service");
        return;
    }

    if (req.method === "GET" && req.url === "/jobs") {
        res.end("Here are your jobs");
        return;
    }

    if (req.method === "POST" && req.url === "/jobs") {
        res.end("Creating a job");
        return;
    }

    res.statusCode = 404;
    res.end("Not Found");
});

server.listen(3000);
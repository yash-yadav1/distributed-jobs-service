?. if it exists then do this 
mkdir src
touch server.ts
curl -X GET http://localhost:3000/jobs
curl -X GET http://localhost:3000/jobs/1   

curl -X PATCH http://localhost:3000/jobs/1 -H "Content-Type: application/json" -d '{"status":"banana"}'

curl -X POST http://localhost:3000/jobs   -H "Content-Type: application/json"   -d '{"command":"npm test","image":"node:24"}'

to define particular type const job:Job={
    x:y,
    z:a,
    b:c
};

docker exec -it distributed-jobs-db psql -U postgres -d jobsdb   // to connect postres with docker 

q-docker  like ctrl + c
\q to exit docker 


docker exec -it distributed-jobs-db psql -U postgres -d jobsdb   for opening postgres



# Create directory
mkdir src

# Create file
touch server.ts


# ─────────────────────────────
# API TESTING
# ─────────────────────────────

# Get all jobs
curl -X GET http://localhost:3000/jobs

# Get a particular job
curl -X GET http://localhost:3000/jobs/1

# Update job status
curl -X PATCH http://localhost:3000/jobs/1 \
-H "Content-Type: application/json" \
-d '{"status":"banana"}'

# Create a job
curl -X POST http://localhost:3000/jobs \
-H "Content-Type: application/json" \
-d '{"command":"npm test","image":"node:24"}'


# ─────────────────────────────
# TYPESCRIPT
# ─────────────────────────────

# Define a variable with a particular type

const job: Job = {
    x: y,
    z: a,
    b: c
};


# ─────────────────────────────
# POSTGRES + DOCKER
# ─────────────────────────────

# Open PostgreSQL inside the Docker container

docker exec -it distributed-jobs-db \
psql -U postgres -d jobsdb

# Exit PostgreSQL
\q

# Stop/exit an interactive process
Ctrl + C


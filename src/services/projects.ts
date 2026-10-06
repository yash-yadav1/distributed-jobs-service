import { pool } from "../db";

export async function createProject(name: string) {
    const result=await pool.query(
        "INSERT INTO projects (name) VALUES ($1) RETURNING * ",[name]
    );

    return result.rows[0];
}


export async function getProjects () {
    const result=await pool.query(
        "SELECT * FROM projects ORDER BY id"
    );

    return result.rows;
}

export async function getProject(id: number) {
    const result=await pool.query (
        "SELECT * FROM projects WHERE id=$1",[id]
    );
    return result.rows[0];
}


export async function updateProject(id:number , name : string) {
    const result=await pool.query(
        "UPDATE projects SET name=$1 WHERE id=$2 RETURNING *",[name,id]
    );
    return result.rows[0];
}
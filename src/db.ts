import {Pool} from "pg";
export const pool=new Pool({
    host: 'localhost',
    port:5432,
    user:"postgres",
    password: "postgres",
    database: "jobsdb"
});

pool.query("SELECT NOW()",(error,result)=>{
    if(error){
        console.log("Database connection failed : ",error);
        return;
    }
    console.log("Database connected!");
    console.log(result.rows);
});

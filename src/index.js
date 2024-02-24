// require('dotenv').config({path: './env'})

import dotenv from "dotenv"
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
    path:"./env"
})
const port = process.env.PORT || 8000;
connectDB()
.then(()=>{
    app.on("error",(err)=>{
        console.log(`ERRR: `,err);
    })
    app.listen(port,()=>{
        console.log(`Server is Running at port ${port}`);
    })
})
.catch((err)=>{
    console.log(`MongoDb connection Failed !!! `,err);
})


/*
;(async ()=>{
    try {await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
    application.on("error",(error)=>{
        console.log("error : app is not connecting to database");
        throw error;
    })

    app.listen(process.env.PORT,()=>{
        console.log(`App is listening on port ${process.env.PORT}`)
    })}
    catch(error){
       console.log("error app connection failed", error );
       throw error ;
    }

})()
*/
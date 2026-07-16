import { app } from "./app.js";
import connectDB from "./db/index.js";
import 'dotenv/config'

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 4000, ()=>{
        console.log(`Server is runing at port: ${process.env.PORT}`)
    })
})
.catch(e => {
    console.log("MongoDB connection failed !", e)
})


// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js"
// ;( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (error) => {
//             console.log("Error connecting to MongoDB:", error);
//             throw error
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`Server is running on port ${process.env.PORT}`);
//         });

//     } catch (error) {
//         console.log("Error connecting to DB:", error);
//         throw error;
//     }
// })
import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
dotenv.config();

//@why : Fix for ECONNREFUSED on querySrv in some network environments (like mongodb srv+URI)
//@what : It tells the DNS to use these servers instead of the default ones
dns.setServers(['8.8.8.8', '8.8.4.4']);

//@desc : Connect to MongoDB database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully !");
    } catch (error) {
        console.log("DB connection Faild !", error);
        process.exit(1);
    }
};

export default connectDB;
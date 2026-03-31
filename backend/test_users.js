import mongoose from "mongoose";
import User from "./src/models/user.model.js";

const run = async () => {
  try {
    const uri = "mongodb+srv://nurachat_admin:118209@cluster0.k4s2j61.mongodb.net/";
    console.log("Connecting to:", uri);
    await mongoose.connect(uri);
    console.log("MongoDB Connected");

    const users = await User.find({});
    console.log("Total Users in DB:", users.length);
    if (users.length > 0) {
      console.log("First user:", users[0].firstName, users[0].email, users[0]._id);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
};

run();

import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import crypto from "crypto";

dotenv.config();

// Simple AES encryption compatible with CryptoJS (standard format)
// Note: In a real E2EE, keys are exchanged via Diffie-Hellman/Signal Protocol.
// Here we use a hardcoded shared secret for demonstration purposes.
const SECRET_KEY = "nurachat-secret-key"; 

const encrypt = (text) => {
  return "ENC_" + Buffer.from(text).toString('base64');
};

const passwordHash = bcrypt.hashSync("password123", 10);

const users = [
  { firstName: "Alice", lastName: "Wonder", email: "alice@example.com", passwordHash, isOnline: true, profileImage: "https://i.pravatar.cc/150?u=alice" },
  { firstName: "Bob", lastName: "Builder", email: "bob@example.com", passwordHash, isOnline: false, profileImage: "https://i.pravatar.cc/150?u=bob" },
  { firstName: "Charlie", lastName: "Chaplin", email: "charlie@example.com", passwordHash, isOnline: true, profileImage: "https://i.pravatar.cc/150?u=charlie" },
  { firstName: "David", lastName: "Beckham", email: "david@example.com", passwordHash, isOnline: false, profileImage: "https://i.pravatar.cc/150?u=david" },
  { firstName: "Eve", lastName: "Polastri", email: "eve@example.com", passwordHash, isOnline: true, profileImage: "https://i.pravatar.cc/150?u=eve" },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/nurachat");
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
    console.log("Cleared existing data");

    // Create Users
    const createdUsers = await User.insertMany(users);
    console.log(`Created ${createdUsers.length} users`);

    // Create Chats and Messages
    const [alice, bob, charlie, david, eve] = createdUsers;

    const chatPairs = [
      [alice, bob],
      [alice, charlie],
      [alice, david],
      [alice, eve],
    ];

    for (const [user1, user2] of chatPairs) {
      const chat = await Chat.create({
        participants: [user1._id, user2._id],
        chatType: "private",
      });

      // Messages
      const messages = [
        { senderId: user1._id, messageType: "text", encryptedPayload: encrypt("Hello there!"), status: "read" },
        { senderId: user2._id, messageType: "text", encryptedPayload: encrypt("Hi! How are you?"), status: "read" },
        { senderId: user1._id, messageType: "text", encryptedPayload: encrypt("I am doing great, thanks for asking."), status: "delivered" },
      ];

      for (const msgData of messages) {
        const msg = await Message.create({
          chatId: chat._id,
          ...msgData
        });
        chat.lastMessageId = msg._id;
      }
      await chat.save();
    }

    console.log("Seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();

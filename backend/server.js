import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./src/config/db.js";
import app from "./src/app.js";

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Create HTTP server from Express app
const server = http.createServer(app);

import { initSocket } from "./src/sockets/socket.js";

// Initialize Socket.IO
initSocket(server);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

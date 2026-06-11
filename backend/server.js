import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const originalPort = process.env.PORT;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
if (originalPort) {
  process.env.PORT = originalPort;
}

// Catch unhandled startup errors — prevents silent SIGTERM crash
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

import http from "http";
import connectDB from "./src/config/db.js";
import app from "./src/app.js";
import { initSocket } from "./src/sockets/socket.js";

await connectDB();

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown — lets Render properly terminate the container
const shutdown = () => {
  console.log("Received shutdown signal. Closing server...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
  // Force exit if server doesn't close in 10s
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);


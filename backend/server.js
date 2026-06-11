import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

import http from "http";
import connectDB from "./src/config/db.js";
import app from "./src/app.js";

connectDB();

const server = http.createServer(app);

import { initSocket } from "./src/sockets/socket.js";
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, "[IP_ADDRESS]", () => {
  console.log(`Server running on port ${PORT}`);
});

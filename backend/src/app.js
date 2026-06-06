import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import passport from "./config/passport.js";

import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import messageRoutes from "./routes/message.routes.js";
import groupRoutes from "./routes/group.routes.js";
import groupMemberRoutes from "./routes/groupMember.routes.js";
import groupMessageRoutes from "./routes/groupMessage.routes.js";
import authRoutes from "./routes/auth.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import livekitRoutes from "./routes/livekit.routes.js";
import translationRoutes from "./routes/translation.routes.js";

const app = express();

// Trust the first proxy (e.g. ngrok, Render, Heroku) to allow express-rate-limit to get correct IP
app.set("trust proxy", 1);


const isDevelopment = process.env.NODE_ENV !== 'production';

const allowedOrigins = [
  'https://crest-convinced-guest-spam.trycloudflare.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:8080',
];

if (process.env.FRONTEND_URL) {
  // Normalize and add the frontend URL
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

const corsOptions = {
  origin: function (origin, callback) {
    try {
      if (!origin) {
        return callback(null, true);
      }

      const isNgrok = origin.includes('ngrok-free.app') || origin.includes('ngrok.io');
      if (isDevelopment) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } catch (error) {
      callback(error);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Security Middlewares
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
// Prevent NoSQL Injection attacks securely bypassing Express 5 getter-only req.query issue
app.use((req, res, next) => {
  ['body', 'params', 'headers', 'query'].forEach((key) => {
    if (req[key]) {
      mongoSanitize.sanitize(req[key]);
    }
  });
  next();
});

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", apiLimiter);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(passport.initialize());

//@desc : ROUTES
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/oauth", oauthRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/group-members", groupMemberRoutes);
app.use("/api/group-messages", groupMessageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/api/translation", translationRoutes);

// Health check
app.get("/health", (req, res) => {
  res.send("API WORKING");
});

//@desc : 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

//@desc : Global error handler (Express 5 compatible)
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(isDevelopment && { stack: err.stack }),
  });
});

export default app;

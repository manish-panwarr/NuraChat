import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 50,                   // 50 requests per IP per 15 minutes
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  // Ensure rate-limit 429 responses still carry CORS headers
  handler: (req, res, next, options) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.status(options.statusCode).json(options.message);
  },
});

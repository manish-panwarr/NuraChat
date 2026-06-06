import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many requests from this IP, please try again after a minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

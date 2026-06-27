import rateLimit from "express-rate-limit";

const TOO_MANY = { error: "Too many requests. Please wait a moment and try again." };

// General limiter: 100 requests per 15 minutes per IP — applied to all routes.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: TOO_MANY,
  standardHeaders: true,
  legacyHeaders: false,
});

// AI limiter: 10 requests per 15 minutes per IP — applied to Groq-backed endpoints.
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: TOO_MANY,
  standardHeaders: true,
  legacyHeaders: false,
});

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { generalLimiter } from "./middlewares/rateLimiter";

// ── Allowed CORS origins ────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:3000",
  "https://web-builder-tool--sohancherukuri.replit.app",
  // TODO: add your custom / Vercel domain after deployment:
  // "https://your-app.vercel.app",
]);

// Dynamically add any domains Replit exposes via REPLIT_DOMAINS (comma-separated).
for (const d of (process.env.REPLIT_DOMAINS ?? "").split(",").map(s => s.trim()).filter(Boolean)) {
  ALLOWED_ORIGINS.add(`https://${d}`);
}

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin or non-browser (curl, server-to-server) requests
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Allow all Replit dev-preview subdomains (*.replit.dev, *.janeway.replit.dev, etc.)
  if (/\.replit\.dev$/.test(origin)) return true;
  return false;
}

// ── App ─────────────────────────────────────────────────────────────────────
const app: Express = express();

// Security headers via Helmet (sets X-Content-Type-Options, X-Frame-Options,
// X-XSS-Protection, Referrer-Policy, HSTS, CSP, and more).
app.use(helmet());

app.use(
  cors({
    origin: (origin, cb) =>
      isAllowedOrigin(origin)
        ? cb(null, true)
        : cb(new Error(`CORS: origin ${origin} not allowed`)),
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Limit body size to prevent payload-based DoS attacks.
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// General rate limiter: 100 req / 15 min per IP across all routes.
app.use(generalLimiter);

app.use("/api", router);

// ── Global error handler ────────────────────────────────────────────────────
// Never expose raw error messages or stack traces to the client.
// Express 5 passes async route errors here automatically.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  req.log?.error({ err: { message: err.message, stack: err.stack } }, "Unhandled error");
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

export default app;

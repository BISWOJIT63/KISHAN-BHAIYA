import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { optionalAuth } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { publicUploadDir } from "./middleware/upload.js";
import api from "./routes/api.js";

export const createApp = ({ initialize } = {}) => {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  const allowedOrigins = env.clientUrl.split(",").map((x) => x.trim());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return cb(null, true);
        // Allow configured origins and Vercel preview deployments
        if (
          allowedOrigins.includes(origin) ||
          origin.endsWith(".vercel.app")
        ) {
          return cb(null, origin);
        }
        cb(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(
    "/uploads",
    express.static(
      publicUploadDir,
      { maxAge: env.nodeEnv === "production" ? "1d" : 0 },
    ),
  );
  if (env.nodeEnv !== "test") app.use(morgan("dev"));
  app.use(
    "/api/v1/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 80,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  if (initialize) {
    app.use((req, res, next) => {
      Promise.resolve(initialize()).then(() => next(), next);
    });
  }
  app.use("/api/v1", optionalAuth, api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
};

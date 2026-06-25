import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind Railway's TLS-terminating proxy we must trust the proxy so that
// `req.secure`/`req.protocol` are correct and `Secure` cookies are honored.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In a single-service deployment (e.g. Railway) the API server also serves the
// built Vite frontend. This is enabled by pointing SERVE_STATIC_DIR at the
// frontend's `dist/public`. On Replit the frontend is served separately, so
// this stays unset and the block is skipped.
const staticDir = process.env.SERVE_STATIC_DIR;
if (staticDir) {
  const indexHtml = path.join(staticDir, "index.html");
  app.use(express.static(staticDir, { index: false }));
  // SPA fallback: any non-API GET route returns index.html so client-side
  // routing (wouter) can take over.
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexHtml);
  });
  logger.info({ staticDir }, "Serving static frontend");
}

export default app;

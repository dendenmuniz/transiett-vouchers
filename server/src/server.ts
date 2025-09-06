import dotenv from "dotenv/config";
import express from "express";
import cors from "cors";

import helmet from "helmet";
import compression from "compression";
import zlib from "zlib";
import { router } from "./routes";

import { createError, errorHandler } from "./middlewares/ErrorHandler";

const app = express();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
} else {
  // log só o usuário para checar que não é "johndoe"
  try {
    const u = new URL(process.env.DATABASE_URL);
    console.log(
      `[db] user=${u.username} host=${u.hostname} db=${u.pathname.slice(1)}`
    );
  } catch {}
}

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(
  compression(
    compression({
      threshold: 0,
      level: zlib.constants.Z_BEST_SPEED,
    })
  )
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api", router);

app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.url);
  next(createError("Route not found", 404));
});

app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

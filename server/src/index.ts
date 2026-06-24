import "dotenv/config";
import cors from "cors";
import express from "express";
import { signToken } from "./auth";
import { adminRouter } from "./routes/admin";
import { businessesRouter } from "./routes/businesses";
import { contentRouter } from "./routes/content";
import { categoriesRouter, citiesRouter, eventsRouter, homeRouter, offersRouter, reviewsRouter } from "./routes/misc";
import { ownerAuthRouter, ownerRouter } from "./routes/owner";
import { projectsRouter } from "./routes/projects";
import { uploadsRouter, UPLOADS_DIR } from "./routes/uploads";
import { userAuthRouter, userRouter } from "./routes/users";

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Serve uploaded images (GET); the POST upload route is mounted below.
app.use("/api/uploads", express.static(UPLOADS_DIR));

// Admin login (credentials from .env) — used by the admin panel (later phase).
app.post("/api/auth/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email !== (process.env.ADMIN_EMAIL || "admin@aley.com") || password !== (process.env.ADMIN_PASSWORD || "aley")) {
    return res.status(401).json({ error: "Wrong email or password." });
  }
  res.json({ token: signToken({ email, role: "admin" }), name: process.env.ADMIN_NAME || "Admin" });
});

app.use("/api/cities", citiesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/businesses", businessesRouter);
app.use("/api/events", eventsRouter);
app.use("/api/offers", offersRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/home", homeRouter);
app.use("/api/content", contentRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/auth/owner", ownerAuthRouter);
app.use("/api/owner", ownerRouter);
app.use("/api/auth/user", userAuthRouter);
app.use("/api/me", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/uploads", uploadsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true, platform: "aley" }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = Number(process.env.PORT) || 4100;
app.listen(port, () => console.log(`Aley Platform API running on http://localhost:${port}`));

process.on("unhandledRejection", (e) => console.error("Unhandled rejection:", e));
process.on("uncaughtException", (e) => console.error("Uncaught exception:", e));

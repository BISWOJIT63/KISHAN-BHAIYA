import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getApp } from "./bootstrap.js";
import { env } from "./config/env.js";
import { startDevelopmentJobs } from "./jobs/scheduler.js";

const app = await getApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.clientUrl.split(",").map((x) => x.trim()),
    credentials: true,
  },
});
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next();
  try {
    socket.user = jwt.verify(token, env.accessSecret);
    next();
  } catch {
    next(new Error("Invalid socket session"));
  }
});
io.on("connection", (socket) => {
  if (socket.user?.sub) socket.join(`user:${socket.user.sub}`);
});
app.set("io", io);
if (env.nodeEnv !== "test") startDevelopmentJobs();
server.listen(env.port, () =>
  console.log(`[Kishan Bhaiya] API ready on http://localhost:${env.port}`),
);

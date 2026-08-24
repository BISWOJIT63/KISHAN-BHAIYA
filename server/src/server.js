import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { store } from './services/dataStore.js';
import { startDevelopmentJobs } from './jobs/scheduler.js';

const connection=await connectDatabase();
await store.initialize(connection.mode);
if (
  connection.connected &&
  env.nodeEnv !== 'production' &&
  env.autoSeedDemo &&
  /^kishan-bhaiya-demo(?:-|$)/i.test(mongoose.connection.name)
) {
  const seeded = await store.ensureDemoData();
  if (seeded.inserted) {
    console.log(
      `[Kishan Bhaiya] Added ${seeded.inserted} missing records to the dedicated demo database.`,
    );
  }
}
const app=createApp(); const server=http.createServer(app);
const io=new Server(server,{cors:{origin:env.clientUrl.split(',').map(x=>x.trim()),credentials:true}});
io.use((socket,next)=>{ const token=socket.handshake.auth?.token; if(!token) return next(); try{socket.user=jwt.verify(token,env.accessSecret);next();}catch{next(new Error('Invalid socket session'));} });
io.on('connection',(socket)=>{ if(socket.user?.sub) socket.join(`user:${socket.user.sub}`); });
app.set('io',io);
if(env.nodeEnv!=='test') startDevelopmentJobs();
server.listen(env.port,()=>console.log(`[Kishan Bhaiya] API ready on http://localhost:${env.port} · ${connection.mode} mode`));

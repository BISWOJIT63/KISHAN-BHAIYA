import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { startDevelopmentJobs } from './jobs/scheduler.js';
import { initializeRuntime } from './runtime.js';

const connection=await initializeRuntime();
const app=createApp(); const server=http.createServer(app);
const io=new Server(server,{cors:{origin:env.clientUrl.split(',').map(x=>x.trim()),credentials:true}});
io.use((socket,next)=>{ const token=socket.handshake.auth?.token; if(!token) return next(); try{socket.user=jwt.verify(token,env.accessSecret);next();}catch{next(new Error('Invalid socket session'));} });
io.on('connection',(socket)=>{ if(socket.user?.sub) socket.join(`user:${socket.user.sub}`); });
app.set('io',io);
server.once('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`[KisanExpress] Port ${env.port} is already in use. Stop the other API instance, then restart this server (rs in nodemon).`);
  else console.error('[KisanExpress] Server failed to start:', error.message);
  process.exit(1);
});
server.listen(env.port,()=>{ if(env.nodeEnv!=='test') startDevelopmentJobs(); console.log(`[KisanExpress] API ready on http://localhost:${env.port} · ${connection.mode} mode`); });

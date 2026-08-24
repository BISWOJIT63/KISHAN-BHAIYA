import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { HttpError } from '../utils/http.js';

const currentDir=path.dirname(fileURLToPath(import.meta.url));
const temporaryStorage=Boolean(process.env.VERCEL)||process.env.NODE_ENV==='test';
export const publicUploadDir=temporaryStorage?path.join(tmpdir(),'kishan-bhaiya','uploads'):path.resolve(currentDir,'../../uploads');
const verificationDir=temporaryStorage?path.join(tmpdir(),'kishan-bhaiya','private-verification'):path.resolve(currentDir,'../../private-uploads/verification');
mkdirSync(publicUploadDir,{recursive:true});
mkdirSync(verificationDir,{recursive:true});
const storage=multer.diskStorage({destination:(_req,_file,cb)=>cb(null,publicUploadDir),filename:(_req,file,cb)=>cb(null,`${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g,'-')}`)});
export const upload=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(_req,file,cb)=>['image/jpeg','image/png','image/webp'].includes(file.mimetype)?cb(null,true):cb(new HttpError(400,'Only JPG, PNG and WebP images are accepted'))});

const verificationStorage=multer.diskStorage({destination:(_req,_file,cb)=>cb(null,verificationDir),filename:(_req,file,cb)=>cb(null,`${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g,'-')}`)});
export const verificationUpload=multer({storage:verificationStorage,limits:{fileSize:10*1024*1024},fileFilter:(_req,file,cb)=>['application/pdf','image/jpeg','image/png','image/webp'].includes(file.mimetype)?cb(null,true):cb(new HttpError(400,'Only PDF, JPG, PNG and WebP verification files are accepted'))});

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'node:fs';
import { HttpError } from '../utils/http.js';

const currentDir=path.dirname(fileURLToPath(import.meta.url));
const uploadDir=path.resolve(currentDir,'../../uploads');
const verificationDir=path.resolve(currentDir,'../../private-uploads/verification');
mkdirSync(verificationDir,{recursive:true});
const storage=multer.diskStorage({destination:(_req,_file,cb)=>cb(null,uploadDir),filename:(_req,file,cb)=>cb(null,`${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g,'-')}`)});
export const upload=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(_req,file,cb)=>['image/jpeg','image/png','image/webp'].includes(file.mimetype)?cb(null,true):cb(new HttpError(400,'Only JPG, PNG and WebP images are accepted'))});

const verificationStorage=multer.diskStorage({destination:(_req,_file,cb)=>cb(null,verificationDir),filename:(_req,file,cb)=>cb(null,`${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g,'-')}`)});
export const verificationUpload=multer({storage:verificationStorage,limits:{fileSize:10*1024*1024},fileFilter:(_req,file,cb)=>['application/pdf','image/jpeg','image/png','image/webp'].includes(file.mimetype)?cb(null,true):cb(new HttpError(400,'Only PDF, JPG, PNG and WebP verification files are accepted'))});

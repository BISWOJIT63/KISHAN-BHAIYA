import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { HttpError } from '../utils/http.js';

const currentDir=path.dirname(fileURLToPath(import.meta.url));
const temporaryStorage=Boolean(process.env.VERCEL)||process.env.NODE_ENV==='test';
/** Kept only so `express.static` can still serve images uploaded before the switch to database-backed storage. */
export const publicUploadDir=temporaryStorage?path.join(tmpdir(),'kishan-bhaiya','uploads'):path.resolve(currentDir,'../../uploads');
const verificationDir=temporaryStorage?path.join(tmpdir(),'kishan-bhaiya','private-verification'):path.resolve(currentDir,'../../private-uploads/verification');
mkdirSync(publicUploadDir,{recursive:true});
mkdirSync(verificationDir,{recursive:true});

export const imageMimeTypes=['image/jpeg','image/png','image/webp'];
export const maxImageBytes=4*1024*1024;
const audioMimeTypes=['audio/webm','audio/wav','audio/x-wav','audio/mpeg','audio/mp4','audio/ogg','audio/aac'];

/**
 * Profile and product images use memoryStorage on purpose: this app runs on
 * serverless functions where the filesystem is a per-invocation `/tmp` that
 * disappears, so anything written to disk 404s within minutes while the saved
 * URL keeps pointing at it. The route persists the bytes to the database
 * instead — see `POST /uploads` and `GET /files/:id`.
 */
export const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:maxImageBytes},fileFilter:(_req,file,cb)=>imageMimeTypes.includes(file.mimetype)?cb(null,true):cb(new HttpError(400,'Only JPG, PNG and WebP images are accepted'))});
export const audioUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024},fileFilter:(_req,file,cb)=>audioMimeTypes.includes(file.mimetype)?cb(null,true):cb(new HttpError(400,'Use a supported audio recording format'))});

const verificationStorage=multer.diskStorage({destination:(_req,_file,cb)=>cb(null,verificationDir),filename:(_req,file,cb)=>cb(null,`${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g,'-')}`)});
export const verificationUpload=multer({storage:verificationStorage,limits:{fileSize:10*1024*1024},fileFilter:(_req,file,cb)=>['application/pdf','image/jpeg','image/png','image/webp'].includes(file.mimetype)?cb(null,true):cb(new HttpError(400,'Only PDF, JPG, PNG and WebP verification files are accepted'))});

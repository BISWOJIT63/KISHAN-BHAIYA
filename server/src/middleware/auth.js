import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export const signAccess = (user) => jwt.sign({ sub:user._id, role:user.role, name:user.name, accountStatus:user.accountStatus || (user.verified?'ACTIVE':'PENDING_ADMIN_APPROVAL') }, env.accessSecret, { expiresIn:env.accessTtl });
export const signRefresh = (user) => jwt.sign({ sub:user._id, type:'refresh' }, env.refreshSecret, { expiresIn:env.refreshTtl });
export const optionalAuth = (req,_res,next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i,'');
  if (token) try { req.user=jwt.verify(token,env.accessSecret); } catch { req.user=null; }
  next();
};
export const requireAuth = (req,_res,next) => {
  if (!req.user) return next(new HttpError(401,'Authentication required'));
  next();
};
export const allowRoles = (...roles) => (req,_res,next) => req.user && roles.includes(req.user.role) ? next() : next(new HttpError(403,'You do not have permission for this action'));

import axios from 'axios';
import { useAppStore } from '../store/useAppStore.js';

export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'/api/v1',withCredentials:true,timeout:12000});
api.interceptors.request.use((config)=>{ const token=useAppStore.getState().accessToken; if(token) config.headers.Authorization=`Bearer ${token}`; return config; });
api.interceptors.response.use((r)=>r,(error)=>{
  if(error.response?.status===401 && !String(error.config?.url).includes('/auth/')) useAppStore.getState().clearSession();
  return Promise.reject(error);
});
export const getData=(promise)=>promise.then(r=>r.data.data);
export const apiError=(error)=>error.response?.data?.error?.message||error.message||'Something went wrong';

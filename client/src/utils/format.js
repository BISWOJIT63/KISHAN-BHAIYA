import { format,formatDistanceToNow } from 'date-fns';
export const money=(value,maximumFractionDigits=0)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits}).format(value||0);
export const number=(value)=>new Intl.NumberFormat('en-IN').format(value||0);
export const shortDate=(value)=>value?format(new Date(value),'dd MMM yyyy'):'—';
export const relative=(value)=>value?formatDistanceToNow(new Date(value),{addSuffix:true}):'—';
export const cx=(...parts)=>parts.filter(Boolean).join(' ');

import cron from 'node-cron';
import { store } from '../services/dataStore.js';

export const refreshLotFreshness = async () => {
  const now=Date.now(); const lots=await store.list('lots');
  for(const lot of lots){ const days=(new Date(lot.expiryDate).getTime()-now)/86400000; const state=days<=0?'EXPIRED':days<=2?'URGENT':days<=4?'SELL_SOON':'FRESH'; if(state!==lot.freshnessState) await store.update('lots',lot._id,{freshnessState:state}); }
};

export const startDevelopmentJobs = () => cron.schedule('*/30 * * * *', refreshLotFreshness);

import Dexie from 'dexie';
export const offlineDb=new Dexie('kishan-bhaiya-offline');
offlineDb.version(1).stores({listingDrafts:'++id,updatedAt,syncStatus'});
export const saveListingDraft=(draft)=>offlineDb.listingDrafts.put({...draft,id:draft.id||undefined,updatedAt:new Date().toISOString(),syncStatus:'pending'});

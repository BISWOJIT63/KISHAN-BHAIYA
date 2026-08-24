import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {io} from 'socket.io-client';
import {toast} from 'sonner';
import {useAppStore} from '../store/useAppStore.js';

export default function RealtimeBridge(){
  const token=useAppStore(s=>s.accessToken),queryClient=useQueryClient();
  useEffect(()=>{
    const socketUrl=import.meta.env.VITE_SOCKET_URL;
    // Vercel Functions cannot be a Socket.IO/WebSocket server. In a deployed
    // frontend, realtime is enabled only when a dedicated socket host is set.
    if(import.meta.env.PROD&&!socketUrl)return undefined;
    const socket=io(socketUrl||window.location.origin,{auth:{token},autoConnect:true});
    const refresh=(message)=>()=>{queryClient.invalidateQueries({queryKey:['bootstrap']});queryClient.invalidateQueries({queryKey:['notifications']});if(message)toast.info(message);};
    socket.on('quotation:new',refresh('A new quotation was received'));
    socket.on('quotation:updated',refresh());socket.on('negotiation:countered',refresh('A counter offer was received'));
    socket.on('negotiation:accepted',refresh('Negotiation accepted'));socket.on('order:statusChanged',refresh());
    socket.on('shipment:statusChanged',refresh());socket.on('notification:new',refresh());
    return()=>socket.disconnect();
  },[token,queryClient]);
  return null;
}

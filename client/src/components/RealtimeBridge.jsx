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
    const refreshNegotiation=(message)=>()=>{
      refresh(message)();
      queryClient.invalidateQueries({queryKey:['requirements']});
      queryClient.invalidateQueries({queryKey:['requirement']});
      queryClient.invalidateQueries({queryKey:['quotes']});
      queryClient.invalidateQueries({queryKey:['quotation']});
    };
    const refreshShipment=()=>{
      queryClient.invalidateQueries({queryKey:['bootstrap']});
      queryClient.invalidateQueries({queryKey:['shipments']});
      queryClient.invalidateQueries({queryKey:['shipment']});
      queryClient.invalidateQueries({queryKey:['logistics-control']});
      queryClient.invalidateQueries({queryKey:['load-opportunities']});
      queryClient.invalidateQueries({queryKey:['orders']});
      queryClient.invalidateQueries({queryKey:['order']});
      queryClient.invalidateQueries({queryKey:['seller-orders']});
    };
    socket.on('quotation:new',refreshNegotiation('A new quotation was received'));
    socket.on('quotation:updated',refreshNegotiation());socket.on('negotiation:countered',refreshNegotiation('A counter offer was received'));
    socket.on('negotiation:accepted',refreshNegotiation('Negotiation accepted'));socket.on('order:statusChanged',refreshShipment);
    socket.on('shipment:statusChanged',refreshShipment);socket.on('shipment:locationUpdated',refreshShipment);socket.on('notification:new',refresh());
    return()=>socket.disconnect();
  },[token,queryClient]);
  return null;
}

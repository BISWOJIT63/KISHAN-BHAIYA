import { CircleMarker,MapContainer,Polyline,Popup,TileLayer } from 'react-leaflet';

export default function RouteMap({stops=[],className='h-[420px]'}){
  const points=stops.filter(s=>Array.isArray(s.coordinates)).map(s=>[s.coordinates[1],s.coordinates[0]]);
  const center=points[0]||[20.2961,85.8245];
  return <div className={`overflow-hidden rounded-[20px] border border-gray-200 ${className}`}><MapContainer center={center} zoom={9} scrollWheelZoom={false}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{points.length>1&&<Polyline positions={points} pathOptions={{color:'#256d4a',weight:4,dashArray:'9 8'}}/>}{stops.map((stop,i)=>stop.coordinates&&<CircleMarker key={`${stop.label}-${i}`} center={[stop.coordinates[1],stop.coordinates[0]]} radius={10} pathOptions={{color:'#fff',weight:3,fillColor:stop.type==='DELIVERY'?'#e7a52e':stop.type==='HUB'?'#2563eb':'#256d4a',fillOpacity:1}}><Popup><strong>{i+1}. {stop.label}</strong><br/>{stop.type?.replaceAll('_',' ')}</Popup></CircleMarker>)}</MapContainer></div>;
}

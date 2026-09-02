import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';

export default function RouteMap({ stops = [], liveLocation = null, className = 'h-[420px]' }) {
  const points = stops.filter((stop) => Array.isArray(stop.coordinates)).map((stop) => [stop.coordinates[1], stop.coordinates[0]]);
  const livePoint = Array.isArray(liveLocation?.coordinates) ? [liveLocation.coordinates[1], liveLocation.coordinates[0]] : null;
  const path = livePoint ? [livePoint, ...points] : points;
  const center = livePoint || points[0] || [20.2961, 85.8245];
  return <div className={`overflow-hidden rounded-[20px] border border-gray-200 ${className}`}>
    <MapContainer center={center} zoom={9} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      {path.length > 1 && <Polyline positions={path} pathOptions={{ color: '#256d4a', weight: 4, dashArray: '9 8' }}/>}
      {livePoint && <CircleMarker center={livePoint} radius={11} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
        <Popup><strong>Live vehicle location</strong><br/>Updated {liveLocation.updatedAt ? new Date(liveLocation.updatedAt).toLocaleTimeString() : ''}</Popup>
      </CircleMarker>}
      {stops.map((stop, index) => stop.coordinates && <CircleMarker key={`${stop.label}-${index}`} center={[stop.coordinates[1], stop.coordinates[0]]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: stop.type === 'DELIVERY' ? '#e7a52e' : stop.type === 'HUB' ? '#2563eb' : '#256d4a', fillOpacity: 1 }}>
        <Popup><strong>{index + 1}. {stop.label}</strong><br/>{stop.type?.replaceAll('_', ' ')}</Popup>
      </CircleMarker>)}
    </MapContainer>
  </div>;
}

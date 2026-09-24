import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { api, getData } from '../api/client.js';
const validPoint = p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
function Viewport({ boundsKey }) {
  const map = useMap();
  useEffect(() => {
    const points = JSON.parse(boundsKey);
    if (points.length) map.fitBounds(points, { padding: [35, 35], maxZoom: 15 });
  }, [map, boundsKey]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
export default function RouteMap({ stops = [], liveLocation = null, className = 'h-[420px]' }) {
  const validStops = stops.filter(stop => validPoint(stop.coordinates));
  const livePoint = validPoint(liveLocation?.coordinates) ? liveLocation.coordinates : null;
  const routePoints = livePoint ? [livePoint, ...validStops.filter(stop => stop.status !== 'COMPLETED').map(stop => stop.coordinates)] : validStops.map(stop => stop.coordinates);
  const pointKey = JSON.stringify(routePoints);
  const points = useMemo(() => JSON.parse(pointKey), [pointKey]);
  const { data, isFetching, isError, refetch } = useQuery({ queryKey: ['road-route', points], queryFn: () => getData(api.post('/routing/road', { points })), enabled: points.length >= 2 && points.length <= 25, staleTime: 300000, retry: 1 });
  const road = data?.geometry?.coordinates?.map(([lon, lat]) => [lat, lon]) || [];
  const bounds = road.length ? road : [...validStops.map(stop => [stop.coordinates[1], stop.coordinates[0]]), ...(livePoint ? [[livePoint[1], livePoint[0]]] : [])];
  return <div className={`relative isolate overflow-hidden rounded-[20px] border border-gray-200 ${className}`}>
    <MapContainer center={bounds[0] || [20.2961, 85.8245]} zoom={9} scrollWheelZoom={false}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Viewport boundsKey={JSON.stringify(bounds)} />
      {road.length > 1 && <Polyline positions={road} pathOptions={{ color: '#256d4a', weight: 5 }} />}
      {livePoint && <CircleMarker center={[livePoint[1], livePoint[0]]} radius={11} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}><Popup>Vehicle GPS location{liveLocation.updatedAt && <><br />Updated {new Date(liveLocation.updatedAt).toLocaleTimeString()}</>}</Popup></CircleMarker>}
      {validStops.map((stop, index) => <CircleMarker key={`${stop.label}-${index}`} center={[stop.coordinates[1], stop.coordinates[0]]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: stop.type === 'DELIVERY' ? '#e7a52e' : '#256d4a', fillOpacity: 1 }}><Popup><strong>{index + 1}. {stop.label}</strong><br />{stop.type?.replaceAll('_', ' ')}</Popup></CircleMarker>)}
    </MapContainer>
    <div role="status" className="absolute bottom-7 left-3 right-3 z-[400] rounded-lg bg-white/95 px-3 py-2 text-xs shadow-sm">
      {isFetching ? 'Finding the road route…' : data ? `${data.distance} km · ${data.duration} min driving estimate · OSRM / OpenStreetMap` : points.length < 2 ? 'At least two located stops are needed for a route.' : 'Road route unavailable. Showing stop locations only.'}
      {isError && <button className="ml-2 underline" onClick={() => refetch()}>Retry</button>}
      {validStops.length !== stops.length && <span className="block text-amber-800">Some stops are missing valid coordinates.</span>}
    </div>
  </div>;
}

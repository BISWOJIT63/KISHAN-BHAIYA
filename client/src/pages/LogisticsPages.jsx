import {
  AlertTriangle, ArrowRight, Box, CheckCircle2, ChevronLeft, CloudRain,
  FileCheck2, Fuel, Gauge, MapPin, Navigation, PackageCheck, Play, Route,
  PackagePlus, ShieldCheck, Snowflake, TriangleAlert, Truck, XCircle,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api, apiError, getData } from '../api/client.js';
import RouteMap from '../components/RouteMap.jsx';
import {
  EmptyState, ErrorState, InlineLoader, LoadingState, MetricCard, Modal,
  PageHeader, Progress, StatusBadge,
} from '../components/UI.jsx';
import { number } from '../utils/format.js';
import { PageMotion, Stagger, StaggerItem } from '../components/Motion.jsx';
import { useAppStore } from '../store/useAppStore.js';

const refreshLogistics = (queryClient, id) => {
  queryClient.invalidateQueries({ queryKey: ['shipments'] });
  queryClient.invalidateQueries({ queryKey: ['logistics-control'] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ['shipment', id] });
    queryClient.invalidateQueries({ queryKey: ['load-opportunities', id] });
  }
};

const routeSummary = (shipment) => shipment.nextStop
  ? `${shipment.nextStop.type} · ${shipment.nextStop.label}`
  : shipment.status === 'DELIVERED' ? 'Route completed' : 'Route is being prepared';

export function LogisticsDashboardPage() {
  const { data: shipments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => getData(api.get('/shipments')),
    refetchInterval: 20_000,
  });
  return <PageMotion className="container-page py-10" kind="operations">
    <PageHeader
      eyebrow="Fleet operations control"
      title="Shipment dispatch"
      description="Dispatch compatible vehicles, monitor route progress, record hand-offs, and resolve route exceptions."
      actions={<Link to="/logistics/planner" className="btn-primary"><Route className="h-4 w-4"/>Open dispatch planner</Link>}
    />
    <Stagger className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" kind="operations">
      <StaggerItem kind="operations"><MetricCard label="Ready for pickup" value={shipments.filter((s) => s.status === 'READY_FOR_PICKUP').length} icon={PackageCheck}/></StaggerItem>
      <StaggerItem kind="operations"><MetricCard label="In transit" value={shipments.filter((s) => ['IN_TRANSIT', 'PICKED_UP'].includes(s.status)).length} icon={Truck} tone="blue"/></StaggerItem>
      <StaggerItem kind="operations"><MetricCard label="Completed" value={shipments.filter((s) => s.status === 'DELIVERED').length} icon={CheckCircle2}/></StaggerItem>
      <StaggerItem kind="operations"><MetricCard label="Needs attention" value={shipments.filter((s) => s.status === 'DELAYED' || s.dispatchRequired).length} icon={AlertTriangle} tone="amber"/></StaggerItem>
    </Stagger>
    {isLoading ? <LoadingState/> : error ? <ErrorState message={apiError(error)} onRetry={refetch}/> : shipments.length ? <Stagger className="grid gap-4" kind="operations">
      {shipments.map((shipment) => <StaggerItem key={shipment._id} kind="operations"><article className={`card p-5 sm:p-6 ${['IN_TRANSIT', 'PICKED_UP'].includes(shipment.status) ? 'route-active' : ''}`}>
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold">{shipment._id.toUpperCase()}</h2>
              <StatusBadge status={shipment.status}/>
              {shipment.autoOptimized && <span className="badge bg-violet-50 text-violet-700"><Navigation className="h-3.5 w-3.5"/>Auto route v2</span>}
            </div>
            <p className="mt-3 text-sm font-semibold text-forest-800">Next: {routeSummary(shipment)}</p>
            <p className="mt-1 text-xs text-gray-500">{shipment.stops?.length || 0} stops · {number(shipment.load)}kg · {shipment.distance}km estimate · {shipment.fleetPartner || 'Fleet assignment pending'}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs sm:min-w-72">
            <div className="rounded-xl bg-cream p-3"><p className="text-gray-500">Capacity</p><p className="mt-1 font-bold">{shipment.utilization ?? 0}%</p></div>
            <div className="rounded-xl bg-cream p-3"><p className="text-gray-500">Saved</p><p className="mt-1 font-bold">{shipment.routeOptimization?.savingsKm || 0}km</p></div>
            <div className="rounded-xl bg-cream p-3"><p className="text-gray-500">Issues</p><p className="mt-1 font-bold">{shipment.issues?.filter((issue) => issue.status === 'OPEN').length || 0}</p></div>
          </div>
          <Link to={`/shipments/${shipment._id}`} className="btn-primary">Manage <ArrowRight className="h-4 w-4"/></Link>
        </div>
      </article></StaggerItem>)}
    </Stagger> : <EmptyState title="No shipments" description="Accepted bulk plans and confirmed orders create shipments automatically."/>} 
  </PageMotion>;
}

export function LogisticsPlannerPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['logistics-control'],
    queryFn: async () => {
      const [shipments, vehicles] = await Promise.all([
        getData(api.get('/shipments')),
        getData(api.get('/vehicles')),
      ]);
      return { shipments, vehicles };
    },
    refetchInterval: 20_000,
  });
  const shipments = data?.shipments || [];
  const vehicles = data?.vehicles || [];
  const activeShipments = shipments.filter((shipment) => shipment.status !== 'DELIVERED');
  const current = activeShipments.find((shipment) => shipment._id === selected) || activeShipments[0];
  const compatibleVehicles = vehicles.filter((vehicle) => (
    (['AVAILABLE', 'IDLE'].includes(vehicle.status) || vehicle._id === current?.vehicleId)
    && Number(vehicle.capacity) >= Number(current?.load || 0)
    && (!current?.coldChainRequired || vehicle.coldChain)
  ));

  useEffect(() => {
    if (!selected && activeShipments[0]) setSelected(activeShipments[0]._id);
  }, [activeShipments, selected]);
  useEffect(() => {
    if (current && !compatibleVehicles.some((vehicle) => vehicle._id === vehicleId))
      setVehicleId(current.vehicleId || compatibleVehicles[0]?._id || '');
  }, [compatibleVehicles, current, vehicleId]);

  const optimize = useMutation({
    mutationFn: () => getData(api.post(`/shipments/${current._id}/optimize`)),
    onSuccess: (shipment) => {
      toast.success('Route optimized', { description: `${shipment.distance}km · ${shipment.duration} minutes · ${shipment.routeOptimization?.savingsKm || 0}km saved` });
      refreshLogistics(queryClient, shipment._id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });
  const dispatch = useMutation({
    mutationFn: () => getData(api.post(`/shipments/${current._id}/dispatch`, { vehicleId })),
    onSuccess: (shipment) => {
      toast.success('Vehicle dispatched to your fleet', { description: `Next stop: ${shipment.nextStop?.label}` });
      refreshLogistics(queryClient, shipment._id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });

  if (isLoading) return <LoadingState/>;
  if (error) return <ErrorState message={apiError(error)} onRetry={refetch}/>;
  return <>
    <PageHeader eyebrow="Automatic logistics" title="Fleet dispatch planner" description="Routes obey pickup → hub → delivery constraints. Vehicle capacity, cold-chain needs, fleet assignment, and completed stops are enforced server-side."/>
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="space-y-5">
        <section className="card p-5">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Active shipments</h2><span className="badge bg-forest-50 text-forest-700">{activeShipments.length}</span></div>
          <div className="mt-4 space-y-2">{activeShipments.map((shipment) => <button key={shipment._id} onClick={() => setSelected(shipment._id)} className={`w-full rounded-2xl border p-4 text-left ${current?._id === shipment._id ? 'border-forest-500 bg-forest-50' : 'border-gray-200 hover:bg-cream'}`}>
            <div className="flex items-center justify-between gap-2"><strong className="text-sm">{shipment._id.toUpperCase()}</strong><StatusBadge status={shipment.status}/></div>
            <p className="mt-2 text-xs text-gray-500">{shipment.stops.length} stops · {number(shipment.load)}kg · {shipment.distance}km</p>
            {shipment.dispatchRequired && <p className="mt-2 text-xs font-bold text-amber-700">Vehicle assignment needed</p>}
          </button>)}</div>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">Compatible vehicle</h2>
          <select className="input mt-4" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
            <option value="">Choose vehicle</option>
            {compatibleVehicles.map((vehicle) => <option key={vehicle._id} value={vehicle._id}>{vehicle.registration} · {vehicle.capacity}kg · {vehicle.coldChain ? 'cold-chain' : 'ambient'}</option>)}
          </select>
          <p className="mt-3 text-xs leading-5 text-gray-500">Only vehicles that fit the full trip load and temperature requirement are selectable.</p>
        </section>
      </aside>
      <section>{current ? <div className="space-y-5">
        <div className="card overflow-hidden">
          <div className="flex flex-col justify-between gap-4 border-b p-5 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-bold">Optimized route</h2><span className="badge bg-violet-50 text-violet-700"><Navigation className="h-3.5 w-3.5"/>Automatic v{current.routeOptimization?.version || 2}</span></div>
              <p className="mt-2 text-xs text-gray-500">{current.provider}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => optimize.mutate()} disabled={optimize.isPending}>{optimize.isPending ? <InlineLoader label="Optimizing…"/> : <><Route className="h-4 w-4"/>Recalculate</>}</button>
              <button className="btn-primary" onClick={() => dispatch.mutate()} disabled={!vehicleId || dispatch.isPending}>{dispatch.isPending ? <InlineLoader label="Dispatching…"/> : <><Truck className="h-4 w-4"/>{current.dispatchRequired ? 'Assign & dispatch' : 'Confirm assignment'}</>}</button>
            </div>
          </div>
          <RouteMap stops={current.stops} className="h-[480px] rounded-none border-0"/>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Trip load" value={`${number(current.load)}kg`} detail={`${current.stops.filter((stop) => stop.type === 'PICKUP').length} pickups`} icon={Box}/>
          <MetricCard label="Capacity used" value={`${current.utilization ?? 0}%`} detail={`${number(Math.max(0, current.capacity - current.load))}kg spare`} icon={Gauge}/>
          <MetricCard label="Route savings" value={`${current.routeOptimization?.savingsKm || 0}km`} detail={`${current.distance}km optimized`} icon={Route} tone="blue"/>
          <MetricCard label="Fuel estimate" value={`${current.estimatedFuelLitres || 0}L`} detail={`${current.duration} minutes`} icon={Fuel} tone="amber"/>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-forest-200 bg-forest-50 p-5"><MapPin className="h-5 w-5 text-forest-700"/><p className="mt-3 text-xs font-bold uppercase tracking-wider text-forest-700">Next operational stop</p><p className="mt-2 font-display text-lg font-bold">{routeSummary(current)}</p></div>
          <div className={`rounded-2xl border p-5 ${current.routeOptimization?.warnings?.length ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
            {current.routeOptimization?.warnings?.length ? <TriangleAlert className="h-5 w-5 text-amber-700"/> : <ShieldCheck className="h-5 w-5 text-blue-700"/>}
            <p className="mt-3 font-bold">{current.routeOptimization?.warnings?.length ? 'Dispatch warnings' : 'Compatibility checks passed'}</p>
            <p className="mt-2 text-xs leading-5">{current.routeOptimization?.warnings?.join(' · ') || 'Capacity and cold-chain constraints are satisfied for the current assignment.'}</p>
          </div>
        </div>
      </div> : <EmptyState title="No active shipments" description="A shipment is created automatically after a buyer accepts a fulfillment plan."/>}</section>
    </div>
  </>;
}

export function ShipmentDetailsPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const [proofType, setProofType] = useState(null);
  const [proof, setProof] = useState({ receiverName: '', acceptedQuantity: '', rejectedQuantity: 0, notes: '' });
  const [issueOpen, setIssueOpen] = useState(false);
  const [issue, setIssue] = useState({ type: 'TRAFFIC', severity: 'MEDIUM', message: '' });
  const { data: shipment, isLoading, error, refetch } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => getData(api.get(`/shipments/${id}`)),
    refetchInterval: 15_000,
  });
  useEffect(() => {
    if (user?.role !== 'driver' || !['IN_TRANSIT', 'PICKED_UP'].includes(shipment?.status) || !navigator.geolocation) return undefined;
    let lastSentAt = 0;
    const watcher = navigator.geolocation.watchPosition((position) => {
      if (Date.now() - lastSentAt < 20_000) return;
      lastSentAt = Date.now();
      getData(api.post(`/shipments/${id}/location`, {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
        speedKph: position.coords.speed == null ? undefined : Math.max(0, position.coords.speed * 3.6),
        heading: position.coords.heading == null ? undefined : position.coords.heading,
      })).then((updated) => queryClient.setQueryData(['shipment', id], updated)).catch(() => {});
    }, () => {}, { enableHighAccuracy: true, maximumAge: 15_000, timeout: 12_000 });
    return () => navigator.geolocation.clearWatch(watcher);
  }, [id, queryClient, shipment?.status, user?.role]);
  const inTransit = ['IN_TRANSIT', 'PICKED_UP'].includes(shipment?.status);
  const { data: loadPool } = useQuery({
    queryKey: ['load-opportunities', id],
    queryFn: () => getData(api.get(`/shipments/${id}/load-opportunities`)),
    enabled: Boolean(shipment && inTransit),
  });
  const optimize = useMutation({
    mutationFn: () => getData(api.post(`/shipments/${id}/optimize`)),
    onSuccess: (updated) => {
      toast.success('Route recalculated', { description: updated.nextStop ? `Next: ${updated.nextStop.label}` : undefined });
      refreshLogistics(queryClient, id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });
  const start = useMutation({
    mutationFn: () => getData(api.post(`/shipments/${id}/start`)),
    onSuccess: (updated) => {
      toast.success('Trip started', { description: updated.nextStop ? `Next: ${updated.nextStop.label}` : undefined });
      refreshLogistics(queryClient, id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });
  const completeStop = useMutation({
    mutationFn: (stop) => getData(api.post(`/shipments/${id}/stops/${stop.id || stop.sequence}/complete`, { quantity: stop.quantity, notes: `${stop.type} hand-off confirmed` })),
    onSuccess: (updated) => {
      toast.success(updated.status === 'DELIVERED' ? 'Trip completed' : 'Stop completed', { description: updated.nextStop ? `Next: ${updated.nextStop.label}` : 'Delivery workflow finished' });
      refreshLogistics(queryClient, id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });
  const reportIssue = useMutation({
    mutationFn: () => getData(api.post(`/shipments/${id}/issues`, issue)),
    onSuccess: () => {
      toast.success('Issue sent to fleet control');
      setIssueOpen(false);
      setIssue({ type: 'TRAFFIC', severity: 'MEDIUM', message: '' });
      refreshLogistics(queryClient, id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });
  const submitProof = useMutation({
    mutationFn: () => getData(api.post(`/shipments/${id}/${proofType === 'pickup' ? 'proof-of-pickup' : 'proof-of-delivery'}`, proofType === 'pickup' ? {
      receiverName: proof.receiverName,
      quantity: Number(proof.acceptedQuantity),
      notes: proof.notes,
    } : {
      receiverName: proof.receiverName,
      acceptedQuantity: Number(proof.acceptedQuantity),
      rejectedQuantity: Number(proof.rejectedQuantity || 0),
      notes: proof.notes,
    })),
    onSuccess: () => {
      toast.success(`Proof of ${proofType} recorded`);
      setProofType(null);
      refreshLogistics(queryClient, id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });
  const proposeLoad = useMutation({
    mutationFn: (candidateShipmentId) => getData(api.post(`/shipments/${id}/load-offers`, { candidateShipmentId })),
    onSuccess: ({ offer }) => {
      toast.success('Load offer sent', { description: `${number(offer.addedLoad)}kg · ${offer.detourKm}km estimated detour` });
      refreshLogistics(queryClient, id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });
  const respondToLoad = useMutation({
    mutationFn: ({ offerId, action }) => getData(api.post(`/shipments/${id}/load-offers/${offerId}/respond`, { action })),
    onSuccess: ({ shipment: updated, offer }) => {
      toast.success(offer.status === 'ACCEPTED' ? 'Extra load merged and route optimized' : 'Load offer declined', {
        description: offer.status === 'ACCEPTED' ? `${number(updated.load)}kg now on this trip · next: ${updated.nextStop?.label}` : 'The load returned to the dispatch pool.',
      });
      refreshLogistics(queryClient, id);
    },
    onError: (requestError) => toast.error(apiError(requestError)),
  });
  const openProof = (type) => {
    setProofType(type);
    setProof({ receiverName: type === 'pickup' ? 'Collection agent' : 'Buyer receiving desk', acceptedQuantity: shipment.load, rejectedQuantity: 0, notes: 'Crates counted and condition recorded.' });
  };

  if (isLoading) return <div className="container-page py-10"><LoadingState cards={2}/></div>;
  if (error) return <div className="container-page py-10"><ErrorState message={apiError(error)} onRetry={refetch}/></div>;
  const nextStop = shipment.nextStop || shipment.stops.find((stop) => stop.status === 'NEXT');
  const pendingOffers = (shipment.loadOffers || []).filter((offer) => offer.status === 'PENDING_FLEET');
  const opportunities = loadPool?.opportunities || [];
  return <div className="container-page py-10">
    <Link to="/logistics" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest-700"><ChevronLeft className="h-4 w-4"/>All shipments</Link>
    <PageHeader
      eyebrow="Fleet shipment control"
      title={shipment._id.toUpperCase()}
      description={`${shipment.stops.length} stops · ${shipment.orderIds.length} order${shipment.orderIds.length === 1 ? '' : 's'} · automatic pickup-first routing`}
      actions={<><StatusBadge status={shipment.status}/><button className="btn-secondary" onClick={() => optimize.mutate()} disabled={optimize.isPending}><Route className="h-4 w-4"/>Recalculate</button>{!shipment.startedAt && shipment.status !== 'DELIVERED' && <button className="btn-primary" onClick={() => start.mutate()} disabled={start.isPending}><Play className="h-4 w-4"/>Start trip</button>}</>}
    />
    {nextStop && <section className="mb-6 flex flex-col justify-between gap-4 rounded-3xl bg-forest-700 p-6 text-white sm:flex-row sm:items-center">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-forest-100">Next stop · {nextStop.type}</p><h2 className="mt-2 font-display text-2xl font-bold">{nextStop.label}</h2><p className="mt-2 text-sm text-forest-100">Stop {nextStop.sequence} of {shipment.stops.length} · complete stops in this optimized order.</p></div>
      <button className="btn bg-white text-forest-800 hover:bg-cream" onClick={() => completeStop.mutate(nextStop)} disabled={completeStop.isPending}>{completeStop.isPending ? <InlineLoader/> : <><CheckCircle2 className="h-4 w-4"/>Complete this stop</>}</button>
    </section>}
    {shipment.liveLocation && <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><div className="flex flex-wrap items-center justify-between gap-2"><strong>Live route update</strong><span className="badge bg-white text-blue-800">GPS updated {new Date(shipment.liveLocation.updatedAt).toLocaleTimeString()}</span></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><p><span className="text-blue-700">Progress</span><br/><strong>{shipment.routeProgress?.progressPercent || 0}% · {shipment.routeProgress?.completedStops || 0}/{shipment.routeProgress?.totalStops || shipment.stops.length} stops</strong></p><p><span className="text-blue-700">Remaining route</span><br/><strong>{shipment.remainingDistance ?? shipment.distance}km · {shipment.remainingDuration ?? shipment.duration} min</strong></p><p><span className="text-blue-700">Estimated arrival</span><br/><strong>{shipment.estimatedArrival ? new Date(shipment.estimatedArrival).toLocaleTimeString() : 'Calculating'}</strong></p></div></section>}
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {pendingOffers.map((offer) => <section key={offer.id} className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <div className="flex items-center gap-2 text-blue-800"><PackagePlus className="h-5 w-5"/><p className="text-xs font-bold uppercase tracking-[.16em]">In-transit load offer</p></div>
              <h2 className="mt-3 font-display text-xl font-bold">Add {number(offer.addedLoad)}kg to this trip?</h2>
              <p className="mt-2 text-sm text-gray-600">Pickup: {offer.pickup} · Delivery: {offer.delivery}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="badge bg-white text-blue-800">+{offer.detourKm}km detour</span>
                <span className="badge bg-white text-blue-800">{offer.utilizationAfter}% capacity after</span>
                <span className="badge bg-white text-blue-800">{number(offer.spareCapacityAfter)}kg spare</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => respondToLoad.mutate({ offerId: offer.id, action: 'DECLINE' })} disabled={respondToLoad.isPending}><XCircle className="h-4 w-4"/>Decline</button>
              <button className="btn-primary" onClick={() => respondToLoad.mutate({ offerId: offer.id, action: 'ACCEPT' })} disabled={respondToLoad.isPending}><Navigation className="h-4 w-4"/>Accept & re-optimize</button>
            </div>
          </div>
        </section>)}
        {inTransit && <section className="card p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><p className="eyebrow">Capacity sharing</p><h2 className="mt-2 font-display text-xl font-bold">Compatible extra loads</h2><p className="mt-2 text-sm text-gray-500">Only unassigned loads that fit this vehicle, temperature mode, and detour limit are shown.</p></div>
            <span className="badge bg-forest-50 text-forest-700">{number(loadPool?.remainingCapacity || 0)}kg free</span>
          </div>
          <div className="mt-5 space-y-3">
            {opportunities.map((opportunity) => <article key={opportunity.candidateShipmentId} className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 p-4 sm:flex-row sm:items-center">
              <div><div className="flex flex-wrap items-center gap-2"><strong>{opportunity.product}</strong><span className="badge bg-blue-50 text-blue-700">{number(opportunity.addedLoad)}kg</span></div><p className="mt-2 text-xs leading-5 text-gray-500">{opportunity.pickup} → {opportunity.delivery} · +{opportunity.detourKm}km · {opportunity.utilizationAfter}% full after loading</p></div>
              <button className="btn-secondary shrink-0" onClick={() => proposeLoad.mutate(opportunity.candidateShipmentId)} disabled={proposeLoad.isPending}><PackagePlus className="h-4 w-4"/>Review load</button>
            </article>)}
            {!opportunities.length && <p className="rounded-2xl bg-cream p-4 text-sm text-gray-500">No unassigned load currently meets every capacity, cold-chain, and route rule.</p>}
          </div>
        </section>}
        <RouteMap stops={shipment.stops} liveLocation={shipment.liveLocation} className="h-[500px]"/>
        <section className="card p-6">
          <div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-bold">Route stops</h2><p className="mt-1 text-xs text-gray-500">Completed stops stay fixed when the route recalculates.</p></div><span className="badge bg-violet-50 text-violet-700"><Navigation className="h-3.5 w-3.5"/>Auto v{shipment.routeOptimization?.version || 2}</span></div>
          <div className="mt-6">{shipment.stops.map((stop, index) => <div className="flex gap-4" key={stop.id || `${stop.label}-${index}`}>
            <div className="flex flex-col items-center"><span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white ${stop.status === 'COMPLETED' ? 'bg-forest-600' : stop.status === 'NEXT' ? 'bg-harvest' : 'bg-gray-400'}`}>{stop.status === 'COMPLETED' ? '✓' : stop.sequence || index + 1}</span>{index < shipment.stops.length - 1 && <span className="h-14 w-0.5 bg-gray-200"/>}</div>
            <div className="flex flex-1 items-start justify-between gap-3 pt-1"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{stop.label}</p><span className="badge bg-gray-100 text-gray-600">{stop.type}</span></div><p className="mt-1 text-xs text-gray-500">{String(stop.status).replaceAll('_', ' ')}{stop.quantity ? ` · ${number(stop.quantity)}${stop.unit || 'kg'}` : ''}</p></div>{stop.status === 'NEXT' && <button className="btn-ghost text-xs" onClick={() => completeStop.mutate(stop)}>Complete</button>}</div>
          </div>)}</div>
        </section>
      </div>
      <aside className="space-y-5">
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Vehicle & fleet partner</h2>
          <div className="mt-4 rounded-2xl bg-cream p-4"><p className="font-bold">{shipment.vehicle}</p><p className="mt-2 text-sm text-gray-600">{shipment.fleetPartner || 'Fleet assignment pending'}</p><p className="mt-1 text-xs font-bold text-forest-700">{shipment.phone || 'Contact protected'}</p></div>
          <div className="mt-5"><Progress value={shipment.utilization} label={`${number(shipment.load)} / ${number(shipment.capacity)}kg capacity`}/></div>
          <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-gray-500">Distance</dt><dd className="font-bold">{shipment.distance}km est.</dd></div><div className="flex justify-between"><dt className="text-gray-500">Duration</dt><dd className="font-bold">{shipment.duration} min</dd></div><div className="flex justify-between"><dt className="text-gray-500">Fuel estimate</dt><dd className="font-bold">{shipment.estimatedFuelLitres || 0}L</dd></div><div className="flex justify-between"><dt className="text-gray-500">Route savings</dt><dd className="font-bold">{shipment.routeOptimization?.savingsKm || 0}km</dd></div></dl>
        </section>
        {shipment.coldChainRequired && <section className={`card p-5 ${shipment.coldChain ? 'border-blue-100 bg-blue-50/40' : 'border-red-200 bg-red-50'}`}><Snowflake className="h-5 w-5"/><p className="mt-3 font-bold">Cold-chain {shipment.coldChain ? 'compatible' : 'required before dispatch'}</p></section>}
        {shipment.weather && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><CloudRain className="h-5 w-5 text-amber-700"/><p className="mt-3 text-sm font-bold text-amber-900">Weather advisory</p><p className="mt-2 text-xs leading-5 text-amber-800">{shipment.weather}</p></section>}
        {shipment.issues?.length > 0 && <section className="card p-5"><h2 className="font-display font-bold">Reported issues</h2>{shipment.issues.map((reported) => <div key={reported.id} className="mt-3 rounded-xl bg-red-50 p-3 text-xs"><strong>{reported.severity} · {reported.type}</strong><p className="mt-1 leading-5 text-gray-600">{reported.message}</p></div>)}</section>}
        <button className="btn-secondary w-full border-amber-300 text-amber-800" onClick={() => setIssueOpen(true)}><TriangleAlert className="h-4 w-4"/>Report route issue</button>
        <div className="grid grid-cols-2 gap-3"><button className="btn-secondary px-3" onClick={() => openProof('pickup')} disabled={shipment.status === 'DELIVERED'}><FileCheck2 className="h-4 w-4"/>Pickup proof</button><button className="btn-primary px-3" onClick={() => openProof('delivery')} disabled={shipment.status === 'DELIVERED'}><FileCheck2 className="h-4 w-4"/>Delivery proof</button></div>
      </aside>
    </div>
    <Modal open={Boolean(proofType)} onClose={() => setProofType(null)} title={`Record proof of ${proofType}`}>
      <div className="space-y-4">
        <label><span className="label">Receiver name</span><input className="input" value={proof.receiverName} onChange={(event) => setProof({ ...proof, receiverName: event.target.value })}/></label>
        <div className="grid grid-cols-2 gap-3"><label><span className="label">Accepted quantity</span><input className="input" type="number" value={proof.acceptedQuantity} onChange={(event) => setProof({ ...proof, acceptedQuantity: event.target.value })}/></label><label><span className="label">Rejected / damaged</span><input className="input" type="number" value={proof.rejectedQuantity} onChange={(event) => setProof({ ...proof, rejectedQuantity: event.target.value })}/></label></div>
        <label><span className="label">Notes</span><textarea className="textarea" value={proof.notes} onChange={(event) => setProof({ ...proof, notes: event.target.value })}/></label>
        <button className="btn-primary w-full" onClick={() => submitProof.mutate()} disabled={!proof.receiverName || submitProof.isPending}>{submitProof.isPending ? <InlineLoader/> : `Confirm ${proofType}`}</button>
      </div>
    </Modal>
    <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Report a route issue">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3"><label><span className="label">Issue type</span><select className="input" value={issue.type} onChange={(event) => setIssue({ ...issue, type: event.target.value })}>{['BREAKDOWN', 'TRAFFIC', 'WEATHER', 'QUALITY', 'QUANTITY', 'OTHER'].map((type) => <option key={type}>{type}</option>)}</select></label><label><span className="label">Severity</span><select className="input" value={issue.severity} onChange={(event) => setIssue({ ...issue, severity: event.target.value })}>{['LOW', 'MEDIUM', 'HIGH'].map((severity) => <option key={severity}>{severity}</option>)}</select></label></div>
        <label><span className="label">What happened?</span><textarea className="textarea" value={issue.message} onChange={(event) => setIssue({ ...issue, message: event.target.value })} placeholder="Add a useful update for fleet control"/></label>
        <button className="btn-primary w-full" onClick={() => reportIssue.mutate()} disabled={issue.message.trim().length < 3 || reportIssue.isPending}>{reportIssue.isPending ? <InlineLoader/> : 'Send to fleet control'}</button>
      </div>
    </Modal>
  </div>;
}

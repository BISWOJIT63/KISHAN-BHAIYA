import {
  Building2,
  Check,
  Clock3,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, apiError, getData } from "../api/client.js";
import {
  EmptyState,
  ErrorState,
  InlineLoader,
  LoadingState,
  Modal,
  PageHeader,
  StatusBadge,
} from "../components/UI.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { shortDate } from "../utils/format.js";
import { detectCurrentIndiaLocation } from "../utils/location.js";
import SmartImage from "../components/SmartImage.jsx";

const directionsUrl = (fpo) => {
  if (!Array.isArray(fpo.coordinates)) return null;
  const [longitude, latitude] = fpo.coordinates;
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
};

export default function FpoMembershipPage() {
  const user = useAppStore((state) => state.user);
  const queryClient = useQueryClient();
  const isFarmer = user?.role === "farmer";
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFpo, setSelectedFpo] = useState(null);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["fpo-membership-requests", user?._id],
    queryFn: () => getData(api.get("/fpo/membership-requests")),
  });
  const {
    data: fpoDirectory = { fpos: [], origin: null },
    isLoading: fposLoading,
    isError: fposError,
    refetch: refetchFpos,
  } = useQuery({
    queryKey: [
      "joinable-fpos",
      deviceLocation?.latitude,
      deviceLocation?.longitude,
    ],
    queryFn: () =>
      api
        .get("/fpos", {
          params: deviceLocation
            ? {
                latitude: deviceLocation.latitude,
                longitude: deviceLocation.longitude,
              }
            : undefined,
        })
        .then((response) => ({
          fpos: response.data.data,
          origin: response.data.meta?.origin || null,
        })),
    enabled: isFarmer,
  });
  const submit = useMutation({
    mutationFn: (fpoId) => getData(api.post("/fpo/membership-requests", { fpoId, message })),
    onSuccess: () => {
      toast.success("Membership request sent", { description: "The FPO manager will review it." });
      setMessage("");
      setSelectedFpo(null);
      queryClient.invalidateQueries({ queryKey: ["fpo-membership-requests"] });
    },
    onError: (error) => toast.error(apiError(error)),
  });

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const location = await detectCurrentIndiaLocation();
      setDeviceLocation(location);
      toast.success("Location updated", {
        description: `FPOs will be ranked from ${location.label || location.name}.`,
      });
    } catch (error) {
      toast.error(error.message || "We could not detect your location");
    } finally {
      setLocating(false);
    }
  };
  const review = useMutation({
    mutationFn: ({ requestId, action }) => getData(api.patch(`/fpo/membership-requests/${requestId}`, { action })),
    onSuccess: (updated) => {
      toast.success(updated.status === "APPROVED" ? "Farmer approved" : "Request rejected");
      queryClient.invalidateQueries({ queryKey: ["fpo-membership-requests"] });
      queryClient.invalidateQueries({ queryKey: ["fpo-members"] });
    },
    onError: (error) => toast.error(apiError(error)),
  });

  if (requestsLoading || (isFarmer && fposLoading)) return <LoadingState />;

  if (isFarmer) {
    if (fposError)
      return (
        <ErrorState
          message="We could not load the FPO directory."
          onRetry={refetchFpos}
        />
      );

    const fpos = fpoDirectory.fpos;
    const requestByFpo = Object.fromEntries(requests.map((request) => [request.fpoId, request]));
    const normalizedSearch = search.trim().toLowerCase();
    const visibleFpos = normalizedSearch
      ? fpos.filter((fpo) =>
          [fpo.name, fpo.location, fpo.address, ...(fpo.crops || [])]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
        )
      : fpos;
    const nearestFpo = fpos[0];
    const originLabel =
      deviceLocation?.label ||
      deviceLocation?.name ||
      fpoDirectory.origin?.label ||
      "your saved farm location";
    const selectedRequest = selectedFpo
      ? requestByFpo[selectedFpo.fpoId]
      : null;

    return (
      <>
        <PageHeader
          eyebrow="FPO directory"
          title="Find an FPO near you"
          description="Compare nearby verified Farmer Producer Organisations, view their office contact details and request membership."
          actions={
            <button
              className="btn-primary"
              disabled={locating}
              onClick={useCurrentLocation}
            >
              {locating ? (
                <InlineLoader label="Finding you…" />
              ) : (
                <>
                  <Navigation className="h-4 w-4" /> Use my current location
                </>
              )}
            </button>
          }
        />

        {nearestFpo && (
          <section className="card relative mb-6 overflow-hidden bg-forest-900 p-6 text-white sm:p-7">
            <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/5" />
            <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-harvest">
                  <MapPin className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-forest-200">
                    Nearest verified FPO
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-extrabold">
                    {nearestFpo.name}
                  </h2>
                  <p className="mt-2 text-sm text-white/75">
                    {nearestFpo.distanceKm === null
                      ? "Distance unavailable"
                      : `${nearestFpo.distanceKm} km away`} {" "}
                    · {nearestFpo.location}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Calculated from {originLabel}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {nearestFpo.phone && (
                  <a className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/15" href={`tel:${nearestFpo.phone}`}>
                    <Phone className="h-4 w-4" /> Call FPO
                  </a>
                )}
                {directionsUrl(nearestFpo) && (
                  <a className="btn-secondary border-white/20 bg-white text-forest-900" href={directionsUrl(nearestFpo)} target="_blank" rel="noreferrer">
                    <Navigation className="h-4 w-4" /> Directions
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="card mb-6 p-4 sm:p-5">
          <label className="relative block" htmlFor="fpo-search">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="fpo-search"
              className="input pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by FPO, district or crop"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>{visibleFpos.length} verified FPO{visibleFpos.length === 1 ? "" : "s"} found</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-forest-600" /> Sorted from {originLabel}
            </span>
          </div>
        </section>

        {visibleFpos.length ? (
          <div className="grid gap-5 xl:grid-cols-2">
            {visibleFpos.map((fpo) => {
              const existing = requestByFpo[fpo.fpoId];
              const routeUrl = directionsUrl(fpo);
              return (
                <article className="card overflow-hidden" key={fpo.fpoId}>
                  <div className="grid sm:grid-cols-[168px_1fr]">
                    <div className="relative min-h-44">
                      <SmartImage src={fpo.image} alt={fpo.name} className="absolute inset-0 h-full w-full object-cover" />
                      {fpo.fpoId === nearestFpo?.fpoId && (
                        <span className="absolute left-3 top-3 rounded-full bg-harvest px-3 py-1 text-[11px] font-extrabold text-forest-950 shadow-sm">
                          Nearest
                        </span>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="eyebrow">Verified FPO</p>
                          <h2 className="mt-2 font-display text-xl font-bold">{fpo.name}</h2>
                        </div>
                        {existing && <StatusBadge status={existing.status} />}
                      </div>
                      <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-gray-500">
                        <MapPin className="mt-1 h-4 w-4 shrink-0" />
                        <span>{fpo.address}</span>
                      </p>
                      <div className="mt-4 grid gap-2 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                        <p className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-forest-600" /><span><strong className="text-ink">{fpo.contactName}</strong> · FPO contact</span></p>
                        {fpo.phone && <a className="flex items-center gap-2 hover:text-forest-700" href={`tel:${fpo.phone}`}><Phone className="h-4 w-4 text-forest-600" />{fpo.phone}</a>}
                        {fpo.email && <a className="flex min-w-0 items-center gap-2 hover:text-forest-700" href={`mailto:${fpo.email}`}><Mail className="h-4 w-4 shrink-0 text-forest-600" /><span className="truncate">{fpo.email}</span></a>}
                        <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-forest-600" />{fpo.officeHours}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(fpo.crops || []).map((crop) => <span className="badge bg-forest-50 text-forest-700" key={crop}>{crop}</span>)}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{fpo.rating} ({fpo.reviews})</span>
                        {fpo.distanceKm !== null && <span className="font-bold text-forest-700">{fpo.distanceKm} km away</span>}
                        {fpo.memberCount && <span>{fpo.memberCount} members</span>}
                        <span>{fpo.reliability}% reliability</span>
                      </div>
                      {existing?.managerNote && <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">Manager note: {existing.managerNote}</p>}
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        {routeUrl && <a className="btn-secondary" href={routeUrl} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" />Directions</a>}
                        <button
                          className="btn-primary"
                          disabled={!fpo.acceptingMembers || Boolean(existing && ["PENDING", "APPROVED"].includes(existing.status))}
                          onClick={() => setSelectedFpo(fpo)}
                        >
                          {existing?.status === "PENDING" ? "Awaiting review" : existing?.status === "APPROVED" ? "FPO member" : <><Send className="h-4 w-4" />{existing?.status === "REJECTED" ? "Request again" : "Request to join"}</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={search ? "No matching FPO found" : "No FPOs are listed yet"}
            description={search ? "Try a district, FPO name or crop such as rice." : "Verified FPOs will appear here when they join the directory."}
            action={search ? <button className="btn-secondary" onClick={() => setSearch("")}>Clear search</button> : null}
          />
        )}

        <Modal
          open={Boolean(selectedFpo)}
          onClose={() => !submit.isPending && setSelectedFpo(null)}
          title={`Request to join ${selectedFpo?.name || "FPO"}`}
          footer={
            <>
              <button className="btn-secondary" disabled={submit.isPending} onClick={() => setSelectedFpo(null)}>Cancel</button>
              <button className="btn-primary" disabled={submit.isPending || Boolean(selectedRequest && ["PENDING", "APPROVED"].includes(selectedRequest.status))} onClick={() => submit.mutate(selectedFpo.fpoId)}>
                {submit.isPending ? <InlineLoader label="Sending…" /> : <><Send className="h-4 w-4" />Send request</>}
              </button>
            </>
          }
        >
          <div className="rounded-2xl bg-forest-50 p-4">
            <p className="font-bold text-forest-900">{selectedFpo?.contactName}</p>
            <p className="mt-1 text-sm text-forest-700">{selectedFpo?.address}</p>
          </div>
          <label className="label mt-5" htmlFor="membership-message">Optional note to the FPO manager</label>
          <textarea
            id="membership-message"
            className="input min-h-28 resize-y py-3"
            maxLength={500}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Introduce your farm, crops and expected contribution…"
          />
          <p className="mt-2 text-right text-xs text-gray-400">{message.length}/500</p>
        </Modal>
      </>
    );
  }

  const ordered = [...requests].sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));
  return (
    <>
      <PageHeader eyebrow="FPO membership" title="Farmer join requests" description="Only your FPO can see these requests. Approving creates an active member record; rejecting does not expose private manager contact details." actions={<span className="badge border border-amber-200 bg-amber-50 text-amber-700">{requests.filter((request) => request.status === "PENDING").length} pending</span>} />
      {ordered.length ? (
        <div className="space-y-4">
          {ordered.map((request) => (
            <article className="card p-6" key={request._id}>
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="flex gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-forest-50 text-forest-700"><UserPlus className="h-5 w-5" /></span>
                  <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold">{request.farmerName}</h2><StatusBadge status={request.status} /></div><p className="mt-1 text-sm text-gray-600">{request.farmName} · {request.location}</p><p className="mt-1 text-xs text-gray-400">Requested {shortDate(request.createdAt)}</p>{request.message && <p className="mt-3 max-w-2xl rounded-xl bg-cream p-3 text-sm leading-6 text-gray-600">“{request.message}”</p>}</div>
                </div>
                {request.status === "PENDING" ? (
                  <div className="flex shrink-0 gap-2"><button className="btn-secondary" disabled={review.isPending} onClick={() => review.mutate({ requestId: request._id, action: "REJECT" })}><X className="h-4 w-4" />Reject</button><button className="btn-primary" disabled={review.isPending} onClick={() => review.mutate({ requestId: request._id, action: "APPROVE" })}><Check className="h-4 w-4" />Approve</button></div>
                ) : <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">{request.status === "APPROVED" ? <ShieldCheck className="h-5 w-5 text-forest-600" /> : <Building2 className="h-5 w-5" />}Reviewed {shortDate(request.reviewedAt)}</div>}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState title="No membership requests" description="New farmer requests to join your FPO will appear here." />}
    </>
  );
}

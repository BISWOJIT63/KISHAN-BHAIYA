import { Building2, Check, MapPin, Send, ShieldCheck, Star, UserPlus, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api, apiError, getData } from "../api/client.js";
import { EmptyState, LoadingState, PageHeader, StatusBadge } from "../components/UI.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { shortDate } from "../utils/format.js";
import SmartImage from '../components/SmartImage.jsx';

export default function FpoMembershipPage() {
  const user = useAppStore((state) => state.user);
  const queryClient = useQueryClient();
  const isFarmer = user?.role === "farmer";
  const [message, setMessage] = useState("");
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["fpo-membership-requests", user?._id],
    queryFn: () => getData(api.get("/fpo/membership-requests")),
  });
  const { data: fpos = [], isLoading: fposLoading } = useQuery({
    queryKey: ["joinable-fpos"],
    queryFn: () => getData(api.get("/fpos")),
    enabled: isFarmer,
  });
  const submit = useMutation({
    mutationFn: (fpoId) => getData(api.post("/fpo/membership-requests", { fpoId, message })),
    onSuccess: () => {
      toast.success("Membership request sent", { description: "The FPO manager will review it." });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["fpo-membership-requests"] });
    },
    onError: (error) => toast.error(apiError(error)),
  });
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
    const requestByFpo = Object.fromEntries(requests.map((request) => [request.fpoId, request]));
    return (
      <>
        <PageHeader eyebrow="Farmer membership" title="Join an FPO" description="Send a membership request to a verified FPO. The manager must approve it before you become a member." />
        <section className="card mb-6 p-5">
          <label className="label" htmlFor="membership-message">Optional note to the FPO manager</label>
          <textarea id="membership-message" className="input min-h-24 resize-y" maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Introduce your farm, crops and expected contribution…" />
          <p className="mt-2 text-right text-xs text-gray-400">{message.length}/500</p>
        </section>
        {fpos.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {fpos.map((fpo) => {
              const existing = requestByFpo[fpo.fpoId];
              return (
                <article className="card overflow-hidden" key={fpo.fpoId}>
                  <div className="grid sm:grid-cols-[180px_1fr]">
                    <SmartImage src={fpo.image} alt={fpo.name} className="h-48 w-full object-cover sm:h-full" />
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="eyebrow">Verified FPO</p><h2 className="mt-2 font-display text-xl font-bold">{fpo.name}</h2></div>
                        {existing && <StatusBadge status={existing.status} />}
                      </div>
                      <p className="mt-3 flex items-center gap-2 text-sm text-gray-500"><MapPin className="h-4 w-4" />{fpo.location}</p>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600"><span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{fpo.rating} ({fpo.reviews})</span><span>{fpo.reliability}% reliability</span><span>{fpo.completedOrders} completed orders</span></div>
                      {existing?.managerNote && <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">Manager note: {existing.managerNote}</p>}
                      <button className="btn-primary mt-5 w-full" disabled={Boolean(existing && ["PENDING", "APPROVED"].includes(existing.status)) || (submit.isPending && submit.variables === fpo.fpoId)} onClick={() => submit.mutate(fpo.fpoId)}>
                        {existing?.status === "PENDING" ? "Awaiting review" : existing?.status === "APPROVED" ? "FPO member" : <><Send className="h-4 w-4" />{existing?.status === "REJECTED" ? "Send a new request" : "Request to join"}</>}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <EmptyState title="No FPO is accepting digital requests" description="Onboarded FPOs will appear here when a manager account is available." />}
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

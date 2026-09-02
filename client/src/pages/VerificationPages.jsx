import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileUp,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, apiError, getData } from "../api/client.js";
import Logo from "../components/Logo.jsx";
import { EmptyState, InlineLoader, LoadingState, PageHeader, StatusBadge } from "../components/UI.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { workspaceForRole } from "../utils/navigation.js";

const documentOptions = {
  business_buyer: [["BUSINESS_REGISTRATION", "Business registration"]],
  farmer: [["PHOTO_ID", "Configured photo ID"], ["FARMING_EVIDENCE", "Optional farming evidence"]],
  fpo_manager: [["ORGANIZATION_REGISTRATION", "Organization registration"], ["AUTHORIZED_SIGNATORY", "Authorized-signatory proof"]],
  logistics_partner: [["BUSINESS_REGISTRATION", "Business registration"], ["VEHICLE_REGISTRATION", "Vehicle registration"]],
  logistics: [["BUSINESS_REGISTRATION", "Business registration"]],
};

const statusContent = {
  PENDING_ADMIN_APPROVAL: {
    title: "Your application is under review",
    description: "Kishan Bhaiya verification staff will review your profile and submitted documents. Operational tools remain locked until approval.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock3,
  },
  CHANGES_REQUESTED: {
    title: "Changes are required",
    description: "Review the administrator note, update your details or documents, then resubmit your application.",
    tone: "border-blue-200 bg-blue-50 text-blue-900",
    icon: RefreshCw,
  },
  REJECTED: {
    title: "Application not approved",
    description: "The decision and reason are preserved below. Contact support if you believe another review is required.",
    tone: "border-red-200 bg-red-50 text-red-900",
    icon: XCircle,
  },
  SUSPENDED: {
    title: "Account suspended",
    description: "Your historical records are preserved, but operational access is disabled until an administrator reactivates the account.",
    tone: "border-red-200 bg-red-50 text-red-900",
    icon: AlertTriangle,
  },
  ACTIVE: {
    title: "Account verified and active",
    description: "Your operational workspace is available.",
    tone: "border-forest-200 bg-forest-50 text-forest-900",
    icon: CheckCircle2,
  },
};

export function VerificationCenterPage() {
  const navigate = useNavigate();
  const { user: sessionUser, accessToken, setSession, clearSession } = useAppStore();
  const [documentType, setDocumentType] = useState("");
  const [document, setDocument] = useState(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["my-verification"],
    queryFn: () => getData(api.get("/auth/verification")),
  });
  const user = data?.user || sessionUser;
  const accountStatus = user?.accountStatus || (user?.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL");
  const content = statusContent[accountStatus] || statusContent.PENDING_ADMIN_APPROVAL;
  const StatusIcon = content.icon;
  const options = documentOptions[user?.role] || [];
  const chosenType = documentType || options[0]?.[0] || "SUPPORTING_DOCUMENT";
  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!document) throw new Error("Choose a PDF or image first");
      const body = new FormData();
      body.append("document", document);
      body.append("documentType", chosenType);
      return getData(api.post("/auth/verification/documents", body));
    },
    onSuccess: () => {
      toast.success("Verification document uploaded securely");
      setDocument(null);
      refetch();
    },
    onError: (uploadError) => toast.error(apiError(uploadError)),
  });
  const submit = useMutation({
    mutationFn: () => getData(api.post("/auth/verification/submit")),
    onSuccess: (result) => {
      setSession(result.user, result.accessToken || accessToken);
      toast.success("Application submitted for review");
      refetch();
    },
    onError: (submitError) => toast.error(apiError(submitError)),
  });
  const logout = async () => {
    await api.post("/auth/logout").catch(() => null);
    clearSession();
    navigate("/login", { replace: true });
  };
  if (isLoading) return <div className="min-h-screen bg-cream p-8"><LoadingState cards={3} /></div>;
  if (error) return <div className="container-page py-16"><EmptyState title="Verification center unavailable" description={apiError(error)} action={<button className="btn-primary" onClick={() => refetch()}>Retry</button>} /></div>;
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-forest-900/10 bg-white/80">
        <div className="container-page flex h-20 items-center justify-between">
          <Logo />
          <button className="btn-ghost" onClick={logout}><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </header>
      <main className="container-page max-w-6xl py-10">
        <PageHeader eyebrow="Trust & verification" title="Verification center" description="Review your application, securely provide configured evidence and track every decision." />
        <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="card p-6 text-center">
            <UserAvatar user={user} className="mx-auto h-20 w-20 rounded-3xl text-xl" />
            <h2 className="mt-4 font-display text-xl font-bold">{user?.name}</h2>
            <p className="mt-1 text-sm capitalize text-gray-500">{user?.role?.replaceAll("_", " ")}</p>
            <div className="mt-4"><StatusBadge status={accountStatus} /></div>
            <dl className="mt-6 space-y-3 border-t pt-5 text-left text-sm">
              <div><dt className="text-xs text-gray-500">Email</dt><dd className="mt-1 font-bold">{user?.email}</dd></div>
              <div><dt className="text-xs text-gray-500">Phone</dt><dd className="mt-1 font-bold">{user?.phone || "Not provided"}</dd></div>
              <div><dt className="text-xs text-gray-500">Location</dt><dd className="mt-1 font-bold">{user?.location || "Not provided"}</dd></div>
            </dl>
            <Link to="/profile" className="btn-secondary mt-6 w-full">Edit permitted details</Link>
          </aside>
          <div className="space-y-6">
            <section className={`rounded-3xl border p-6 ${content.tone}`}>
              <StatusIcon className="h-7 w-7" />
              <h2 className="mt-4 font-display text-2xl font-bold">{content.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 opacity-80">{content.description}</p>
              {data.profile.adminNote && <div className="mt-5 rounded-2xl bg-white/70 p-4"><p className="text-xs font-bold uppercase tracking-wider opacity-60">Administrator note</p><p className="mt-2 text-sm leading-6">{data.profile.adminNote}</p></div>}
              {data.profile.rejectionReasonCode && <p className="mt-3 text-xs font-bold">Reason: {data.profile.rejectionReasonCode.replaceAll("_", " ")}</p>}
            </section>
            <section className="card p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold">Application progress</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                {[
                  ["Account created", true],
                  ["Contact verified", user?.contactVerified],
                  ["Profile submitted", Boolean(data.profile.submittedAt)],
                  ["Admin approval", accountStatus === "ACTIVE"],
                ].map(([label, complete]) => <div key={label} className="rounded-2xl bg-cream p-4"><span className={`grid h-8 w-8 place-items-center rounded-full ${complete ? "bg-forest-700 text-white" : "bg-gray-200 text-gray-500"}`}>{complete ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span><p className="mt-3 text-sm font-bold">{label}</p></div>)}
              </div>
            </section>
            {accountStatus !== "ACTIVE" && !["REJECTED", "SUSPENDED"].includes(accountStatus) && (
              <section className="card p-6 sm:p-8">
                <div className="flex items-start gap-3"><FileCheck2 className="mt-1 h-5 w-5 text-forest-700" /><div><h2 className="font-display text-xl font-bold">Verification documents</h2><p className="mt-1 text-sm text-gray-500">Files are stored privately and are never exposed through public seller or traceability APIs.</p></div></div>
                <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
                  <label><span className="label">Document type</span><select className="input" value={chosenType} onChange={(event) => setDocumentType(event.target.value)}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label><span className="label">PDF or image</span><input className="input pt-3" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setDocument(event.target.files?.[0] || null)} /></label>
                  <button className="btn-secondary self-end" disabled={!document || uploadDocument.isPending} onClick={() => uploadDocument.mutate()}>{uploadDocument.isPending ? <InlineLoader /> : <><FileUp className="h-4 w-4" /> Upload</>}</button>
                </div>
                <div className="mt-6 space-y-3">
                  {data.documents.length ? data.documents.map((item) => <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4"><div><p className="text-sm font-bold">{item.documentType.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-gray-500">{item.mimeType} · {Math.ceil(item.size / 1024)} KB</p></div><StatusBadge status={item.status} /></div>) : <p className="rounded-2xl bg-cream p-4 text-sm text-gray-500">No verification documents uploaded yet.</p>}
                </div>
                {accountStatus === "CHANGES_REQUESTED" && <button className="btn-primary mt-6" onClick={() => submit.mutate()} disabled={submit.isPending}>{submit.isPending ? <InlineLoader label="Submitting…" /> : <>Resubmit application <ArrowRight className="h-4 w-4" /></>}</button>}
              </section>
            )}
            {accountStatus === "ACTIVE" && <Link to={workspaceForRole(user?.role)} className="btn-primary">Open my workspace <ArrowRight className="h-4 w-4" /></Link>}
          </div>
        </div>
      </main>
    </div>
  );
}

export function VerificationAdminPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState("");
  const [reasonCode, setReasonCode] = useState("INCOMPLETE_OR_UNVERIFIABLE");
  const query = useQuery({ queryKey: ["admin-verifications", status, role], queryFn: () => getData(api.get("/admin/verifications", { params: { status: status || undefined, role: role || undefined } })) });
  const applications = query.data || [];
  const selected = applications.find((item) => item._id === selectedId) || applications[0];
  const review = useMutation({
    mutationFn: (action) => getData(api.patch(`/admin/verifications/${selected._id}/review`, { action, note: note || undefined, reasonCode: action === "REJECT" ? reasonCode : undefined })),
    onSuccess: (result) => {
      toast.success(`Application ${result.overallStatus.toLowerCase().replaceAll("_", " ")}`);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-verifications"] });
    },
    onError: (reviewError) => toast.error(apiError(reviewError)),
  });
  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Kishan Bhaiya Admin" title="Verification queue" description="Review applicants, document metadata and prior decisions. Every high-impact action creates an immutable audit record." actions={<Link className="btn-secondary" to="/admin">Dispute center</Link>} />
      <div className="mb-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2">
        <label><span className="label">Status</span><select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{["PENDING_ADMIN_APPROVAL", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "SUSPENDED"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span className="label">Role</span><select className="input" value={role} onChange={(event) => setRole(event.target.value)}><option value="">All roles</option>{["business_buyer", "farmer", "fpo_manager", "logistics_partner"].map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {query.isLoading ? <LoadingState cards={3} /> : query.error ? <EmptyState title="Could not load applications" description={apiError(query.error)} /> : (
        <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="card p-4">
            <div className="flex items-center justify-between px-2 py-2"><h2 className="font-display text-lg font-bold">Applications</h2><span className="badge bg-forest-50 text-forest-700">{applications.length}</span></div>
            {applications.length ? applications.map((application) => <button key={application._id} className={`mt-2 w-full rounded-2xl border p-4 text-left ${selected?._id === application._id ? "border-forest-500 bg-forest-50" : "border-gray-200"}`} onClick={() => { setSelectedId(application._id); setNote(""); }}><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold">{application.applicant?.name}</p><p className="mt-1 text-xs capitalize text-gray-500">{application.role.replaceAll("_", " ")}</p></div><StatusBadge status={application.overallStatus} /></div><p className="mt-3 text-xs text-gray-500">{application.documents.length} document{application.documents.length === 1 ? "" : "s"}</p></button>) : <EmptyState title="No matching applications" />}
          </aside>
          <section>{selected ? <div className="card overflow-hidden"><header className="border-b p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><StatusBadge status={selected.overallStatus} /><h2 className="mt-4 font-display text-2xl font-bold">{selected.applicant?.name}</h2><p className="mt-1 text-sm text-gray-500">{selected.applicant?.email} · {selected.applicant?.phone}</p></div><UserCheck className="h-8 w-8 text-forest-700" /></div></header><div className="grid gap-7 p-6 xl:grid-cols-[1fr_320px]"><div><h3 className="font-display text-lg font-bold">Applicant details</h3><dl className="mt-4 grid gap-3 sm:grid-cols-2">{[["Role", selected.role.replaceAll("_", " ")], ["Organization", selected.applicant?.organization || "Not provided"], ["Location", selected.applicant?.location || "Not provided"], ["Resubmissions", selected.resubmissionCount || 0]].map(([label, value]) => <div key={label} className="rounded-2xl bg-cream p-4"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 text-sm font-bold capitalize">{value}</dd></div>)}</dl><h3 className="mt-7 font-display text-lg font-bold">Document metadata</h3><div className="mt-3 space-y-3">{selected.documents.length ? selected.documents.map((item) => <div key={item._id} className="flex items-center justify-between rounded-2xl border p-4"><div><p className="text-sm font-bold">{item.documentType.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-gray-500">{item.mimeType} · {Math.ceil(item.size / 1024)} KB · private file</p></div><StatusBadge status={item.status} /></div>) : <p className="rounded-2xl bg-cream p-4 text-sm text-gray-500">No documents submitted.</p>}</div></div><aside><label><span className="label">Review note</span><textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Required for changes, rejection or suspension" /></label><label className="mt-4 block"><span className="label">Rejection reason</span><select className="input" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)}><option value="INCOMPLETE_OR_UNVERIFIABLE">Incomplete or unverifiable</option><option value="DOCUMENT_MISMATCH">Document mismatch</option><option value="DUPLICATE_APPLICATION">Duplicate application</option><option value="OUTSIDE_POLICY">Outside platform policy</option></select></label><div className="mt-5 grid gap-2">{selected.overallStatus !== "APPROVED" && <button className="btn-primary" onClick={() => review.mutate("APPROVE")} disabled={review.isPending}><CheckCircle2 className="h-4 w-4" /> Approve & activate</button>}<button className="btn-secondary" onClick={() => review.mutate("REQUEST_CHANGES")} disabled={!note || review.isPending}><RefreshCw className="h-4 w-4" /> Request changes</button><button className="btn-secondary text-red-700" onClick={() => review.mutate("REJECT")} disabled={!note || review.isPending}><XCircle className="h-4 w-4" /> Reject application</button>{selected.overallStatus === "SUSPENDED" ? <button className="btn-secondary" onClick={() => review.mutate("REACTIVATE")}><ShieldCheck className="h-4 w-4" /> Reactivate</button> : <button className="btn-ghost text-red-700" onClick={() => review.mutate("SUSPEND")} disabled={!note || review.isPending}><AlertTriangle className="h-4 w-4" /> Suspend account</button>}</div><p className="mt-5 rounded-2xl bg-forest-50 p-4 text-xs leading-5 text-forest-800">Private document file keys are intentionally omitted from this API response. A future secure reviewer download must use a short-lived authorized endpoint.</p></aside></div></div> : <EmptyState title="Select an application" />}</section>
        </div>
      )}
    </div>
  );
}

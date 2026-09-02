import {
  BellRing,
  Building2,
  Camera,
  Check,
  Edit3,
  Heart,
  LogOut,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  Radio,
  Save,
  ShieldCheck,
  ShoppingBasket,
  Tractor,
  Trash2,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { api, apiError, getData } from "../api/client.js";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import ProductCard from "../components/ProductCard.jsx";
import UserAvatar from "../components/UserAvatar.jsx";
import { EmptyState, InlineLoader, PageHeader, VerifiedBadge } from "../components/UI.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { canShop, workspaceForRole } from "../utils/navigation.js";
import { detectCurrentIndiaLocation } from "../utils/location.js";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().regex(/^[0-9+ ()-]{10,16}$/, "Enter a valid phone number"),
  organization: z.string().trim().max(120).optional(),
  location: z.string().trim().min(2, "Choose your location").max(80),
});

function FormField({ label, error, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        {Icon && <Icon className="absolute left-3 top-3 h-5 w-5 text-forest-700" />}
        {children}
      </span>
      {error && <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, description, icon: Icon }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-gray-100 p-4">
      <span className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-forest-700" />
        <span>
          <strong className="block text-sm">{label}</strong>
          {description && (
            <span className="mt-1 block text-xs leading-5 text-gray-500">
              {description}
            </span>
          )}
        </span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 accent-forest-700"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInput = useRef(null);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [locating, setLocating] = useState(false);
  const {
    user,
    accessToken,
    location,
    savedProducts,
    lowBandwidth,
    orderAlerts,
    marketAlerts,
    setSession,
    clearSession,
    setLocation,
    setPreferences,
  } = useAppStore();
  const [detectedCoordinates, setDetectedCoordinates] = useState(user?.locationCoordinates || null);
  const [preferenceCoordinates, setPreferenceCoordinates] = useState(user?.locationCoordinates || null);
  const producer = ["farmer", "fpo_manager"].includes(user?.role);
  const shoppingEnabled = canShop(user?.role);
  const showOrganization = user?.role !== "consumer";
  const details = [
    [t("profile.email"), user?.email || "—"],
    [t("profile.phone"), user?.phone || "—"],
    ...(showOrganization ? [[t("profile.organization"), user?.organization || t("profile.notProvided")]] : []),
    [t("profile.city"), user?.location || location],
    [t("profile.accountType"), t(`role.${user?.role}`, user?.role)],
  ];
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    values: editValues || {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      organization: user?.organization || "",
      location: user?.location || location,
    },
  });

  const saved = async () => {
    try {
      const data = await getData(api.patch("/auth/me", {
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization || "",
        location,
        locationCoordinates: preferenceCoordinates,
        locationSource: preferenceCoordinates ? "REVERSE_GEOCODED" : "MANUAL",
      }));
      applyProfile(data);
      toast.success(t("profile.success"));
    } catch (error) {
      toast.error(apiError(error));
    }
  };
  const applyProfile = (data) => {
    setSession(data.user, data.accessToken || accessToken);
    if (data.user.location) setLocation(data.user.location);
    setPreferenceCoordinates(data.user.locationCoordinates || null);
    queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  };
  const startEditing = () => {
    setEditValues({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      organization: user?.organization || "",
      location: user?.location || location,
    });
    setDetectedCoordinates(user?.locationCoordinates || null);
    setEditing(true);
  };
  const updateProfile = async (values) => {
    try {
      const data = await getData(api.patch("/auth/me", {
        ...values,
        locationCoordinates: detectedCoordinates,
        locationSource: detectedCoordinates ? "REVERSE_GEOCODED" : "MANUAL",
      }));
      applyProfile(data);
      setEditing(false);
      setEditValues(null);
      toast.success(t("profile.updated"));
    } catch (error) {
      toast.error(apiError(error));
    }
  };
  const applyCurrentLocation = async (target) => {
    setLocating(true);
    try {
      const detected = await detectCurrentIndiaLocation();
      if (target === "profile") {
        setEditValues((current) => ({ ...current, location: detected.name }));
        setValue("location", detected.name, { shouldValidate: true, shouldDirty: true });
        setDetectedCoordinates(detected.coordinates);
      } else {
        setLocation(detected.name);
        setPreferenceCoordinates(detected.coordinates);
      }
      toast.success(`Current location detected: ${detected.name}`, {
        description: detected.approximate ? "Nearest India-wide reference area selected; you can edit it." : "Resolved from your current GPS position.",
      });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLocating(false);
    }
  };
  const uploadProfileImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return toast.error(t("profile.photoType"));
    if (file.size > 5 * 1024 * 1024)
      return toast.error(t("profile.photoSize"));
    const body = new FormData();
    body.append("image", file);
    setUploading(true);
    try {
      const data = await getData(api.post("/auth/me/avatar", body));
      applyProfile(data);
      toast.success(t("profile.photoUpdated"));
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setUploading(false);
    }
  };
  const removeProfileImage = async () => {
    setRemoving(true);
    try {
      const data = await getData(api.delete("/auth/me/avatar"));
      applyProfile(data);
      toast.success(t("profile.photoRemoved"));
    } catch (error) {
      toast.error(apiError(error));
    } finally {
      setRemoving(false);
    }
  };
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /** The local session must still be cleared if the API is unavailable. */
    }
    queryClient.clear();
    clearSession();
    navigate("/", { replace: true });
  };

  return (
    <div className="container-page max-w-6xl py-10">
      <PageHeader
        eyebrow={t("profile.eyebrow")}
        title={t("profile.title")}
        description={t("profile.description")}
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className="card p-6 text-center">
            <div className="relative mx-auto w-fit">
              <UserAvatar user={user} className="h-24 w-24 rounded-3xl text-2xl" />
              <button
                type="button"
                className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-forest-700 text-white shadow-md hover:bg-forest-800"
                onClick={() => fileInput.current?.click()}
                aria-label={t("profile.uploadPhoto")}
                disabled={uploading}
              >
                {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={uploadProfileImage}
                aria-label={t("profile.uploadPhoto")}
              />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold">{user?.name}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t(`role.${user?.role}`, user?.role)}
            </p>
            {user?.verified && (
              <div className="mt-3"><VerifiedBadge /></div>
            )}
            <p className="mx-auto mt-4 max-w-52 text-xs leading-5 text-gray-500">
              {t("profile.photoHint")}
            </p>
            {user?.profileImage && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                onClick={removeProfileImage}
                disabled={removing}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {removing ? t("profile.removingPhoto") : t("profile.removePhoto")}
              </button>
            )}
            <div className="mt-6 grid gap-2">
              {shoppingEnabled && <Link to="/marketplace" className="btn-primary w-full">
                <ShoppingBasket className="h-4 w-4" /> {t("profile.buy")}
              </Link>}
              {producer && (
                <Link to="/seller/dashboard" className="btn-secondary w-full">
                  <Tractor className="h-4 w-4" /> {t("profile.sell")}
                </Link>
              )}
              {!producer && user?.role !== "consumer" && (
                <Link to={workspaceForRole(user?.role)} className="btn-secondary w-full">
                  <UserRound className="h-4 w-4" /> {t("profile.workspace")}
                </Link>
              )}
              {shoppingEnabled && <Link to="/saved" className="btn-ghost w-full">
                <Heart className="h-4 w-4" />
                {t("profile.saved", { count: savedProducts.length })}
              </Link>}
              <button type="button" className="btn-ghost w-full text-red-600" onClick={logout}>
                <LogOut className="h-4 w-4" /> {t("nav.signOut")}
              </button>
            </div>
          </section>
          <section className="rounded-2xl border border-forest-200 bg-forest-50 p-5">
            <ShieldCheck className="h-5 w-5 text-forest-700" />
            <h3 className="mt-2 font-bold">Privacy & verification</h3>
            <p className="mt-2 text-xs leading-5 text-gray-600">
              Private contact details never appear on public QR traceability pages.
            </p>
          </section>
        </aside>
        <div className="space-y-6">
          <section className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold">{t("profile.details")}</h2>
              {!editing && (
                <button type="button" className="btn-secondary" onClick={startEditing}>
                  <Edit3 className="h-4 w-4" /> {t("profile.edit")}
                </button>
              )}
            </div>
            {editing ? (
              <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit(updateProfile)}>
                <FormField label={t("profile.fullName")} error={errors.name?.message} icon={UserRound}>
                  <input className="input pl-10" autoComplete="name" {...register("name")} />
                </FormField>
                <FormField label={t("profile.email")} error={errors.email?.message} icon={Mail}>
                  <input className="input pl-10" type="email" autoComplete="email" {...register("email")} />
                </FormField>
                <FormField label={t("profile.phone")} error={errors.phone?.message} icon={Phone}>
                  <input className="input pl-10" autoComplete="tel" {...register("phone")} />
                </FormField>
                {showOrganization && (
                  <FormField label={t("profile.organization")} error={errors.organization?.message} icon={Building2}>
                    <input className="input pl-10" autoComplete="organization" {...register("organization")} />
                  </FormField>
                )}
                <div>
                  <FormField label={t("profile.city")} error={errors.location?.message} icon={MapPin}>
                    <input className="input pl-10" placeholder="City, district, state" autoComplete="address-level2" {...register("location", { onChange: () => setDetectedCoordinates(null) })}/>
                  </FormField>
                  <button type="button" className="btn-secondary mt-2 w-full" disabled={locating} onClick={() => applyCurrentLocation("profile")}><LocateFixed className="h-4 w-4" />{locating ? "Detecting location…" : "Use current location"}</button>
                </div>
                <div className="flex items-end gap-2 sm:col-span-2">
                  <button className="btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <InlineLoader label={t("profile.saving")} /> : <><Save className="h-4 w-4" /> {t("profile.saveChanges")}</>}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditing(false);
                      setEditValues(null);
                    }}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" /> {t("profile.cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-cream p-4">
                    <dt className="text-xs text-gray-500">{label}</dt>
                    <dd className="mt-1 text-sm font-bold">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {!editing && (
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-forest-100 bg-forest-50 p-4 text-xs text-forest-800">
                <Check className="h-4 w-4 shrink-0" /> {t("profile.secureEdit")}
              </div>
            )}
          </section>
          <section className="card p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold">
              {t("profile.preferences")}
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <span className="label">{t("profile.language")}</span>
                <LanguageSwitcher compact={false} />
              </div>
              <div>
                <span className="label">{t("profile.location")}</span>
                <span className="relative block">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-forest-700" />
                  <input
                    className="input pl-10"
                    value={location}
                    placeholder="Any city, district or state in India"
                    onChange={(event) => { setLocation(event.target.value); setPreferenceCoordinates(null); }}
                  />
                </span>
                <button type="button" className="btn-secondary mt-2 w-full" disabled={locating} onClick={() => applyCurrentLocation("preference")}><LocateFixed className="h-4 w-4" />{locating ? "Detecting location…" : "Use current location"}</button>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              <Toggle
                checked={orderAlerts}
                onChange={(value) => setPreferences({ orderAlerts: value })}
                label={t("profile.orderAlerts")}
                icon={BellRing}
              />
              <Toggle
                checked={marketAlerts}
                onChange={(value) => setPreferences({ marketAlerts: value })}
                label={t("profile.marketAlerts")}
                icon={Radio}
              />
              <Toggle
                checked={lowBandwidth}
                onChange={(value) => setPreferences({ lowBandwidth: value })}
                label={t("profile.lowData")}
                description="Reduces animation and non-essential visual effects on slow connections."
                icon={WifiOff}
              />
            </div>
            <button className="btn-primary mt-6" onClick={saved}>
              {t("common.save")}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export function SavedProductsPage() {
  const { t } = useTranslation();
  const savedProducts = useAppStore((state) => state.savedProducts);
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow={t("nav.account")}
        title={t("nav.saved")}
        description={t("profile.saved", { count: savedProducts.length })}
      />
      {savedProducts.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {savedProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t("market.empty")}
          description="Use the heart on any product to keep it here for later."
          action={
            <Link to="/marketplace" className="btn-primary">
              {t("cart.browse")}
            </Link>
          }
        />
      )}
    </div>
  );
}

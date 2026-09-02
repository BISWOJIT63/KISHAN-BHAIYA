import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  LocateFixed,
  LockKeyhole,
  ShieldCheck,
  Tractor,
  Truck,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { api, apiError, getData } from "../api/client.js";
import Logo from "../components/Logo.jsx";
import { InlineLoader } from "../components/UI.jsx";
import { useAppStore } from "../store/useAppStore.js";
import { detectCurrentIndiaLocation } from "../utils/location.js";

const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your email or phone"),
  password: z.string().min(6, "Enter your password"),
});
const registerSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid mobile number"),
  password: z.string().min(8, "Use at least 8 characters"),
  role: z.enum([
    "consumer",
    "business_buyer",
    "farmer",
    "fpo_manager",
    "driver",
    "logistics_partner",
  ]),
  organization: z.string().max(120).optional(),
  location: z.string().min(2, "Choose your district"),
  preferredLanguage: z.enum(["en", "hi", "or"]),
});
const demos = [
  ["auth.individual", "consumer@kishanbhaiya.demo", UsersRound],
  ["auth.business", "buyer@kishanbhaiya.demo", ShieldCheck],
  ["auth.farmer", "farmer@kishanbhaiya.demo", Tractor],
  ["auth.fpo", "fpo@kishanbhaiya.demo", Leaf],
  ["auth.driver", "driver.active@kishanbhaiya.demo", Truck],
  ["auth.fleet", "fleet@kishanbhaiya.demo", Warehouse],
];
const roles = [
  ["consumer", "auth.individual"],
  ["business_buyer", "auth.business"],
  ["farmer", "auth.farmer"],
  ["fpo_manager", "auth.fpo"],
  ["driver", "auth.driver"],
  ["logistics_partner", "auth.fleet"],
];

function Field({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...props} />
      {error && (
        <span className="mt-1.5 block text-xs font-medium text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

export function LoginPage() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const setSession = useAppStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "buyer@kishanbhaiya.demo",
      password: "KishanBhaiya@2026",
    },
  });
  const submit = async (values) => {
    try {
      const data = await getData(api.post("/auth/login", values));
      queryClient.clear();
      setSession(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}`);
      const status =
        data.user.accountStatus ||
        (data.user.verified ? "ACTIVE" : "PENDING_ADMIN_APPROVAL");
      const fallback =
        status !== "ACTIVE" && data.user.role !== "admin"
          ? "/verification"
          : ["farmer", "fpo_manager"].includes(data.user.role)
            ? "/seller/dashboard"
            : ["driver", "logistics_partner", "logistics"].includes(
                  data.user.role,
                )
              ? "/logistics/planner"
              : data.user.role === "admin"
                ? "/admin"
                : data.user.role === "business_buyer"
                  ? "/bulk"
                  : "/marketplace";
      navigate(
        fallback === "/verification"
          ? fallback
          : location.state?.from || fallback,
        { replace: true },
      );
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  return (
    <AuthShell title={t("auth.welcome")} subtitle={t("auth.welcomeSub")}>
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <Field
          label={t("auth.emailPhone")}
          placeholder="you@example.com"
          autoComplete="username"
          {...register("identifier")}
          error={errors.identifier?.message}
        />
        <label className="block">
          <span className="label">{t("auth.password")}</span>
          <div className="relative">
            <input
              className="input pr-12"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1 grid h-10 w-10 place-items-center text-gray-400"
              aria-label="Show password"
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <span className="mt-1.5 block text-xs font-medium text-red-600">
              {errors.password.message}
            </span>
          )}
        </label>
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              defaultChecked
              className="accent-forest-700"
            />
            {t("auth.remember")}
          </label>
          <button type="button" className="font-bold text-forest-700">
            {t("auth.forgot")}
          </button>
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <InlineLoader label={t("auth.signing")} />
          ) : (
            <>
              {t("auth.login")} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-widest text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        {t("auth.demos")}
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {demos.map(([label, email, Icon]) => (
          <button
            key={email}
            type="button"
            className="rounded-xl border border-gray-200 p-3 text-left hover:border-forest-300 hover:bg-forest-50"
            onClick={() => {
              setValue("identifier", email);
              setValue("password", "KishanBhaiya@2026");
            }}
          >
            <Icon className="h-4 w-4 text-forest-700" />
            <span className="mt-2 block text-xs font-bold">{t(label)}</span>
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-gray-500">
        {t("auth.new")}{" "}
        <Link to="/register" className="font-bold text-forest-700">
          {t("auth.create")}
        </Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAppStore((state) => state.setSession);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const [detectedCoordinates, setDetectedCoordinates] = useState(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "consumer",
      location: "",
      preferredLanguage: "en",
      organization: "",
    },
  });
  const role = watch("role");
  const applyCurrentLocation = async () => {
    setLocating(true);
    setLocationStatus("");
    try {
      const detected = await detectCurrentIndiaLocation();
      setValue("location", detected.name, { shouldValidate: true });
      setDetectedCoordinates(detected.coordinates);
      setLocationStatus(
        `GPS location detected: ${detected.name}${detected.approximate ? " (approximate area)" : ""}.`,
      );
    } catch (error) {
      setLocationStatus(error.message);
      toast.error(error.message);
    } finally {
      setLocating(false);
    }
  };
  const submit = async (values) => {
    try {
      const data = await getData(
        api.post("/auth/register", {
          ...values,
          locationCoordinates: detectedCoordinates || undefined,
          locationSource: detectedCoordinates ? "REVERSE_GEOCODED" : "MANUAL",
        }),
      );
      queryClient.clear();
      setSession(data.user, data.accessToken);
      const pending = data.user.accountStatus !== "ACTIVE";
      toast.success(
        pending
          ? "Account created — verification review is next"
          : "Your KisanExpress account is ready",
      );
      navigate(
        pending
          ? "/verification"
          : data.user.role === "business_buyer"
            ? "/bulk"
            : "/marketplace",
      );
    } catch (error) {
      toast.error(apiError(error));
    }
  };

  return (
    <AuthShell title={t("auth.joinTitle")} subtitle={t("auth.joinSub")}>
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <div>
          <span className="label">{t("auth.joinAs")}</span>
          <div className="grid grid-cols-2 gap-2">
            {roles.map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-xl border p-3 text-xs font-bold ${role === value ? "border-forest-600 bg-forest-50 text-forest-800" : "border-gray-200 text-gray-600"}`}
              >
                <input
                  type="radio"
                  value={value}
                  className="sr-only"
                  {...register("role")}
                />
                {t(label)}
              </label>
            ))}
          </div>
        </div>
        <Field
          label={t("auth.name")}
          placeholder="Your name"
          {...register("name")}
          error={errors.name?.message}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("auth.email")}
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            error={errors.email?.message}
          />
          <Field
            label={t("auth.mobile")}
            placeholder="98765 43210"
            {...register("phone")}
            error={errors.phone?.message}
          />
        </div>
        {role !== "consumer" && (
          <Field
            label="Organization, farm or fleet name"
            placeholder="Optional display name"
            {...register("organization")}
            error={errors.organization?.message}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label>
              <span className="label">
                City, district or state anywhere in India
              </span>
              <input
                className="input"
                placeholder="For example: Bengaluru, Karnataka"
                autoComplete="address-level2"
                {...register("location", {
                  onChange: () => {
                    setLocationStatus("");
                    setDetectedCoordinates(null);
                  },
                })}
              />
            </label>
            <button
              type="button"
              className="btn-secondary mt-2 w-full"
              onClick={applyCurrentLocation}
              disabled={locating}
            >
              <LocateFixed className="h-4 w-4" />
              {locating ? "Detecting location…" : "Use current location"}
            </button>
            {locationStatus && (
              <p
                className={`mt-2 text-xs leading-5 ${locationStatus.startsWith("GPS") ? "text-forest-700" : "text-red-600"}`}
              >
                {locationStatus}
              </p>
            )}
            {errors.location && (
              <span className="mt-1.5 block text-xs font-medium text-red-600">
                {errors.location.message}
              </span>
            )}
          </div>
          <label>
            <span className="label">Preferred language</span>
            <select className="input" {...register("preferredLanguage")}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="or">ଓଡ଼ିଆ</option>
            </select>
          </label>
        </div>
        <Field
          label={t("auth.createPassword")}
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          {...register("password")}
          error={errors.password?.message}
        />
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <InlineLoader label={t("auth.creating")} />
          ) : (
            <>
              {t("auth.create")} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
        <p className="text-center text-[11px] leading-5 text-gray-500">
          Consumers activate after basic contact checks. Business, grower and
          logistics accounts enter the administrator verification queue before
          operational access.
        </p>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500">
        {t("auth.already")}{" "}
        <Link to="/login" className="font-bold text-forest-700">
          {t("nav.login")}
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen bg-cream">
      <div className="grid min-h-screen lg:grid-cols-[1fr_520px]">
        <aside className="relative hidden overflow-hidden bg-forest-950 lg:block">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=85"
            alt="Green agricultural fields"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/35 to-transparent" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <Logo light />
            <div>
              <p className="eyebrow text-lime-300">From field to opportunity</p>
              <blockquote className="mt-4 max-w-xl font-display text-4xl font-bold leading-tight text-white">
                Better market access begins with a clear, trusted connection.
              </blockquote>
              <div className="mt-8 flex gap-6 text-sm text-white/70">
                <span>15+ active crops</span>
                <span>8 verified producers</span>
                <span>3 collection hubs</span>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex min-h-screen items-center justify-center p-5 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Logo />
            </div>
            <div className="mb-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-forest-100 text-forest-800">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h1 className="page-title">{title}</h1>
              <p className="mt-2 text-gray-500">{subtitle}</p>
            </div>
            <div className="card p-6 sm:p-7">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

import axios from "axios";
import { useAppStore } from "../store/useAppStore.js";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true,
  timeout: 20_000,
});

let refreshPromise = null;

const responseData = (response) => {
  const payload = response?.data;
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.success !== true ||
    !Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    const contentType = String(response?.headers?.["content-type"] || "");
    const receivedHtml =
      contentType.includes("text/html") ||
      (typeof payload === "string" && /<html|<!doctype/i.test(payload));
    throw new Error(
      receivedHtml
        ? "The frontend is not connected to the API. Set VITE_API_URL to the backend /api/v1 URL in Vercel and redeploy."
        : "The server returned an unexpected response. Please try again.",
    );
  }
  return payload.data;
};

api.interceptors.request.use((config) => {
  const token = useAppStore.getState().accessToken;
  if (token && !config.skipAccessToken) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRequest = String(original?.url || "").includes("/auth/");

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      (!isAuthRequest || original.allowAuthRefresh)
    ) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh", undefined, {
              skipAccessToken: true,
              skipAuthRefresh: true,
            })
            .then(responseData)
            .then((session) => {
              useAppStore
                .getState()
                .setSession(session.user, session.accessToken);
              return session.accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const accessToken = await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        if ([401, 403].includes(refreshError.response?.status)) useAppStore.getState().clearSession();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && !isAuthRequest) {
      useAppStore.getState().clearSession();
    }

    return Promise.reject(error);
  },
);

export const getData = (promise) => promise.then(responseData);

export const apiError = (error) => {
  const details = error?.response?.data?.error?.details;
  const fieldErrors = details?.fieldErrors || {};
  const firstFieldError = Object.values(fieldErrors)
    .flat()
    .find(Boolean);
  return (
    firstFieldError ||
    error?.response?.data?.error?.message ||
    error?.message ||
    "Something went wrong"
  );
};

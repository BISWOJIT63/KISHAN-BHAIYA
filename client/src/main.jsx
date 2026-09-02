import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "leaflet/dist/leaflet.css";
import "./styles/index.css";
import "./i18n/index.js";
import App from "./App.jsx";
import RealtimeBridge from "./components/RealtimeBridge.jsx";
import AppToaster from "./components/AppToaster.jsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RealtimeBridge />
        <App />
      </BrowserRouter>
      <AppToaster />
    </QueryClientProvider>
  </React.StrictMode>,
);

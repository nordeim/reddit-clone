import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { createApiClient } from "./lib/api";

// Wire the AuthProvider to the real api client. The factory receives
// the auth options (getToken, tryRefreshOn401, onTokenRefresh) from
// the AuthProvider and forwards them to createApiClient. This is the
// production wiring — tests inject a stub factory directly.
//
// Round 6, B18.4.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider apiClientFactory={(opts) => createApiClient(opts)}>
      <App />
    </AuthProvider>
  </StrictMode>
);

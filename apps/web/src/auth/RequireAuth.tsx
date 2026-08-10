import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

/**
 * RequireAuth (Round 7, B18.8) — route guard for protected pages.
 *
 * Wraps protected route content. When the user is not authenticated,
 * redirects to `/login` with `state: { from: location }` so the
 * LoginPage can redirect back after a successful login.
 *
 * Usage (in App.tsx):
 *   <Route
 *     path="/notifications"
 *     element={
 *       <RequireAuth>
 *         <NotificationsPage />
 *       </RequireAuth>
 *     }
 *   />
 *
 * Or with nested routes (renders <Outlet />):
 *   <Route element={<RequireAuth />}>
 *     <Route path="/notifications" element={<NotificationsPage />} />
 *     <Route path="/settings" element={<SettingsPage />} />
 *   </Route>
 *
 * Behavior:
 *   - status === "authenticated" → render children (or <Outlet /> if no
 *     children). The protected content is shown.
 *   - status === "anonymous" → redirect to /login with the current
 *     location in state. The protected content is NOT rendered.
 *   - status === "loading" → render null. This is a brief window during
 *     login submission; rendering null avoids a flash of the login page
 *     before the authenticated state settles. If login fails, status
 *     reverts to "anonymous" and the redirect fires.
 *
 * @packageDocumentation
 */

export interface RequireAuthProps {
  /** The protected content. If omitted, renders <Outlet /> for nested routes. */
  children?: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps): ReactNode {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    // Brief window during login submission — render nothing to avoid
    // a flash of the login page before the authenticated state settles.
    return null;
  }

  if (auth.status !== "authenticated") {
    // Redirect to /login, preserving the intended destination so the
    // LoginPage can redirect back after a successful login.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Authenticated — render the protected content.
  return children ?? null;
}

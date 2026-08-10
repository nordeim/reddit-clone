import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  AuthProvider,
  useAuth,
  type AuthApiClient,
  type AuthApiClientOptions,
  type AuthUser,
} from "../../auth/AuthProvider";
import { Navbar } from "./Navbar";

/**
 * TDD test suite for the auth-aware Navbar (Round 7, B18.7).
 *
 * The Navbar previously imported the hardcoded `CURRENT_USER` from
 * `data/users.ts` and rendered a cosmetic "Log out (demo)" button. Round 7
 * replaces that with `useAuth()`:
 *   - When anonymous: shows "Log in" + "Sign up" links.
 *   - When authenticated: shows the user's avatar + username + karma in
 *     the account dropdown, and the "Log out" item calls `auth.logout()`.
 *
 * The Navbar has many sub-components (SearchBar, CreatePostModal,
 * NotificationsPanel) that still use the deterministic data layer — those
 * are out of scope for this slice. The tests focus on the auth-aware
 * parts (the account dropdown / login links).
 */

function makeUser(username: string, karma = 42): AuthUser {
  return {
    id: `u-${username}`,
    username,
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    bio: "",
    karma,
    createdAt: "2026-01-01T00:00:00.000Z",
    colorFrom: "#ff6600",
    colorTo: "#ff9900",
  };
}

function makeStubClient(overrides: Partial<AuthApiClient> = {}): AuthApiClient & {
  calls: {
    login: Array<[string, string]>;
    logout: number;
    register: Array<[string, string, string | undefined]>;
  };
} {
  const calls = {
    login: [] as Array<[string, string]>,
    logout: 0,
    register: [] as Array<[string, string, string | undefined]>,
  };
  return {
    login:
      overrides.login ??
      (async (username: string, password: string) => {
        calls.login.push([username, password]);
        return { accessToken: "tok-stub", user: makeUser(username) };
      }),
    register:
      overrides.register ??
      (async (username: string, password: string, displayName?: string) => {
        calls.register.push([username, password, displayName]);
        return { user: makeUser(username) };
      }),
    logout:
      overrides.logout ??
      (async () => {
        calls.logout += 1;
      }),
    calls,
  };
}

function renderNavbar(opts: { stubClient: AuthApiClient }) {
  const factory = (o: AuthApiClientOptions): AuthApiClient => {
    void o;
    return opts.stubClient;
  };
  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <AuthProvider apiClientFactory={factory}>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    );
  }
  return render(
    <Shell>
      <Navbar onMenuClick={() => {}} />
    </Shell>
  );
}

describe("Navbar — auth-aware (Slice 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("anonymous state", () => {
    it("shows a 'Log in' link pointing to /login", () => {
      const stub = makeStubClient();
      renderNavbar({ stubClient: stub });
      const loginLink = screen.getByRole("link", { name: /^log in$/i });
      expect(loginLink).toHaveAttribute("href", "/login");
    });

    it("shows a 'Sign up' link pointing to /register", () => {
      const stub = makeStubClient();
      renderNavbar({ stubClient: stub });
      const signupLink = screen.getByRole("link", { name: /^sign up$/i });
      expect(signupLink).toHaveAttribute("href", "/register");
    });

    it("does NOT show the account dropdown trigger (avatar button) when anonymous", () => {
      const stub = makeStubClient();
      renderNavbar({ stubClient: stub });
      expect(screen.queryByLabelText(/account menu/i)).not.toBeInTheDocument();
    });
  });

  describe("authenticated state", () => {
    async function loginAs(stub: AuthApiClient, username: string) {
      // We need to call login through the AuthProvider. Render once, then
      // use the useAuth() capture pattern to invoke login.
      const captured: { current: ReturnType<typeof useAuth> | null } = {
        current: null,
      };
      function Captor() {
        captured.current = useAuth();
        return null;
      }
      const factory = (o: AuthApiClientOptions): AuthApiClient => {
        void o;
        return stub;
      };
      function Shell() {
        return (
          <AuthProvider apiClientFactory={factory}>
            <MemoryRouter>
              <Captor />
              <Navbar onMenuClick={() => {}} />
            </MemoryRouter>
          </AuthProvider>
        );
      }
      const utils = render(<Shell />);
      // Use act via the userEvent setup — the login is a user action in
      // production, but here we call it directly.
      const { act } = await import("@testing-library/react");
      await act(async () => {
        await captured.current!.login(username, "password");
      });
      return utils;
    }

    it("shows the account dropdown trigger (avatar button) when authenticated", async () => {
      const stub = makeStubClient();
      await loginAs(stub, "alice");
      expect(screen.getByLabelText(/account menu/i)).toBeInTheDocument();
    });

    it("does NOT show 'Log in' / 'Sign up' links when authenticated", async () => {
      const stub = makeStubClient();
      await loginAs(stub, "alice");
      expect(screen.queryByRole("link", { name: /^log in$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /^sign up$/i })).not.toBeInTheDocument();
    });

    it("shows the user's username in the account dropdown header", async () => {
      const stub = makeStubClient();
      await loginAs(stub, "alice");
      // Open the dropdown
      const user = userEvent.setup();
      await user.click(screen.getByLabelText(/account menu/i));
      expect(screen.getByText(/u\/alice/i)).toBeInTheDocument();
    });

    it("shows the user's karma in the account dropdown header", async () => {
      const stub = makeStubClient({
        login: async (username: string) => ({
          accessToken: "tok",
          user: makeUser(username, 1234),
        }),
      });
      await loginAs(stub, "alice");
      const user = userEvent.setup();
      await user.click(screen.getByLabelText(/account menu/i));
      expect(screen.getByText(/1,234 karma/i)).toBeInTheDocument();
    });

    it("clicking 'Log out' calls auth.logout() and the navbar reverts to anonymous", async () => {
      const stub = makeStubClient();
      await loginAs(stub, "alice");
      const user = userEvent.setup();
      // Open dropdown
      await user.click(screen.getByLabelText(/account menu/i));
      // Click "Log out" (DropdownItem has role="menuitem")
      await user.click(screen.getByRole("menuitem", { name: /log out/i }));
      // Wait for the anonymous state to render
      await waitFor(() => {
        expect(screen.getByRole("link", { name: /^log in$/i })).toBeInTheDocument();
      });
      expect(stub.calls.logout).toBe(1);
    });
  });
});

/**
 * Round 10 BUG-R10-4 — mobile horizontal overflow.
 *
 * The Navbar's search-bar wrapper lacked `min-w-0`, so on a 375px
 * viewport the SearchBar's <input> (intrinsic min ~200px) prevented
 * the flex item from shrinking, pushing the right-side
 * `Create + Log in + Sign up` cluster past the viewport (37px overflow).
 *
 * The fix: add `min-w-0` to the wrapper so flexbox can shrink it below
 * the input's intrinsic size.
 */
describe("Navbar — mobile overflow fix (BUG-R10-4)", () => {
  it("the SearchBar wrapper has `min-w-0` so flex can shrink it on mobile", () => {
    const stub = makeStubClient();
    renderNavbar({ stubClient: stub });
    // The SearchBar wrapper is a <div> with classes that include
    // "mx-auto w-full max-w-xl flex-1". After the fix, it must also
    // include "min-w-0".
    const searchBarWrapper = document.querySelector("header > div.mx-auto.w-full.max-w-xl");
    expect(searchBarWrapper, "SearchBar wrapper div must exist").not.toBeNull();
    expect(searchBarWrapper?.className, "must contain min-w-0").toContain("min-w-0");
  });
});

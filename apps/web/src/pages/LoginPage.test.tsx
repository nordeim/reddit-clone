import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth, type AuthApiClient, type AuthApiClientOptions, type AuthUser } from "../auth/AuthProvider";
import { LoginPage } from "./LoginPage";

/**
 * TDD test suite for the LoginPage (Round 6, B18.4).
 *
 * The page renders a username/password form, calls useAuth().login on
 * submit, shows loading + error states, and navigates to "/" on
 * success. Tests use MemoryRouter + a capturing AuthProvider so the
 * tests can assert the login call without hitting the network.
 */

function makeUser(username: string): AuthUser {
  return {
    id: `u-${username}`,
    username,
    displayName: username,
    bio: "",
    karma: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    colorFrom: "#ff6600",
    colorTo: "#ff9900",
  };
}

function makeStubClient(overrides: Partial<AuthApiClient> = {}): AuthApiClient & {
  calls: { login: Array<[string, string]> };
} {
  const calls = { login: [] as Array<[string, string]> };
  return {
    login:
      overrides.login ??
      (async (username: string, password: string) => {
        calls.login.push([username, password]);
        return {
          accessToken: "tok-stub",
          user: makeUser(username),
        };
      }),
    register: async () => ({ user: makeUser("new") }),
    logout:
      overrides.logout ??
      (async () => {
        // no-op
      }),
    calls,
  };
}

function renderLogin(opts: {
  stubClient: AuthApiClient;
  initialEntries?: Array<string | { pathname: string; state?: { from?: string } }>;
  onLogin?: () => void;
}) {
  const factory = (o: AuthApiClientOptions): AuthApiClient => {
    // Touch opts to satisfy lint; the test doesn't assert on them here.
    void o;
    return opts.stubClient;
  };

  function Shell() {
    return (
      <AuthProvider apiClientFactory={factory}>
        <MemoryRouter initialEntries={opts.initialEntries ?? ["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div data-testid="home">home-page</div>} />
            <Route
              path="/notifications"
              element={<div data-testid="notifications">notifications-page</div>}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
  }
  return render(<Shell />);
}

describe("LoginPage (Slice 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the username + password form", () => {
    const stub = makeStubClient();
    renderLogin({ stubClient: stub });
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in|sign in|submit/i })).toBeInTheDocument();
  });

  it("submitting the form calls useAuth().login with the entered credentials", async () => {
    const stub = makeStubClient();
    renderLogin({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "you");
    await user.type(screen.getByLabelText(/password/i), "embers-demo");
    await user.click(screen.getByRole("button", { name: /log in|sign in|submit/i }));

    await waitFor(() => {
      expect(stub.calls.login).toEqual([["you", "embers-demo"]]);
    });
  });

  it("disables the submit button and shows a loading state while submitting", async () => {
    let resolveLogin!: (value: { accessToken: string; user: AuthUser }) => void;
    const stub = makeStubClient({
      login: () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    });
    renderLogin({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "you");
    await user.type(screen.getByLabelText(/password/i), "embers-demo");
    await user.click(screen.getByRole("button", { name: /log in|sign in|submit/i }));

    // While the login is in flight, the button should be disabled.
    await waitFor(() => {
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
    });

    // Cleanup: resolve so the test doesn't hang. Wrap in act() so React
    // flushes the resulting AuthProvider state update (status: authenticated)
    // before the test unmounts — otherwise React emits
    // "An update to AuthProvider inside a test was not wrapped in act(...)".
    await act(async () => {
      resolveLogin({
        accessToken: "tok",
        user: makeUser("you"),
      });
      // Yield a microtask so the resolved promise's .then chain runs
      // inside the act() callback.
      await Promise.resolve();
    });
  });

  it("renders an error alert when login rejects", async () => {
    const stub = makeStubClient({
      login: async () => {
        throw new Error("invalid credentials");
      },
    });
    renderLogin({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "you");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in|sign in|submit/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid credentials/i);
    });
  });

  it("navigates to / on successful login", async () => {
    const stub = makeStubClient();
    renderLogin({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "you");
    await user.type(screen.getByLabelText(/password/i), "embers-demo");
    await user.click(screen.getByRole("button", { name: /log in|sign in|submit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeInTheDocument();
    });
  });

  it("redirects back to location.state.from after a successful login (Round 16)", async () => {
    // RequireAuth preserves the intended destination as state.from.
    // Until Round 15 LoginPage always navigated to "/" and dropped it.
    const stub = makeStubClient();
    renderLogin({
      stubClient: stub,
      initialEntries: [{ pathname: "/login", state: { from: "/notifications" } }],
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "you");
    await user.type(screen.getByLabelText(/password/i), "embers-demo");
    await user.click(screen.getByRole("button", { name: /log in|sign in|submit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("notifications")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
  });

  it("ignores an open-redirect attempt in state.from and falls back to /", async () => {
    const stub = makeStubClient();
    renderLogin({
      stubClient: stub,
      initialEntries: [{ pathname: "/login", state: { from: "https://evil.example/phish" } }],
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "you");
    await user.type(screen.getByLabelText(/password/i), "embers-demo");
    await user.click(screen.getByRole("button", { name: /log in|sign in|submit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeInTheDocument();
    });
  });

  it("links to /register so new users can find the sign-up form (Round 16)", () => {
    const stub = makeStubClient();
    renderLogin({ stubClient: stub });
    const link = screen.getByRole("link", { name: /sign up|create (an )?account|register/i });
    expect(link).toHaveAttribute("href", "/register");
  });

  it("does not submit when the form is empty (HTML5 validation catches it)", async () => {
    const stub = makeStubClient();
    renderLogin({ stubClient: stub });

    const user = userEvent.setup();
    // Click without filling — the form should not call login because
    // the required attributes block submission at the browser level.
    // jsdom doesn't actually enforce required validation, so we test
    // the explicit disabled-state-on-empty logic instead.
    const submitButton = screen.getByRole("button", { name: /log in|sign in|submit/i });
    await user.click(submitButton);
    // Give any pending microtasks a chance to settle.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(stub.calls.login).toHaveLength(0);
  });

  it("clears the error when the user starts a new submission", async () => {
    const stub = makeStubClient({
      login: async () => {
        throw new Error("first error");
      },
    });
    renderLogin({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "you");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /log in|sign in|submit/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/first error/i);
    });

    // Switch the stub to success.
    stub.login = async (username: string, password: string) => {
      stub.calls.login.push([username, password]);
      return {
        accessToken: "tok",
        user: makeUser("you"),
      };
    };

    await user.click(screen.getByRole("button", { name: /log in|sign in|submit/i }));
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("the form inputs are labelled for accessibility (WCAG 2.2 AA)", () => {
    const stub = makeStubClient();
    renderLogin({ stubClient: stub });
    // Each input must have a programmatically associated label.
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(usernameInput).toHaveAttribute("id");
    expect(passwordInput).toHaveAttribute("id");
    expect(document.querySelector(`label[for="${usernameInput.id}"]`)).not.toBeNull();
    expect(document.querySelector(`label[for="${passwordInput.id}"]`)).not.toBeNull();
  });

  it("the password input has type=password (masks input)", () => {
    const stub = makeStubClient();
    renderLogin({ stubClient: stub });
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password");
  });
});

// Capture useAuth in a sibling test to verify the page actually consumes
// the auth context — guards against future refactors that bypass it.
describe("LoginPage — auth context consumption (Slice 6)", () => {
  it("LoginPage calls useAuth() — the page cannot render outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      return (
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      );
    }
    expect(() => render(<Orphan />)).toThrow(/useAuth.*AuthProvider/i);
    spy.mockRestore();
    void useAuth; // silence unused import
  });
});

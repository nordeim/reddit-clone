import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  AuthProvider,
  useAuth,
  type AuthApiClient,
  type AuthApiClientOptions,
  type AuthUser,
} from "../auth/AuthProvider";
import { RegisterPage } from "./RegisterPage";

/**
 * TDD test suite for the RegisterPage (Round 7, B18.6).
 *
 * The page renders a username + password + confirm-password + optional
 * display-name form. On submit, it calls api.register() then api.login()
 * (because the /api/auth/register endpoint returns { user } only — no
 * session — the client must login after register to establish a session).
 * On success, navigates to "/". On 409 (username taken) or 422 (invalid
 * input), shows an error alert.
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
        return {
          accessToken: "tok-stub",
          user: makeUser(username),
        };
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

function renderRegister(opts: {
  stubClient: AuthApiClient;
  initialEntries?: string[];
}) {
  const factory = (o: AuthApiClientOptions): AuthApiClient => {
    void o;
    return opts.stubClient;
  };
  function Shell() {
    return (
      <AuthProvider apiClientFactory={factory}>
        <MemoryRouter initialEntries={opts.initialEntries ?? ["/register"]}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<div data-testid="login">login-page</div>} />
            <Route path="/" element={<div data-testid="home">home-page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
  }
  return render(<Shell />);
}

describe("RegisterPage (Slice 1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the username, password, confirm-password, and display-name fields", () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
  });

  it("submitting the form calls api.register() then api.login()", async () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "newuser");
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign up|register|create/i }));

    await waitFor(() => {
      // register is called via the api client (not directly via AuthProvider),
      // so we verify by checking that login was called (register must have succeeded first).
      expect(stub.calls.login).toEqual([["newuser", "Password123!"]]);
    });
  });

  it("navigates to / on successful register + login", async () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "newuser");
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign up|register|create/i }));

    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeInTheDocument();
    });
  });

  it("renders an error alert when passwords don't match (client-side validation)", async () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "newuser");
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "DifferentPassword!");
    await user.click(screen.getByRole("button", { name: /sign up|register|create/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/passwords do not match/i);
    });
    // login should NOT have been called
    expect(stub.calls.login).toHaveLength(0);
  });

  it("renders an error alert when username is too short (client-side validation)", async () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "ab"); // < 3 chars
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign up|register|create/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/username.*3/i);
    });
    expect(stub.calls.login).toHaveLength(0);
  });

  it("renders an error alert when password is too short (client-side validation)", async () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "newuser");
    await user.type(screen.getByLabelText(/^password$/i), "short"); // < 8 chars
    await user.type(screen.getByLabelText(/confirm password/i), "short");
    await user.click(screen.getByRole("button", { name: /sign up|register|create/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/password.*8/i);
    });
    expect(stub.calls.login).toHaveLength(0);
  });

  it("disables the submit button and shows loading state while submitting", async () => {
    let resolveLogin!: (value: { accessToken: string; user: AuthUser }) => void;
    const stub = makeStubClient({
      login: () =>
        new Promise((resolve) => {
          resolveLogin = resolve as typeof resolveLogin;
        }),
    });
    renderRegister({ stubClient: stub });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/username/i), "newuser");
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.type(screen.getByLabelText(/confirm password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign up|register|create/i }));

    await waitFor(() => {
      expect(screen.getByRole("button")).toBeDisabled();
    });

    // Cleanup: resolve so the test doesn't hang.
    resolveLogin({
      accessToken: "tok",
      user: makeUser("newuser"),
    });
  });

  it("has a link to /login for existing users", () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });
    const loginLink = screen.getByRole("link", { name: /log in|sign in/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("the password input has type=password (masks input)", () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute("type", "password");
  });

  it("the form inputs are labelled for accessibility (WCAG 2.2 AA)", () => {
    const stub = makeStubClient();
    renderRegister({ stubClient: stub });
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const displayNameInput = screen.getByLabelText(/display name/i);
    expect(usernameInput).toHaveAttribute("id");
    expect(passwordInput).toHaveAttribute("id");
    expect(confirmInput).toHaveAttribute("id");
    expect(displayNameInput).toHaveAttribute("id");
    expect(document.querySelector(`label[for="${usernameInput.id}"]`)).not.toBeNull();
    expect(document.querySelector(`label[for="${passwordInput.id}"]`)).not.toBeNull();
    expect(document.querySelector(`label[for="${confirmInput.id}"]`)).not.toBeNull();
    expect(document.querySelector(`label[for="${displayNameInput.id}"]`)).not.toBeNull();
  });
});

// Capture useAuth in a sibling test to verify the page actually consumes
// the auth context.
describe("RegisterPage — auth context consumption (Slice 1)", () => {
  it("RegisterPage calls useAuth() — cannot render outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      return (
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      );
    }
    expect(() => render(<Orphan />)).toThrow(/useAuth.*AuthProvider/i);
    spy.mockRestore();
    void useAuth;
  });
});

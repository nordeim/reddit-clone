import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth, type AuthUser } from "./AuthProvider";

/**
 * TDD test suite for the AuthProvider (Round 6, B18).
 *
 * The AuthProvider is the React context that holds the access token in
 * memory, exposes `useAuth()` returning `{ user, status, error, login,
 * logout }`, and wires the Round 5 `apps/web/src/lib/api.ts` client into
 * the React tree.
 *
 * Slice 1 covers only the initial state — login/logout are stubs that
 * reject with "not implemented" so the test surface stays minimal. Later
 * slices will replace the stubs with real implementations.
 */

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="user">{auth.user ? auth.user.username : "null"}</span>
      <span data-testid="error">{auth.error ? auth.error : "null"}</span>
    </div>
  );
}

/** Capture the latest `useAuth()` value into a ref-like outer variable. */
function captureAuth() {
  const captured: { current: ReturnType<typeof useAuth> | null } = { current: null };
  function Captor() {
    captured.current = useAuth();
    return null;
  }
  return { captured, Captor };
}

describe("AuthProvider — initial state (Slice 1)", () => {
  it("renders children inside the provider", () => {
    render(
      <AuthProvider>
        <div>child-content</div>
      </AuthProvider>
    );
    expect(screen.getByText("child-content")).toBeInTheDocument();
  });

  it("useAuth() returns status='anonymous' before any login", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId("status").textContent).toBe("anonymous");
  });

  it("useAuth() returns user=null before any login", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("useAuth() returns error=null before any login", () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId("error").textContent).toBe("null");
  });

  it("useAuth() exposes login and logout as functions", () => {
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider>
        <Captor />
      </AuthProvider>
    );
    expect(typeof captured.current?.login).toBe("function");
    expect(typeof captured.current?.logout).toBe("function");
  });

  it("login() without apiClientFactory rejects (Slice 2 — replaced the Slice 1 'not implemented' stub)", async () => {
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider>
        <Captor />
      </AuthProvider>
    );
    await act(async () => {
      await expect(
        captured.current!.login("you", "embers-demo")
      ).rejects.toThrow(/apiClientFactory is required/i);
    });
  });

  it("logout stub rejects with 'not implemented' (Slice 1 — replaced in Slice 3)", async () => {
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider>
        <Captor />
      </AuthProvider>
    );
    await act(async () => {
      await expect(captured.current!.logout()).rejects.toThrow(
        "not implemented"
      );
    });
  });

  it("useAuth() throws when called outside the provider", () => {
    // Silence the React error-boundary log so the test output stays clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Orphan() {
      useAuth();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/useAuth.*AuthProvider/i);
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Slice 2 — login() wires to api.login()
// ---------------------------------------------------------------------------

/**
 * A minimal stub of the `ApiClient` returned by `createApiClient`.
 * Only the methods exercised by AuthProvider are implemented; the rest
 * can be added as later slices need them.
 */
interface StubApiClient {
  login: (username: string, password: string) => Promise<{
    accessToken: string;
    user: AuthUser;
  }>;
  logout: () => Promise<void>;
}

function makeStubClient(
  overrides: Partial<StubApiClient> = {}
): StubApiClient & { calls: { login: Array<[string, string]>; logout: number } } {
  const calls = { login: [] as Array<[string, string]>, logout: 0 };
  return {
    login: overrides.login ?? (async (username: string, _password: string) => {
      calls.login.push([username, _password]);
      return {
        accessToken: "tok-stub",
        user: { id: `u-${username}`, username },
      };
    }),
    logout:
      overrides.logout ??
      (async () => {
        calls.logout += 1;
      }),
    calls,
  };
}

describe("AuthProvider — login() (Slice 2)", () => {
  it("login() calls api.login(username, password) and transitions to authenticated", async () => {
    const stub = makeStubClient();
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={() => stub}>
        <Captor />
      </AuthProvider>
    );

    expect(captured.current!.status).toBe("anonymous");
    await act(async () => {
      await captured.current!.login("you", "embers-demo");
    });

    expect(stub.calls.login).toEqual([["you", "embers-demo"]]);
    await waitFor(() => {
      expect(captured.current!.status).toBe("authenticated");
    });
    expect(captured.current!.user).toEqual({
      id: "u-you",
      username: "you",
    });
    expect(captured.current!.error).toBeNull();
  });

  it("login() sets error and reverts to anonymous on failure", async () => {
    const stub = makeStubClient({
      login: async () => {
        throw new Error("invalid credentials");
      },
    });
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={() => stub}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await expect(
        captured.current!.login("you", "wrong")
      ).rejects.toThrow("invalid credentials");
    });
    await waitFor(() => {
      expect(captured.current!.status).toBe("anonymous");
    });
    expect(captured.current!.user).toBeNull();
    expect(captured.current!.error).toBe("invalid credentials");
  });

  it("login() sets status='loading' while the request is in flight", async () => {
    let resolveLogin!: (value: {
      accessToken: string;
      user: AuthUser;
    }) => void;
    const stub = makeStubClient({
      login: () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    });
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={() => stub}>
        <Captor />
      </AuthProvider>
    );

    expect(captured.current!.status).toBe("anonymous");
    let pending: Promise<void>;
    act(() => {
      pending = captured.current!.login("you", "embers-demo");
    });
    await waitFor(() => {
      expect(captured.current!.status).toBe("loading");
    });
    await act(async () => {
      resolveLogin({
        accessToken: "tok",
        user: { id: "u-you", username: "you" },
      });
      await pending!;
    });
    await waitFor(() => {
      expect(captured.current!.status).toBe("authenticated");
    });
  });

  it("login() stores the access token internally so subsequent api calls can use it (Slice 5 will exercise this)", async () => {
    const stub = makeStubClient();
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={() => stub}>
        <Captor />
      </AuthProvider>
    );
    await act(async () => {
      await captured.current!.login("you", "embers-demo");
    });
    await waitFor(() => {
      expect(captured.current!.status).toBe("authenticated");
    });
  });
});

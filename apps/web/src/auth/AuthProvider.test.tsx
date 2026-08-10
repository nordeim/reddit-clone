import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  AuthProvider,
  useAuth,
  type AuthUser,
  type AuthApiClient,
  type AuthApiClientOptions,
} from "./AuthProvider";

/**
 * TDD test suite for the AuthProvider (Round 6, B18).
 *
 * The AuthProvider is the React context that holds the access token in
 * a `useRef`, exposes `useAuth()` returning
 * `{ user, status, error, login, logout }`, and wires the Round 5
 * `apps/web/src/lib/api.ts` client into the React tree.
 *
 * The provider accepts an `apiClientFactory: (opts) => AuthApiClient`
 * prop so tests can capture the options (getToken, tryRefreshOn401,
 * onTokenRefresh) and return a stub client. Production main.tsx wires
 * the factory to `createApiClient` from `lib/api.ts`.
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

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

interface StubClient extends AuthApiClient {
  refresh: () => Promise<{ accessToken: string; user: AuthUser }>;
}

function makeStubClient(
  overrides: Partial<StubClient> = {}
): StubClient & {
  calls: {
    login: Array<[string, string]>;
    logout: number;
    refresh: number;
  };
} {
  const calls = {
    login: [] as Array<[string, string]>,
    logout: 0,
    refresh: 0,
  };
  return {
    login:
      overrides.login ??
      (async (username: string, password: string) => {
        calls.login.push([username, password]);
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
    refresh:
      overrides.refresh ??
      (async () => {
        calls.refresh += 1;
        return {
          accessToken: "tok-refreshed",
          user: { id: "u-refreshed", username: "refreshed" },
        };
      }),
    calls,
  };
}

/**
 * Factory that captures the options passed by AuthProvider and returns
 * a stub client. The captured options let the test assert wiring:
 * `getToken`, `tryRefreshOn401`, `onTokenRefresh`.
 */
function makeCapturingFactory(
  stub: ReturnType<typeof makeStubClient>
): {
  factory: (opts: AuthApiClientOptions) => AuthApiClient;
  captured: { opts: AuthApiClientOptions | null };
} {
  const captured: { opts: AuthApiClientOptions | null } = { opts: null };
  return {
    factory: (opts: AuthApiClientOptions) => {
      captured.opts = opts;
      return stub;
    },
    captured,
  };
}

// ---------------------------------------------------------------------------
// Slice 1 — initial state
// ---------------------------------------------------------------------------

describe("AuthProvider — initial state (Slice 1)", () => {
  it("renders children inside the provider", () => {
    const { factory } = makeCapturingFactory(makeStubClient());
    render(
      <AuthProvider apiClientFactory={factory}>
        <div>child-content</div>
      </AuthProvider>
    );
    expect(screen.getByText("child-content")).toBeInTheDocument();
  });

  it("useAuth() returns status='anonymous' before any login", () => {
    const { factory } = makeCapturingFactory(makeStubClient());
    render(
      <AuthProvider apiClientFactory={factory}>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId("status").textContent).toBe("anonymous");
  });

  it("useAuth() returns user=null before any login", () => {
    const { factory } = makeCapturingFactory(makeStubClient());
    render(
      <AuthProvider apiClientFactory={factory}>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("useAuth() returns error=null before any login", () => {
    const { factory } = makeCapturingFactory(makeStubClient());
    render(
      <AuthProvider apiClientFactory={factory}>
        <Probe />
      </AuthProvider>
    );
    expect(screen.getByTestId("error").textContent).toBe("null");
  });

  it("useAuth() exposes login and logout as functions", () => {
    const { factory } = makeCapturingFactory(makeStubClient());
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );
    expect(typeof captured.current?.login).toBe("function");
    expect(typeof captured.current?.logout).toBe("function");
  });

  it("useAuth() throws when called outside the provider", () => {
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

describe("AuthProvider — login() (Slice 2)", () => {
  it("login() calls api.login(username, password) and transitions to authenticated", async () => {
    const stub = makeStubClient();
    const { factory, captured } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    expect(auth.current!.status).toBe("anonymous");
    await act(async () => {
      await auth.current!.login("you", "embers-demo");
    });

    expect(stub.calls.login).toEqual([["you", "embers-demo"]]);
    await waitFor(() => {
      expect(auth.current!.status).toBe("authenticated");
    });
    expect(auth.current!.user).toEqual({
      id: "u-you",
      username: "you",
    });
    expect(auth.current!.error).toBeNull();
    // The factory was called with options (Slice 5 wiring).
    expect(captured.opts).not.toBeNull();
  });

  it("login() sets error and reverts to anonymous on failure", async () => {
    const stub = makeStubClient({
      login: async () => {
        throw new Error("invalid credentials");
      },
    });
    const { factory } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await expect(
        auth.current!.login("you", "wrong")
      ).rejects.toThrow("invalid credentials");
    });
    await waitFor(() => {
      expect(auth.current!.status).toBe("anonymous");
    });
    expect(auth.current!.user).toBeNull();
    expect(auth.current!.error).toBe("invalid credentials");
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
    const { factory } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    expect(auth.current!.status).toBe("anonymous");
    let pending: Promise<void>;
    act(() => {
      pending = auth.current!.login("you", "embers-demo");
    });
    await waitFor(() => {
      expect(auth.current!.status).toBe("loading");
    });
    await act(async () => {
      resolveLogin({
        accessToken: "tok",
        user: { id: "u-you", username: "you" },
      });
      await pending!;
    });
    await waitFor(() => {
      expect(auth.current!.status).toBe("authenticated");
    });
  });
});

// ---------------------------------------------------------------------------
// Slice 3 — logout() clears state
// ---------------------------------------------------------------------------

describe("AuthProvider — logout() (Slice 3)", () => {
  it("logout() calls api.logout() exactly once", async () => {
    const stub = makeStubClient();
    const { factory } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await auth.current!.login("you", "embers-demo");
    });
    await act(async () => {
      await auth.current!.logout();
    });
    expect(stub.calls.logout).toBe(1);
  });

  it("logout() resets user to null and status to anonymous", async () => {
    const stub = makeStubClient();
    const { factory } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await auth.current!.login("you", "embers-demo");
    });
    await waitFor(() => expect(auth.current!.status).toBe("authenticated"));

    await act(async () => {
      await auth.current!.logout();
    });
    await waitFor(() => {
      expect(auth.current!.status).toBe("anonymous");
    });
    expect(auth.current!.user).toBeNull();
  });

  it("logout() resolves even if api.logout() rejects (best-effort client-side cleanup)", async () => {
    const stub = makeStubClient({
      logout: async () => {
        throw new Error("network failure");
      },
    });
    const { factory } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await auth.current!.login("you", "embers-demo");
    });
    await act(async () => {
      await expect(auth.current!.logout()).resolves.toBeUndefined();
    });
    await waitFor(() => {
      expect(auth.current!.status).toBe("anonymous");
    });
    expect(auth.current!.user).toBeNull();
  });

  it("logout() sets error when api.logout() rejects", async () => {
    const stub = makeStubClient({
      logout: async () => {
        throw new Error("network failure");
      },
    });
    const { factory } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await auth.current!.login("you", "embers-demo");
    });
    await act(async () => {
      await auth.current!.logout();
    });
    await waitFor(() => {
      expect(auth.current!.error).toBe("network failure");
    });
  });

  it("logout() when already anonymous is a no-op (does not call api.logout)", async () => {
    const stub = makeStubClient();
    const { factory } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    expect(auth.current!.status).toBe("anonymous");
    await act(async () => {
      await auth.current!.logout();
    });
    expect(stub.calls.logout).toBe(0);
    expect(auth.current!.status).toBe("anonymous");
  });
});

// ---------------------------------------------------------------------------
// Slice 5 — Wire AuthProvider to the api client's refresh path
// ---------------------------------------------------------------------------

describe("AuthProvider — refresh path wiring (Slice 5)", () => {
  it("passes tryRefreshOn401=true to the api client factory", () => {
    const stub = makeStubClient();
    const { factory, captured } = makeCapturingFactory(stub);
    render(
      <AuthProvider apiClientFactory={factory}>
        <Probe />
      </AuthProvider>
    );
    expect(captured.opts).not.toBeNull();
    expect(captured.opts!.tryRefreshOn401).toBe(true);
  });

  it("passes a getToken accessor that returns null before login", () => {
    const stub = makeStubClient();
    const { factory, captured } = makeCapturingFactory(stub);
    render(
      <AuthProvider apiClientFactory={factory}>
        <Probe />
      </AuthProvider>
    );
    expect(captured.opts!.getToken()).toBeNull();
  });

  it("getToken returns the live access token after login", async () => {
    const stub = makeStubClient();
    const { factory, captured } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await auth.current!.login("you", "embers-demo");
    });
    expect(captured.opts!.getToken()).toBe("tok-stub");
  });

  it("getToken returns null after logout", async () => {
    const stub = makeStubClient();
    const { factory, captured } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await auth.current!.login("you", "embers-demo");
    });
    expect(captured.opts!.getToken()).toBe("tok-stub");
    await act(async () => {
      await auth.current!.logout();
    });
    expect(captured.opts!.getToken()).toBeNull();
  });

  it("onTokenRefresh updates the live token so subsequent getToken calls return the new value", async () => {
    const stub = makeStubClient();
    const { factory, captured } = makeCapturingFactory(stub);
    const { captured: auth, Captor } = captureAuth();
    render(
      <AuthProvider apiClientFactory={factory}>
        <Captor />
      </AuthProvider>
    );

    await act(async () => {
      await auth.current!.login("you", "embers-demo");
    });
    expect(captured.opts!.getToken()).toBe("tok-stub");

    // Simulate the api client firing onTokenRefresh after a 401 refresh.
    act(() => {
      captured.opts!.onTokenRefresh("tok-refreshed");
    });
    expect(captured.opts!.getToken()).toBe("tok-refreshed");
  });

  it("the api client factory is called exactly once (not on every render)", () => {
    const stub = makeStubClient();
    let factoryCallCount = 0;
    const factory = (opts: AuthApiClientOptions): AuthApiClient => {
      factoryCallCount += 1;
      // Touch opts to satisfy lint — the assertion is that the factory
      // itself was called once, regardless of what opts contains.
      void opts;
      return stub;
    };
    const { rerender } = render(
      <AuthProvider apiClientFactory={factory}>
        <Probe />
      </AuthProvider>
    );
    expect(factoryCallCount).toBe(1);
    // Force a re-render with the same props.
    rerender(
      <AuthProvider apiClientFactory={factory}>
        <Probe />
      </AuthProvider>
    );
    expect(factoryCallCount).toBe(1); // still 1 — useMemo with stable deps
  });

  /**
   * Stability of getToken / onTokenRefresh is implied by the
   * "factory called exactly once" test above: since the factory is
   * only invoked once (via useMemo with stable deps
   * [apiClientFactory, getToken, onTokenRefresh]), the captured
   * options object persists across re-renders. A separate identity
   * assertion would require either exposing the options via the
   * public API (not desired) or mocking the factory to capture per
   * call (which can't happen because the factory isn't called again).
   */
});

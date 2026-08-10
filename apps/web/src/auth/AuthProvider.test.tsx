import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthProvider";

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

  it("login stub rejects with 'not implemented' (Slice 1 — replaced in Slice 2)", async () => {
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider>
        <Captor />
      </AuthProvider>
    );
    await expect(captured.current!.login("you", "embers-demo")).rejects.toThrow(
      "not implemented"
    );
  });

  it("logout stub rejects with 'not implemented' (Slice 1 — replaced in Slice 3)", async () => {
    const { captured, Captor } = captureAuth();
    render(
      <AuthProvider>
        <Captor />
      </AuthProvider>
    );
    await expect(captured.current!.logout()).rejects.toThrow("not implemented");
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

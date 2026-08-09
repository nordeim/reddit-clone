import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { userEvent } from "@testing-library/user-event";

/**
 * Render a React element with a MemoryRouter wrapper so that components
 * using `useNavigate` / `useSearchParams` / `Link` work in tests without
 * polluting the real browser URL.
 *
 * Usage:
 *   const { getByText } = renderWithRouter(<MyComponent />);
 *   const user = userEvent.setup();
 */
export function renderWithRouter(
  ui: ReactElement,
  {
    initialEntries = ["/"],
    ...renderOptions
  }: { initialEntries?: string[] } & Omit<RenderOptions, "wrapper"> = {},
) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

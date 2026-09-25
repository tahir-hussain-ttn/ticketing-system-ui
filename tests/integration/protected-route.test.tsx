import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/context/AuthContext";
import { ProtectedRoute } from "../../src/routes/ProtectedRoute";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { LoginPage } from "../../src/pages/LoginPage";

function renderApp(initialPath: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<TicketListPage />} />
              <Route path="/tickets/new" element={<div>Create Ticket Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Protected routes (FR-002)", () => {
  it("redirects to /login when the ticket list is requested signed out", async () => {
    renderApp("/");
    expect(
      await screen.findByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  it("redirects to /login when any other protected route is requested signed out", async () => {
    renderApp("/tickets/new");
    expect(
      await screen.findByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Create Ticket Page")).not.toBeInTheDocument();
  });
});

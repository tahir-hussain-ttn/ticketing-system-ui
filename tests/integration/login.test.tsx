import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { server } from "../msw/server";
import { http, HttpResponse } from "msw";
import { AuthProvider } from "../../src/context/AuthContext";
import { AppHeader } from "../../src/App";
import { ProtectedRoute } from "../../src/routes/ProtectedRoute";
import { LoginPage } from "../../src/pages/LoginPage";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { TicketCreatePage } from "../../src/pages/TicketCreatePage";

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <AppHeader />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<TicketListPage />} />
              <Route path="/tickets/new" element={<TicketCreatePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Login and logout (FR-001–FR-006)", () => {
  it("logs in with valid credentials and reaches the ticket list", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(await screen.findByLabelText(/email/i), "sam@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(
      await screen.findByRole("heading", { name: "Tickets" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sam Support/)).toBeInTheDocument();
  });

  it("shows one generic invalid-credentials message for a wrong password", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(await screen.findByLabelText(/email/i), "sam@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /log in/i })).toBeInTheDocument();
  });

  it("shows one generic invalid-credentials message for an unregistered email", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(await screen.findByLabelText(/email/i), "nobody@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(
      await screen.findByText("Invalid email or password."),
    ).toBeInTheDocument();
  });

  it("shows field-level validation without contacting the backend when a field is blank", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole("button", { name: /log in/i }));

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("logs out and revokes access to the protected route", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(await screen.findByLabelText(/email/i), "sam@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    await screen.findByRole("heading", { name: "Tickets" });

    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(
      await screen.findByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  it("treats a 401 mid-session as a sign-out", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(await screen.findByLabelText(/email/i), "sam@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /log in/i }));
    await screen.findByRole("heading", { name: "Tickets" });

    server.use(
      http.get("http://localhost:8080/api/v1/tickets", () =>
        HttpResponse.json(
          {
            code: "UNAUTHENTICATED",
            message: "Session expired",
            timestamp: new Date().toISOString(),
            path: "/api/v1/tickets",
          },
          { status: 401 },
        ),
      ),
    );

    // TanStack Query refetches on remount by default — unmount the list
    // (navigate away) then remount it (navigate back) to trigger a fresh
    // fetch against the overridden 401 handler.
    await user.click(screen.getByRole("link", { name: /new ticket/i }));
    await user.click(await screen.findByRole("link", { name: "Tickets" }));

    expect(
      await screen.findByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
  });
});

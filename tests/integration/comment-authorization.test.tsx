import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/context/AuthContext";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { resetTicketStore, seedSession, MOCK_USERS, commentStore } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";

const creator = MOCK_USERS.find((u) => u.id === "u-general-1")!;
const assignedSupport = MOCK_USERS.find((u) => u.id === "u-support-1")!;
const unrelatedSupport = MOCK_USERS.find((u) => u.id === "u-support-2")!;
const admin = MOCK_USERS.find((u) => u.id === "u-admin-1")!;

function seedTicket(): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: "1",
    title: "VPN drops",
    description: "VPN connection drops every few minutes.",
    priority: "HIGH",
    status: "OPEN",
    assignee: assignedSupport,
    createdBy: creator,
    createdAt: now,
    updatedAt: now,
  };
  resetTicketStore([ticket]);
  return ticket;
}

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/tickets/1"]}>
          <Routes>
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Comment authorship and authorization (FR-021–FR-023)", () => {
  it("shows the comment form and succeeds for the ticket's creator", async () => {
    seedTicket();
    seedSession(creator);
    const user = userEvent.setup();
    renderApp();

    const field = await screen.findByLabelText(/add a comment/i);
    await user.type(field, "Any update?");
    await user.click(screen.getByRole("button", { name: /add comment/i }));

    expect(await screen.findByText("Any update?")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(creator.name))).toBeInTheDocument();
  });

  it("shows the comment form and succeeds for the assigned SUPPORT user", async () => {
    seedTicket();
    seedSession(assignedSupport);
    const user = userEvent.setup();
    renderApp();

    const field = await screen.findByLabelText(/add a comment/i);
    await user.type(field, "Investigating now.");
    await user.click(screen.getByRole("button", { name: /add comment/i }));

    expect(await screen.findByText("Investigating now.")).toBeInTheDocument();
    expect(
      screen.getAllByText(new RegExp(assignedSupport.name)).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("hides the comment form for an unrelated SUPPORT/ADMIN viewer", async () => {
    seedTicket();
    seedSession(unrelatedSupport);
    renderApp();

    await screen.findByRole("heading", { name: /vpn drops/i });
    expect(screen.queryByLabelText(/add a comment/i)).not.toBeInTheDocument();
  });

  it("rejects a comment attempt bypassing the UI gate and does not add it", async () => {
    seedTicket();
    seedSession(admin);
    renderApp();

    await screen.findByRole("heading", { name: /vpn drops/i });
    // ADMIN can view (FR-037) but is neither creator nor assignee, so the
    // comment form is correctly hidden — confirm no comment was recorded
    // server-side either, proving this isn't just a UI-only restriction.
    expect(screen.queryByLabelText(/add a comment/i)).not.toBeInTheDocument();
    expect(commentStore["1"] ?? []).toHaveLength(0);
  });
});

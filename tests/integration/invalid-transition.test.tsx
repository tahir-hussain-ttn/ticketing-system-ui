import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { AuthProvider } from "../../src/context/AuthContext";
import { resetTicketStore, ticketStore, seedSession, MOCK_USERS } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";

const creator = MOCK_USERS.find((u) => u.id === "u-general-1")!;

function seedTicket(overrides: Partial<Ticket> = {}): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: "1",
    title: "Server down",
    description: "Prod server unreachable.",
    priority: "CRITICAL",
    status: "OPEN",
    assignee: null,
    creator,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  resetTicketStore([ticket]);
  return ticket;
}

function renderDetail() {
  seedSession(creator);
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

describe("Status transitions", () => {
  it("rejects a transition the backend no longer allows and keeps the displayed status unchanged (FR-010, FR-011)", async () => {
    seedTicket({ status: "OPEN" });
    const user = userEvent.setup();
    renderDetail();

    await user.click(
      await screen.findByRole("button", { name: /change status/i }),
    );

    // Simulate a race: another agent closes the ticket server-side
    // between page load and this click (spec.md Edge Cases). The menu
    // still shows OPEN's options because it was computed from the
    // already-fetched status.
    ticketStore[0].status = "CLOSED";

    await user.click(await screen.findByRole("menuitem", { name: "IN_PROGRESS" }));

    expect(
      await screen.findByText(/cannot transition ticket from closed/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("accepts a valid transition and displays the new status (FR-010)", async () => {
    seedTicket({ status: "OPEN" });
    const user = userEvent.setup();
    renderDetail();

    await user.click(
      await screen.findByRole("button", { name: /change status/i }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "IN_PROGRESS" }));

    expect(await screen.findByText("In Progress")).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { AuthProvider } from "../../src/context/AuthContext";
import { resetTicketStore, seedSession, MOCK_USERS } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";

const creator = MOCK_USERS.find((u) => u.id === "u-admin-1")!;

function seedTickets(): Ticket[] {
  const now = new Date().toISOString();
  const tickets: Ticket[] = Array.from({ length: 55 }, (_, i) => ({
    id: String(i + 1),
    title: `Generic ticket ${i + 1}`,
    description: "Routine request.",
    priority: "LOW",
    status: i % 2 === 0 ? "OPEN" : "IN_PROGRESS",
    assignee: null,
    creator,
    createdAt: now,
    updatedAt: now,
  }));
  tickets.push({
    id: "999",
    title: "VPN connection drops",
    description: "Affects remote workers.",
    priority: "HIGH",
    status: "OPEN",
    assignee: null,
    creator,
    createdAt: now,
    updatedAt: now,
  });
  resetTicketStore(tickets);
  return tickets;
}

function renderPage() {
  seedSession(creator);
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <TicketListPage />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Search and filter tickets", () => {
  it("narrows the list to tickets matching a keyword in title or description (FR-007)", async () => {
    seedTickets();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Generic ticket 1");
    await user.type(screen.getByLabelText(/search tickets/i), "VPN");

    await waitFor(() => {
      expect(screen.getByText("VPN connection drops")).toBeInTheDocument();
      expect(screen.queryByText("Generic ticket 1")).not.toBeInTheDocument();
    });
  });

  it("narrows the list to tickets in the selected status (FR-008)", async () => {
    seedTickets();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Generic ticket 1");
    await user.click(screen.getByLabelText(/^status$/i));
    await user.click(await screen.findByRole("option", { name: "IN_PROGRESS" }));

    await waitFor(() => {
      expect(screen.getByText("Generic ticket 2")).toBeInTheDocument();
      expect(screen.queryByText("Generic ticket 1")).not.toBeInTheDocument();
    });
  });

  it("combines keyword search and status filter to the intersection (FR-009)", async () => {
    seedTickets();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Generic ticket 1");
    await user.type(screen.getByLabelText(/search tickets/i), "Generic");
    await user.click(screen.getByLabelText(/^status$/i));
    await user.click(await screen.findByRole("option", { name: "OPEN" }));

    await waitFor(() => {
      expect(screen.getByText("Generic ticket 1")).toBeInTheDocument();
      expect(screen.queryByText("VPN connection drops")).not.toBeInTheDocument();
      expect(screen.queryByText("Generic ticket 2")).not.toBeInTheDocument();
    });
  });

  it("shows a distinct 'no results' state when a search/filter matches nothing (FR-015)", async () => {
    seedTickets();
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Generic ticket 1");
    await user.type(
      screen.getByLabelText(/search tickets/i),
      "no such ticket exists",
    );

    expect(
      await screen.findByText(/no tickets match your search\/filter/i),
    ).toBeInTheDocument();
  });
});

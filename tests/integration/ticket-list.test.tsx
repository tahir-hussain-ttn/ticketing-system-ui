import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { resetTicketStore } from "../msw/handlers";

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Ticket list", () => {
  it("shows title, status, priority, and assignee for each ticket (FR-002)", async () => {
    resetTicketStore([
      {
        id: "1",
        title: "VPN not connecting",
        description: "desc",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        assignee: "Alice Chen",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    renderPage();

    expect(await screen.findByText("VPN not connecting")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText("Alice Chen")).toBeInTheDocument();
  });

  it("shows a distinct empty-list state when there are no tickets (FR-015)", async () => {
    resetTicketStore([]);
    renderPage();

    expect(
      await screen.findByText(/no tickets yet/i),
    ).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { AuthProvider } from "../../src/context/AuthContext";
import { resetTicketStore, seedSession, MOCK_USERS } from "../msw/handlers";

const admin = MOCK_USERS.find((u) => u.id === "u-admin-1")!;
const support1 = MOCK_USERS.find((u) => u.id === "u-support-1")!;

function renderPage() {
  seedSession(admin);
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

describe("Ticket list", () => {
  it("shows title, status, priority, assignee, and creator for each ticket (FR-002, FR-023a)", async () => {
    resetTicketStore([
      {
        id: "1",
        title: "VPN not connecting",
        description: "desc",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        assignee: support1,
        createdBy: admin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    renderPage();

    expect(await screen.findByText("VPN not connecting")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText(support1.name)).toBeInTheDocument();
    expect(screen.getByText(admin.name)).toBeInTheDocument();
  });

  it("shows a distinct empty-list state when there are no tickets (FR-015)", async () => {
    resetTicketStore([]);
    renderPage();

    expect(
      await screen.findByText(/no tickets yet/i),
    ).toBeInTheDocument();
  });
});

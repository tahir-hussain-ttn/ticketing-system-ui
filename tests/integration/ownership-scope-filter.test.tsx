import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../src/context/AuthContext";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { resetTicketStore, seedSession, MOCK_USERS } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";

const general1 = MOCK_USERS.find((u) => u.id === "u-general-1")!;
const support1 = MOCK_USERS.find((u) => u.id === "u-support-1")!;
const admin = MOCK_USERS.find((u) => u.id === "u-admin-1")!;

function seedTickets(): void {
  const now = new Date().toISOString();
  const tickets: Ticket[] = [
    {
      id: "1",
      title: "Created by Gina, assigned to Sam",
      description: "desc one",
      priority: "LOW",
      status: "OPEN",
      assignee: support1,
      createdBy: general1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "2",
      title: "Created and unassigned",
      description: "desc two",
      priority: "LOW",
      status: "OPEN",
      assignee: null,
      createdBy: admin,
      createdAt: now,
      updatedAt: now,
    },
  ];
  resetTicketStore(tickets);
}

function renderList() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<TicketListPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function renderDetail(ticketId: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
          <Routes>
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Ownership scope and view authorization (FR-023a–FR-026)", () => {
  it("shows a creator-name column", async () => {
    seedTickets();
    seedSession(admin);
    renderList();

    expect(await screen.findByText("Created by Gina, assigned to Sam")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Creator" })).toBeInTheDocument();
    expect(screen.getAllByText(general1.name).length).toBeGreaterThan(0);
  });

  it("scopes to tickets created by the signed-in user", async () => {
    seedTickets();
    seedSession(general1);
    const user = userEvent.setup();
    renderList();

    await screen.findByText("Created by Gina, assigned to Sam");
    await user.click(screen.getByLabelText(/show/i));
    await user.click(await screen.findByRole("option", { name: "Created by me" }));

    expect(await screen.findByText("Created by Gina, assigned to Sam")).toBeInTheDocument();
    expect(screen.queryByText("Created and unassigned")).not.toBeInTheDocument();
  });

  it("hides the 'assigned to me' scope option for a GENERAL user", async () => {
    seedTickets();
    seedSession(general1);
    const user = userEvent.setup();
    renderList();

    await screen.findByText("Created by Gina, assigned to Sam");
    await user.click(screen.getByLabelText(/show/i));

    expect(screen.queryByRole("option", { name: "Assigned to me" })).not.toBeInTheDocument();
  });

  it("offers 'assigned to me' for a SUPPORT user and scopes correctly", async () => {
    seedTickets();
    seedSession(support1);
    const user = userEvent.setup();
    renderList();

    await screen.findByText("Created by Gina, assigned to Sam");
    await user.click(screen.getByLabelText(/show/i));
    await user.click(await screen.findByRole("option", { name: "Assigned to me" }));

    expect(await screen.findByText("Created by Gina, assigned to Sam")).toBeInTheDocument();
    expect(screen.queryByText("Created and unassigned")).not.toBeInTheDocument();
  });

  it("shows a 'not permitted' state for a GENERAL user viewing an unauthorized ticket", async () => {
    seedTickets();
    seedSession(general1);
    renderDetail("2");

    expect(
      await screen.findByText(/not permitted to view this ticket/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("desc two")).not.toBeInTheDocument();
  });
});

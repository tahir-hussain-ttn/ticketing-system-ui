import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { AuthProvider } from "../../src/context/AuthContext";
import { TicketCreatePage } from "../../src/pages/TicketCreatePage";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { TicketEditPage } from "../../src/pages/TicketEditPage";
import { resetTicketStore, seedSession, MOCK_USERS } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";
import type { User } from "../../src/types/user";

const supportUser = MOCK_USERS.find((u) => u.id === "u-support-1")!;
const otherSupportUser = MOCK_USERS.find((u) => u.id === "u-support-2")!;
const adminUser = MOCK_USERS.find((u) => u.id === "u-admin-1")!;
const generalUser = MOCK_USERS.find((u) => u.id === "u-general-1")!;

function seedTicket(assignee: User | null = supportUser): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: "1",
    title: "Monitor flickering",
    description: "External monitor flickers intermittently.",
    priority: "MEDIUM",
    status: "OPEN",
    assignee,
    creator: generalUser,
    createdAt: now,
    updatedAt: now,
  };
  resetTicketStore([ticket]);
  return ticket;
}

function renderApp(initialPath = "/") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/tickets/new" element={<TicketCreatePage />} />
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="/tickets/:ticketId/edit" element={<TicketEditPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Automatic assignment and reassignment (FR-007–FR-012, FR-011a)", () => {
  it("create form has no assignee field", async () => {
    seedSession(generalUser);
    renderApp("/tickets/new");

    await screen.findByLabelText(/^title/i);
    expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument();
  });

  it("edit form has no assignee field", async () => {
    seedTicket();
    seedSession(generalUser);
    renderApp("/tickets/1/edit");

    await screen.findByLabelText(/^title/i);
    expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument();
  });

  it("detail page shows the system-assigned SUPPORT user, or Unassigned", async () => {
    seedTicket(null);
    seedSession(generalUser);
    renderApp("/tickets/1");

    expect(await screen.findByText(/Assignee: Unassigned/)).toBeInTheDocument();
  });

  it("shows no reassignment control for a non-ADMIN viewer", async () => {
    seedTicket();
    seedSession(supportUser);
    renderApp("/tickets/1");

    await screen.findByText(/Assignee:/);
    expect(screen.queryByLabelText(/reassign to/i)).not.toBeInTheDocument();
  });

  it("lets an ADMIN reassign, updating the displayed assignee", async () => {
    seedTicket(supportUser);
    seedSession(adminUser);
    const user = userEvent.setup();
    renderApp("/tickets/1");

    await screen.findByText(new RegExp(`Assignee: ${supportUser.name}`));
    const select = await screen.findByLabelText(/reassign to/i);
    await user.click(select);
    await user.click(
      await screen.findByRole("option", { name: otherSupportUser.name }),
    );

    expect(
      await screen.findByText(new RegExp(`Assignee: ${otherSupportUser.name}`)),
    ).toBeInTheDocument();
  });

  it("keeps the control open with an inline error when reassignment fails", async () => {
    seedTicket(supportUser);
    seedSession(adminUser);
    const user = userEvent.setup();
    renderApp("/tickets/1");

    server.use(
      http.post("http://localhost:8080/api/v1/tickets/:id/reassign", () =>
        HttpResponse.json(
          { code: "SERVER_ERROR", message: "Unexpected error", timestamp: new Date().toISOString(), path: "/api/v1/tickets/1/reassign" },
          { status: 500 },
        ),
      ),
    );

    const select = await screen.findByLabelText(/reassign to/i);
    await user.click(select);
    await user.click(
      await screen.findByRole("option", { name: otherSupportUser.name }),
    );

    expect(
      await screen.findByText(/unable to reassign this ticket/i),
    ).toBeInTheDocument();
    // Still shows the original assignee — the failed attempt was not applied.
    expect(screen.getByText(new RegExp(`Assignee: ${supportUser.name}`))).toBeInTheDocument();
  });
});

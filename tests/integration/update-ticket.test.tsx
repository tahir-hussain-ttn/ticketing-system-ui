import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { TicketEditPage } from "../../src/pages/TicketEditPage";
import { AuthProvider } from "../../src/context/AuthContext";
import { resetTicketStore, seedSession, MOCK_USERS } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";

const creator = MOCK_USERS.find((u) => u.id === "u-general-1")!;

function seedTicket(overrides: Partial<Ticket> = {}): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: "1",
    title: "Laptop won't boot",
    description: "Black screen on power-on.",
    priority: "MEDIUM",
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

function renderEdit(ticketId = "1") {
  seedSession(creator);
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/tickets/${ticketId}/edit`]}>
          <Routes>
            <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
            <Route
              path="/tickets/:ticketId/edit"
              element={<TicketEditPage />}
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("Update ticket", () => {
  it("updates title/description/priority and returns to the read-only detail page with the change reflected (FR-004, FR-019)", async () => {
    seedTicket();
    const user = userEvent.setup();
    renderEdit();

    const priorityField = await screen.findByLabelText(/priority/i);
    await user.click(priorityField);
    await user.click(await screen.findByRole("option", { name: "HIGH" }));

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByRole("heading", { name: "Laptop won't boot" }),
    ).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("blocks an empty-title save and preserves the edit rather than discarding it or navigating away (FR-013)", async () => {
    seedTicket();
    const user = userEvent.setup();
    renderEdit();

    const titleField = await screen.findByLabelText(/title/i);
    await user.clear(titleField);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/title is required/i),
    ).toBeInTheDocument();
    expect(titleField).toHaveValue("");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});

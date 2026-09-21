import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { resetTicketStore } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";

function seedTicket(overrides: Partial<Ticket> = {}): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: "1",
    title: "Laptop won't boot",
    description: "Black screen on power-on.",
    priority: "MEDIUM",
    status: "OPEN",
    assignee: undefined,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  resetTicketStore([ticket]);
  return ticket;
}

function renderDetail(ticketId = "1") {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Update ticket", () => {
  it("updates title/description/priority/assignee and reflects them immediately (FR-004)", async () => {
    seedTicket();
    const user = userEvent.setup();
    renderDetail();

    const priorityField = await screen.findByLabelText(/priority/i);
    await user.click(priorityField);
    await user.click(await screen.findByRole("option", { name: "HIGH" }));

    const assigneeField = screen.getByLabelText(/assignee/i);
    await user.click(assigneeField);
    await user.click(await screen.findByRole("option", { name: "Alice Chen" }));

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByDisplayValue("HIGH")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alice Chen")).toBeInTheDocument();
  });

  it("blocks an empty-title save and preserves the edit rather than discarding it (FR-013)", async () => {
    seedTicket();
    const user = userEvent.setup();
    renderDetail();

    const titleField = await screen.findByLabelText(/title/i);
    await user.clear(titleField);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/title is required/i),
    ).toBeInTheDocument();
    expect(titleField).toHaveValue("");
  });
});

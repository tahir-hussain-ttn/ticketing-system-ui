import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { TicketEditPage } from "../../src/pages/TicketEditPage";
import { AuthProvider } from "../../src/context/AuthContext";
import { resetTicketStore, seedSession, MOCK_USERS } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";

const creator = MOCK_USERS.find((u) => u.id === "u-general-1")!;

function seedTicket(): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: "1",
    title: "Monitor flickering",
    description: "External monitor flickers intermittently.",
    priority: "MEDIUM",
    status: "OPEN",
    assignee: null,
    creator,
    createdAt: now,
    updatedAt: now,
  };
  resetTicketStore([ticket]);
  return ticket;
}

function renderApp(initialPath = "/") {
  seedSession(creator);
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/" element={<TicketListPage />} />
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

describe("View and edit navigation", () => {
  it("navigates from list View to a read-only detail page, then to a separate edit page (FR-003, FR-016, FR-017)", async () => {
    seedTicket();
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole("link", { name: /view/i }));

    expect(
      await screen.findByRole("heading", { name: "Monitor flickering" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/^title/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /^edit$/i }));

    expect(await screen.findByLabelText(/^title/i)).toHaveValue(
      "Monitor flickering",
    );
  });

  it("saving the edit page returns to the detail page with updated values and correct breadcrumbs (FR-004, FR-019, FR-020)", async () => {
    seedTicket();
    const user = userEvent.setup();
    renderApp("/tickets/1/edit");

    const titleField = await screen.findByLabelText(/^title/i);

    const breadcrumbNav = screen.getByRole("navigation", {
      name: /breadcrumb/i,
    });
    expect(breadcrumbNav).toHaveTextContent("Tickets");
    expect(breadcrumbNav).toHaveTextContent("Monitor flickering");
    expect(breadcrumbNav).toHaveTextContent("Edit");

    await user.clear(titleField);
    await user.type(titleField, "Monitor flickering badly");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByRole("heading", { name: "Monitor flickering badly" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
  });
});

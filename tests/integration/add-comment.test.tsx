import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";
import { AuthProvider } from "../../src/context/AuthContext";
import { resetTicketStore, commentStore, seedSession, MOCK_USERS } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";
import type { Comment } from "../../src/types/comment";

const creator = MOCK_USERS.find((u) => u.id === "u-general-1")!;

function seedTicket(): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: "1",
    title: "Email not syncing",
    description: "Outlook stuck on syncing since this morning.",
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

describe("Add comment", () => {
  it("appears in the comment history with its timestamp (FR-006)", async () => {
    seedTicket();
    const user = userEvent.setup();
    renderDetail();

    const commentField = await screen.findByLabelText(/add a comment/i);
    await user.type(commentField, "Restarted the sync service, monitoring now.");
    await user.click(screen.getByRole("button", { name: /add comment/i }));

    expect(
      await screen.findByText("Restarted the sync service, monitoring now."),
    ).toBeInTheDocument();
  });

  it("blocks an empty comment and sends no request (spec.md US3 scenario 2)", async () => {
    seedTicket();
    const user = userEvent.setup();
    renderDetail();

    await screen.findByLabelText(/add a comment/i);
    await user.click(screen.getByRole("button", { name: /add comment/i }));

    expect(
      await screen.findByText(/comment cannot be empty/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it("loads additional pages when a ticket has more comments than one page (FR-006a)", async () => {
    seedTicket();
    const now = new Date();
    const comments: Comment[] = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      ticketId: "1",
      content: `Update number ${i + 1}`,
      author: creator,
      createdAt: new Date(now.getTime() + i * 1000).toISOString(),
    }));
    commentStore["1"] = comments;
    const user = userEvent.setup();
    renderDetail();

    expect(await screen.findByText("Update number 1")).toBeInTheDocument();
    expect(screen.queryByText("Update number 21")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /go to page 2/i }));

    expect(await screen.findByText("Update number 21")).toBeInTheDocument();
  });
});

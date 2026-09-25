import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Link, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { AuthProvider } from "../../src/context/AuthContext";
import { ChatbotProvider } from "../../src/context/ChatbotContext";
import { ChatbotWidget } from "../../src/components/ChatbotWidget/ChatbotWidget";
import { seedSession, MOCK_USERS, resetTicketStore } from "../msw/handlers";
import type { Ticket } from "../../src/types/ticket";

const generalUser = MOCK_USERS.find((u) => u.id === "u-general-1")!;

function PageA() {
  return (
    <div>
      <h1>Page A</h1>
      <Link to="/b">Go to B</Link>
    </div>
  );
}
function PageB() {
  return <h1>Page B</h1>;
}

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChatbotProvider>
          <MemoryRouter initialEntries={["/a"]}>
            <Routes>
              <Route path="/a" element={<PageA />} />
              <Route path="/b" element={<PageB />} />
            </Routes>
          </MemoryRouter>
          <ChatbotWidget />
        </ChatbotProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function seedResolvedTicket(): Ticket {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: "42",
    title: "Printer offline",
    description: "Office printer stopped responding.",
    priority: "MEDIUM",
    status: "RESOLVED",
    assignee: null,
    createdBy: generalUser,
    createdAt: now,
    updatedAt: now,
  };
  resetTicketStore([ticket]);
  return ticket;
}

describe("Chatbot widget (FR-013–FR-020)", () => {
  it("is collapsed by default", () => {
    seedSession(generalUser);
    renderApp();

    expect(screen.queryByLabelText(/ask a question/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open resolution assistant/i }),
    ).toBeInTheDocument();
  });

  it("answers a query with a plain-text (non-link) citation, within a reasonable time", async () => {
    seedSession(generalUser);
    seedResolvedTicket();
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /open resolution assistant/i }));
    await user.type(screen.getByLabelText(/ask a question/i), "printer is broken");

    const start = performance.now();
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/Based on: Ticket #42/)).toBeInTheDocument();
    expect(performance.now() - start).toBeLessThan(2000);

    // FR-020: only the fields the mocked API response actually returned are
    // rendered — no internal ticket description leaks into the chat.
    expect(screen.queryByText(/stopped responding/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ticket #42/i })).not.toBeInTheDocument();
  });

  it("keeps a follow-up in the same visible conversation", async () => {
    seedSession(generalUser);
    seedResolvedTicket();
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /open resolution assistant/i }));
    await user.type(screen.getByLabelText(/ask a question/i), "printer is broken");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Based on: Ticket #42/);

    await user.type(screen.getByLabelText(/ask a question/i), "what about on wifi");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findAllByText(/printer is broken|what about on wifi/i)).toHaveLength(2);
  });

  it("persists the widget and conversation across navigation", async () => {
    seedSession(generalUser);
    seedResolvedTicket();
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /open resolution assistant/i }));
    await user.type(screen.getByLabelText(/ask a question/i), "printer is broken");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Based on: Ticket #42/);

    await user.click(screen.getByRole("link", { name: /go to b/i }));

    expect(await screen.findByRole("heading", { name: "Page B" })).toBeInTheDocument();
    expect(screen.getByText(/Based on: Ticket #42/)).toBeInTheDocument();
  });

  it("blocks an empty query client-side", async () => {
    seedSession(generalUser);
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /open resolution assistant/i }));
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText(/enter a question before sending/i),
    ).toBeInTheDocument();
  });

  it("shows a no-confident-match message linking to ticket creation", async () => {
    seedSession(generalUser);
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /open resolution assistant/i }));
    await user.type(screen.getByLabelText(/ask a question/i), "this will nomatch anything");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/no confident match found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /raise a ticket/i })).toBeInTheDocument();
  });

  it("calls the backend to end the conversation when 'End chat' is clicked", async () => {
    seedSession(generalUser);
    seedResolvedTicket();
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /open resolution assistant/i }));
    await user.type(screen.getByLabelText(/ask a question/i), "printer is broken");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Based on: Ticket #42/);

    let endedConversationId: string | undefined;
    server.use(
      http.post(
        "http://localhost:8080/api/v1/chatbot/conversations/:conversationId/end",
        ({ params }) => {
          endedConversationId = params.conversationId as string;
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    await user.click(screen.getByRole("button", { name: /end chat/i }));

    await waitFor(() => expect(endedConversationId).toBeDefined());
  });

  it("shows a distinct service-unavailable message on backend failure", async () => {
    seedSession(generalUser);
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /open resolution assistant/i }));
    await user.type(screen.getByLabelText(/ask a question/i), "please fail this request");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(
      await screen.findByText(/chatbot service is temporarily unavailable/i),
    ).toBeInTheDocument();
  });
});

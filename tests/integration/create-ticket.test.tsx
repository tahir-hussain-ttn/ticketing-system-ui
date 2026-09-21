import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TicketCreatePage } from "../../src/pages/TicketCreatePage";
import { TicketListPage } from "../../src/pages/TicketListPage";
import { TicketDetailPage } from "../../src/pages/TicketDetailPage";

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/tickets/new"]}>
        <Routes>
          <Route path="/" element={<TicketListPage />} />
          <Route path="/tickets/new" element={<TicketCreatePage />} />
          <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Create ticket", () => {
  it("creates a ticket and shows it in the list (US1 success path)", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText(/title/i), "Printer is broken");
    await user.type(
      screen.getByLabelText(/description/i),
      "The office printer on floor 2 won't turn on.",
    );
    await user.click(screen.getByLabelText(/priority/i));
    await user.click(await screen.findByRole("option", { name: "HIGH" }));
    await user.click(screen.getByRole("button", { name: /create ticket/i }));

    expect(await screen.findByText("Printer is broken")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("blocks submission with an empty title (US1 validation path)", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(
      screen.getByLabelText(/description/i),
      "Some description",
    );
    await user.click(screen.getByLabelText(/priority/i));
    await user.click(await screen.findByRole("option", { name: "LOW" }));
    await user.click(screen.getByRole("button", { name: /create ticket/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
  });
});

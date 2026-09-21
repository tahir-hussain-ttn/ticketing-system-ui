import { createBrowserRouter } from "react-router-dom";
import { TicketListPage } from "../pages/TicketListPage";
import { TicketCreatePage } from "../pages/TicketCreatePage";
import { TicketDetailPage } from "../pages/TicketDetailPage";

export const router = createBrowserRouter([
  { path: "/", element: <TicketListPage /> },
  { path: "/tickets/new", element: <TicketCreatePage /> },
  { path: "/tickets/:ticketId", element: <TicketDetailPage /> },
]);

import { createBrowserRouter } from "react-router-dom";
import { TicketListPage } from "../pages/TicketListPage";
import { TicketCreatePage } from "../pages/TicketCreatePage";
import { TicketDetailPage } from "../pages/TicketDetailPage";
import { TicketEditPage } from "../pages/TicketEditPage";
import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <TicketListPage /> },
      { path: "/tickets/new", element: <TicketCreatePage /> },
      { path: "/tickets/:ticketId", element: <TicketDetailPage /> },
      { path: "/tickets/:ticketId/edit", element: <TicketEditPage /> },
    ],
  },
]);

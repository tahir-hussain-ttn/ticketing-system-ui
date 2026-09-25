import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { useNavigate, useParams } from "react-router-dom";
import { useTicket } from "../hooks/useTicket";
import { useUpdateTicket } from "../hooks/useUpdateTicket";
import { TicketForm } from "../components/TicketForm/TicketForm";
import { Breadcrumbs } from "../components/Breadcrumbs/Breadcrumbs";

export function TicketEditPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  if (!ticketId) {
    throw new Error("TicketEditPage rendered without a ticketId param");
  }

  const navigate = useNavigate();
  const { data: ticket, isLoading, isError } = useTicket(ticketId);
  const updateTicket = useUpdateTicket(ticketId);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Breadcrumbs
        segments={[
          { label: "Tickets", to: "/" },
          { label: ticket?.title ?? "Ticket", to: `/tickets/${ticketId}` },
          { label: "Edit" },
        ]}
      />

      {isLoading && <CircularProgress aria-label="Loading ticket" />}

      {isError && (
        <Alert severity="error">
          Unable to load this ticket. Please try again.
        </Alert>
      )}

      {ticket && (
        <>
          <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
            Edit Ticket
          </Typography>
          <TicketForm
            submitLabel="Save Changes"
            initialValues={{
              title: ticket.title,
              description: ticket.description,
              priority: ticket.priority,
            }}
            onSubmit={async (values) => {
              await updateTicket.mutateAsync(values);
              navigate(`/tickets/${ticketId}`);
            }}
          />
        </>
      )}
    </Container>
  );
}

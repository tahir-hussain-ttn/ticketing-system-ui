import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router-dom";
import { TicketForm } from "../components/TicketForm/TicketForm";
import { useCreateTicket } from "../hooks/useCreateTicket";
import { Breadcrumbs } from "../components/Breadcrumbs/Breadcrumbs";

export function TicketCreatePage() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Breadcrumbs
        segments={[{ label: "Tickets", to: "/" }, { label: "New Ticket" }]}
      />

      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        New Ticket
      </Typography>
      <TicketForm
        submitLabel="Create Ticket"
        onSubmit={async (values) => {
          const ticket = await createTicket.mutateAsync(values);
          navigate(`/tickets/${ticket.id}`);
        }}
      />
    </Container>
  );
}

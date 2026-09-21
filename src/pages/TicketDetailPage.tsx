import { useState } from "react";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { useParams } from "react-router-dom";
import { useTicket } from "../hooks/useTicket";
import { useUpdateTicket } from "../hooks/useUpdateTicket";
import { useComments } from "../hooks/useComments";
import { useAddComment } from "../hooks/useAddComment";
import { TicketForm } from "../components/TicketForm/TicketForm";
import { StatusBadge } from "../components/StatusBadge/StatusBadge";
import { StatusTransitionMenu } from "../components/StatusTransitionMenu/StatusTransitionMenu";
import { CommentList } from "../components/CommentList/CommentList";
import { CommentForm } from "../components/CommentForm/CommentForm";

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  if (!ticketId) {
    throw new Error("TicketDetailPage rendered without a ticketId param");
  }

  const { data: ticket, isLoading, isError } = useTicket(ticketId);
  const updateTicket = useUpdateTicket(ticketId);
  const [commentsPage, setCommentsPage] = useState(0);
  const { data: commentPage } = useComments(ticketId, commentsPage);
  const addComment = useAddComment(ticketId);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {isLoading && <CircularProgress aria-label="Loading ticket" />}

      {isError && (
        <Alert severity="error">
          Unable to load this ticket. Please try again.
        </Alert>
      )}

      {ticket && (
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h4" component="h1">
              {ticket.title}
            </Typography>
            <StatusBadge status={ticket.status} />
          </Stack>

          <StatusTransitionMenu
            ticketId={ticket.id}
            currentStatus={ticket.status}
          />

          <TicketForm
            submitLabel="Save Changes"
            initialValues={{
              title: ticket.title,
              description: ticket.description,
              priority: ticket.priority,
              assignee: ticket.assignee ?? "",
            }}
            onSubmit={(values) => updateTicket.mutateAsync(values)}
          />

          <Divider />

          <Typography variant="h6" component="h2">
            Comments
          </Typography>
          {commentPage && (
            <CommentList
              commentPage={commentPage}
              onPageChange={setCommentsPage}
            />
          )}
          <CommentForm
            onSubmit={(content) => addComment.mutateAsync({ content })}
          />
        </Stack>
      )}
    </Container>
  );
}

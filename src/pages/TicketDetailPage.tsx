import { useState } from "react";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useTicket } from "../hooks/useTicket";
import { useComments } from "../hooks/useComments";
import { useAddComment } from "../hooks/useAddComment";
import { StatusBadge } from "../components/StatusBadge/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge/PriorityBadge";
import { StatusTransitionMenu } from "../components/StatusTransitionMenu/StatusTransitionMenu";
import { CommentList } from "../components/CommentList/CommentList";
import { CommentForm } from "../components/CommentForm/CommentForm";
import { Breadcrumbs } from "../components/Breadcrumbs/Breadcrumbs";
import { ReassignControl } from "../components/ReassignControl/ReassignControl";
import { useAuth } from "../context/AuthContext";
import { HttpError } from "../api/http";

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  if (!ticketId) {
    throw new Error("TicketDetailPage rendered without a ticketId param");
  }

  const { user } = useAuth();
  const { data: ticket, isLoading, isError, error } = useTicket(ticketId);
  const [commentsPage, setCommentsPage] = useState(0);
  const { data: commentPage } = useComments(ticketId, commentsPage);
  const addComment = useAddComment(ticketId);
  const [commentError, setCommentError] = useState<string | null>(null);

  const isForbidden = error instanceof HttpError && error.status === 403;
  const canComment =
    ticket !== undefined &&
    user !== null &&
    (user.id === ticket.createdBy.id || user.id === ticket.assignee?.id);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Breadcrumbs
        segments={[
          { label: "Tickets", to: "/" },
          { label: ticket?.title ?? "Ticket" },
        ]}
      />

      {isLoading && <CircularProgress aria-label="Loading ticket" />}

      {isError && isForbidden && (
        <Alert severity="warning">
          You are not permitted to view this ticket.
        </Alert>
      )}

      {isError && !isForbidden && (
        <Alert severity="error">
          Unable to load this ticket. Please try again.
        </Alert>
      )}

      {ticket && (
        <Stack spacing={3}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h4" component="h1">
                {ticket.title}
              </Typography>
              <StatusBadge status={ticket.status} />
            </Stack>
            <Button
              component={RouterLink}
              to={`/tickets/${ticketId}/edit`}
              variant="outlined"
            >
              Edit
            </Button>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="body1">{ticket.description}</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <PriorityBadge priority={ticket.priority} />
              <Typography variant="body2" color="text.secondary">
                Assignee: {ticket.assignee?.name ?? "Unassigned"}
              </Typography>
            </Stack>
            {user?.role === "ADMIN" && (
              <ReassignControl ticketId={ticket.id} currentAssignee={ticket.assignee} />
            )}
          </Stack>

          <StatusTransitionMenu
            ticketId={ticket.id}
            currentStatus={ticket.status}
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
          {canComment && (
            <>
              {commentError && <Alert severity="error">{commentError}</Alert>}
              <CommentForm
                onSubmit={async (content) => {
                  setCommentError(null);
                  try {
                    await addComment.mutateAsync({ content });
                  } catch (err) {
                    if (err instanceof HttpError && err.status === 403) {
                      setCommentError(
                        "Only the ticket's creator or assignee may comment.",
                      );
                    } else {
                      throw err;
                    }
                  }
                }}
              />
            </>
          )}
        </Stack>
      )}
    </Container>
  );
}

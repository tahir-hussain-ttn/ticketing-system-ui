import { useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import { useChatbot } from "../../context/ChatbotContext";
import { router } from "../../routes/router";

export function ChatbotConversationView() {
  const { conversation, isSubmitting, submitQuery, endConversation } = useChatbot();
  const [query, setQuery] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim() === "") {
      setValidationError("Enter a question before sending.");
      return;
    }
    setValidationError(null);
    const submitted = query;
    setQuery("");
    await submitQuery(submitted);
  }

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 88,
        right: 24,
        width: 340,
        maxHeight: 480,
        display: "flex",
        flexDirection: "column",
        p: 2,
        zIndex: 1300,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Resolution Assistant</Typography>
        <Button size="small" onClick={endConversation}>
          End chat
        </Button>
      </Stack>

      <Stack spacing={1.5} sx={{ overflowY: "auto", flex: 1, mb: 1 }}>
        {conversation.turns.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Describe an issue to get a suggested resolution from past tickets.
          </Typography>
        )}
        {conversation.turns.map((turn) => (
          <Stack key={turn.id} spacing={0.5}>
            <Typography variant="body2" fontWeight="bold">
              {turn.query}
            </Typography>
            {turn.status === "pending" && (
              <Typography variant="body2" color="text.secondary">
                Thinking…
              </Typography>
            )}
            {turn.status === "answered" && (
              <Stack spacing={0.5}>
                <Typography variant="body2">{turn.response}</Typography>
                {turn.sourceTickets.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    Based on: {turn.sourceTickets.join(", ")}
                  </Typography>
                )}
              </Stack>
            )}
            {turn.status === "no-match" && (
              <Alert severity="info" sx={{ py: 0 }}>
                No confident match found.{" "}
                <Link
                  href="/tickets/new"
                  onClick={(e) => {
                    e.preventDefault();
                    router.navigate("/tickets/new");
                  }}
                >
                  Raise a ticket
                </Link>{" "}
                instead.
              </Alert>
            )}
            {turn.status === "error" && (
              <Alert severity="error" sx={{ py: 0 }}>
                The chatbot service is temporarily unavailable. Please try again.
              </Alert>
            )}
          </Stack>
        ))}
      </Stack>

      <Stack component="form" onSubmit={handleSubmit} spacing={1}>
        {validationError && (
          <Alert severity="warning" sx={{ py: 0 }}>
            {validationError}
          </Alert>
        )}
        <TextField
          size="small"
          label="Ask a question"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="contained" size="small" disabled={isSubmitting}>
          Send
        </Button>
      </Stack>
    </Paper>
  );
}

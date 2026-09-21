import { useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { HttpError } from "../../api/http";
import { mapFieldErrors } from "../../utils/mapFieldErrors";

const KNOWN_FIELDS = ["content"] as const;

export interface CommentFormProps {
  onSubmit: (content: string) => Promise<unknown>;
}

export function CommentForm({ onSubmit }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralErrors([]);

    if (content.trim() === "") {
      setFieldError("Comment cannot be empty.");
      return;
    }
    setFieldError(undefined);

    setSubmitting(true);
    try {
      await onSubmit(content);
      setContent("");
    } catch (error) {
      if (error instanceof HttpError) {
        const mapped = mapFieldErrors(error.apiError, KNOWN_FIELDS);
        setFieldError(mapped.fieldErrors.content);
        setGeneralErrors(mapped.generalErrors);
      } else {
        setGeneralErrors(["Unable to reach the server. Please try again."]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack component="form" onSubmit={handleSubmit} noValidate spacing={1}>
      {generalErrors.map((message) => (
        <Alert severity="error" key={message}>
          {message}
        </Alert>
      ))}
      <TextField
        label="Add a comment"
        multiline
        minRows={2}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        error={Boolean(fieldError)}
        helperText={fieldError}
      />
      <Button
        type="submit"
        variant="contained"
        disabled={submitting}
        sx={{ alignSelf: "flex-start" }}
      >
        Add Comment
      </Button>
    </Stack>
  );
}

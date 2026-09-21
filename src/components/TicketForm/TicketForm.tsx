import { useState, type FormEvent } from "react";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { PRIORITIES, type Priority } from "../../types/ticket";
import { KNOWN_ASSIGNEES } from "../../config/assignees";
import { HttpError } from "../../api/http";
import { mapFieldErrors } from "../../utils/mapFieldErrors";
import type { TicketCreateRequest } from "../../types/requests";

const KNOWN_FIELDS = ["title", "description", "priority", "assignee"] as const;

export interface TicketFormValues {
  title: string;
  description: string;
  priority: Priority | "";
  assignee: string;
}

const EMPTY_VALUES: TicketFormValues = {
  title: "",
  description: "",
  priority: "",
  assignee: "",
};

export interface TicketFormProps {
  onSubmit: (values: TicketCreateRequest) => Promise<unknown>;
  submitLabel?: string;
  /** Pre-fills the form for editing an existing ticket (US2). */
  initialValues?: TicketFormValues;
}

export function TicketForm({
  onSubmit,
  submitLabel = "Create Ticket",
  initialValues,
}: TicketFormProps) {
  const [values, setValues] = useState<TicketFormValues>(
    initialValues ?? EMPTY_VALUES,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (values.title.trim() === "") {
      errors.title = "Title is required.";
    }
    if (values.description.trim() === "") {
      errors.description = "Description is required.";
    }
    if (values.priority === "") {
      errors.priority = "Priority is required.";
    }
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralErrors([]);

    const clientErrors = validate();
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: values.title,
        description: values.description,
        priority: values.priority as Priority,
        assignee: values.assignee || undefined,
      });
      if (!initialValues) {
        setValues(EMPTY_VALUES);
      }
      setFieldErrors({});
    } catch (error) {
      if (error instanceof HttpError) {
        const mapped = mapFieldErrors(error.apiError, KNOWN_FIELDS);
        setFieldErrors(mapped.fieldErrors);
        setGeneralErrors(mapped.generalErrors);
      } else {
        setGeneralErrors(["Unable to reach the server. Please try again."]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack
      component="form"
      onSubmit={handleSubmit}
      noValidate
      spacing={2}
      sx={{ maxWidth: 480 }}
    >
      {generalErrors.map((message) => (
        <Alert severity="error" key={message}>
          {message}
        </Alert>
      ))}

      <TextField
        label="Title"
        required
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        error={Boolean(fieldErrors.title)}
        helperText={fieldErrors.title}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />

      <TextField
        label="Description"
        required
        multiline
        minRows={3}
        value={values.description}
        onChange={(e) =>
          setValues((v) => ({ ...v, description: e.target.value }))
        }
        error={Boolean(fieldErrors.description)}
        helperText={fieldErrors.description}
      />

      <TextField
        select
        label="Priority"
        required
        value={values.priority}
        onChange={(e) =>
          setValues((v) => ({
            ...v,
            priority: e.target.value as Priority,
          }))
        }
        error={Boolean(fieldErrors.priority)}
        helperText={fieldErrors.priority}
      >
        {PRIORITIES.map((priority) => (
          <MenuItem key={priority} value={priority}>
            {priority}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Assignee"
        value={values.assignee}
        onChange={(e) =>
          setValues((v) => ({ ...v, assignee: e.target.value }))
        }
        error={Boolean(fieldErrors.assignee)}
        helperText={fieldErrors.assignee ?? "Optional — leave unassigned"}
      >
        <MenuItem value="">Unassigned</MenuItem>
        {KNOWN_ASSIGNEES.map((assignee) => (
          <MenuItem key={assignee} value={assignee}>
            {assignee}
          </MenuItem>
        ))}
      </TextField>

      <Button type="submit" variant="contained" disabled={submitting}>
        {submitLabel}
      </Button>
    </Stack>
  );
}

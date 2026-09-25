import { useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import { useSupportUsers } from "../../hooks/useSupportUsers";
import { useReassignTicket } from "../../hooks/useReassignTicket";
import type { UserSummary } from "../../types/ticket";

export interface ReassignControlProps {
  ticketId: string;
  currentAssignee: UserSummary | null;
}

/**
 * ADMIN-only reassignment dropdown. On a failed reassignment, the control
 * stays open with the attempted selection still showing and an inline
 * error — it never reverts before a confirmed success (FR-011a).
 */
export function ReassignControl({ ticketId, currentAssignee }: ReassignControlProps) {
  const { data: supportUsers, isLoading } = useSupportUsers();
  const reassign = useReassignTicket(ticketId);
  const [selectedId, setSelectedId] = useState(currentAssignee?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleChange(nextId: string) {
    setSelectedId(nextId);
    setError(null);
    try {
      await reassign.mutateAsync(nextId);
    } catch {
      setError("Unable to reassign this ticket. Please try again.");
    }
  }

  if (isLoading) {
    return null;
  }

  if (!supportUsers || supportUsers.length === 0) {
    return (
      <TextField
        select
        label="Reassign to"
        value=""
        disabled
        helperText="No support users available"
        sx={{ minWidth: 240 }}
      >
        <MenuItem value="">No support users available</MenuItem>
      </TextField>
    );
  }

  return (
    <Stack spacing={1}>
      <TextField
        select
        label="Reassign to"
        value={selectedId}
        onChange={(e) => handleChange(e.target.value)}
        error={Boolean(error)}
        helperText={error ?? undefined}
        sx={{ minWidth: 240 }}
      >
        {supportUsers.map((supportUser) => (
          <MenuItem key={supportUser.id} value={supportUser.id}>
            {supportUser.name}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

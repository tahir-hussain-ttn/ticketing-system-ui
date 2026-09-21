import { useState } from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import { HttpError } from "../../api/http";
import { useTransitionTicket } from "../../hooks/useTransitionTicket";
import type { Status } from "../../types/ticket";

/**
 * Only *offers* the transitions valid per FR-010 as a usability aid. The
 * backend remains the sole authority (Constitution Principle III): every
 * selection still round-trips through POST .../transitions, and a 409
 * rejection is shown without changing the displayed status.
 */
const NEXT_STATUSES: Record<Status, Status[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export function StatusTransitionMenu({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: Status;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const transitionTicket = useTransitionTicket(ticketId);

  const nextStatuses = NEXT_STATUSES[currentStatus];

  if (nextStatuses.length === 0) {
    return null;
  }

  async function handleSelect(status: Status) {
    setAnchorEl(null);
    setRejection(null);
    try {
      await transitionTicket.mutateAsync(status);
    } catch (error) {
      if (error instanceof HttpError) {
        setRejection(error.apiError.message);
      } else {
        setRejection("Unable to reach the server. Please try again.");
      }
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-haspopup="menu"
      >
        Change Status
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {nextStatuses.map((status) => (
          <MenuItem key={status} onClick={() => handleSelect(status)}>
            {status}
          </MenuItem>
        ))}
      </Menu>
      {rejection && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setRejection(null)}>
          {rejection}
        </Alert>
      )}
    </>
  );
}

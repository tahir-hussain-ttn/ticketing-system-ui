import Chip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";
import type { Status } from "../../types/ticket";

const STATUS_COLOR: Record<Status, ChipProps["color"]> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "default",
  CANCELLED: "error",
};

const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Chip
      size="small"
      color={STATUS_COLOR[status]}
      label={STATUS_LABEL[status]}
      aria-label={`Status: ${STATUS_LABEL[status]}`}
    />
  );
}

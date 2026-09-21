import Chip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";
import type { Priority } from "../../types/ticket";

const PRIORITY_COLOR: Record<Priority, ChipProps["color"]> = {
  LOW: "default",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "error",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={PRIORITY_COLOR[priority]}
      label={priority}
      aria-label={`Priority: ${priority}`}
    />
  );
}

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router-dom";
import { StatusBadge } from "../StatusBadge/StatusBadge";
import { PriorityBadge } from "../PriorityBadge/PriorityBadge";
import type { Ticket } from "../../types/ticket";

export interface TicketListProps {
  tickets: Ticket[];
  /** True when the list is empty because none have matched the active search/filter (FR-015). */
  isFilteredEmpty?: boolean;
}

export function TicketList({
  tickets,
  isFilteredEmpty = false,
}: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <Typography color="text.secondary" role="status">
        {isFilteredEmpty
          ? "No tickets match your search/filter."
          : "No tickets yet. Create one to get started."}
      </Typography>
    );
  }

  return (
    <Table aria-label="Ticket list">
      <TableHead>
        <TableRow>
          <TableCell>Title</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Priority</TableCell>
          <TableCell>Assignee</TableCell>
          <TableCell>Creator</TableCell>
          <TableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell>{ticket.title}</TableCell>
            <TableCell>
              <StatusBadge status={ticket.status} />
            </TableCell>
            <TableCell>
              <PriorityBadge priority={ticket.priority} />
            </TableCell>
            <TableCell>{ticket.assignee?.name ?? "Unassigned"}</TableCell>
            <TableCell>{ticket.createdBy.name}</TableCell>
            <TableCell align="right">
              <Button
                component={RouterLink}
                to={`/tickets/${ticket.id}`}
                size="small"
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

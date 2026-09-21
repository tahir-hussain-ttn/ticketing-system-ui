import { useState } from "react";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Pagination from "@mui/material/Pagination";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { Link as RouterLink } from "react-router-dom";
import { useTickets } from "../hooks/useTickets";
import { TicketList } from "../components/TicketList/TicketList";
import { SearchBar } from "../components/TicketList/SearchBar";
import { StatusFilter } from "../components/TicketList/StatusFilter";
import type { Status } from "../types/ticket";

export function TicketListPage() {
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "">("");

  const { data, isLoading, isError } = useTickets({
    page,
    q: q || undefined,
    status: status || undefined,
  });

  const isFiltered = q !== "" || status !== "";
  const isFilteredEmpty = isFiltered && (data?.content.length ?? 0) === 0;

  function handleSearch(keyword: string) {
    setQ(keyword);
    setPage(0);
  }

  function handleStatusChange(next: Status | "") {
    setStatus(next);
    setPage(0);
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Typography variant="h4" component="h1">
          Tickets
        </Typography>
        <Button component={RouterLink} to="/tickets/new" variant="contained">
          New Ticket
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <SearchBar onSearch={handleSearch} />
        <StatusFilter value={status} onChange={handleStatusChange} />
      </Stack>

      {isLoading && <CircularProgress aria-label="Loading tickets" />}

      {isError && (
        <Alert severity="error">
          Unable to load tickets. Please try again.
        </Alert>
      )}

      {data && (
        <>
          <TicketList tickets={data.content} isFilteredEmpty={isFilteredEmpty} />
          {data.totalPages > 1 && (
            <Stack sx={{ mt: 2 }} alignItems="center">
              <Pagination
                count={data.totalPages}
                page={page + 1}
                onChange={(_, value) => setPage(value - 1)}
              />
            </Stack>
          )}
        </>
      )}
    </Container>
  );
}

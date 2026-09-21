import { useState } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { RouterProvider } from "react-router-dom";
import { muiTheme } from "./theme/muiTheme";
import { router } from "./routes/router";

export function App() {
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (_error, query) => {
            // A query that already has cached data failed on a silent
            // background refetch — no local isError UI is showing for
            // it (the page still renders the stale data), so this is
            // the only place the failure would otherwise be visible
            // (spec.md Edge Cases: backend unreachable).
            if (query.state.data !== undefined) {
              setGlobalError(
                "Lost connection to the server. Showing the last loaded data.",
              );
            }
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <RouterProvider router={router} />
        <Snackbar
          open={globalError !== null}
          autoHideDuration={6000}
          onClose={() => setGlobalError(null)}
        >
          <Alert severity="error" onClose={() => setGlobalError(null)}>
            {globalError}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

import { useState } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { RouterProvider } from "react-router-dom";
import { muiTheme } from "./theme/muiTheme";
import { router } from "./routes/router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useLogout } from "./hooks/useLogout";
import { ChatbotProvider } from "./context/ChatbotContext";
import { ChatbotWidget } from "./components/ChatbotWidget/ChatbotWidget";

/** Shows a "log out" control only when signed in (FR-005). */
export function AppHeader() {
  const { user } = useAuth();
  const logout = useLogout();

  if (!user) {
    return null;
  }

  return (
    <AppBar position="static" color="default" elevation={0}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography variant="subtitle1">
          {user.name} ({user.role})
        </Typography>
        <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
          Log Out
        </Button>
      </Toolbar>
    </AppBar>
  );
}

/** Mounted once, outside the router, so it survives navigation (FR-013a). */
function AuthenticatedChatbot() {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <ChatbotProvider>
      <ChatbotWidget />
    </ChatbotProvider>
  );
}

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
        <AuthProvider>
          <AppHeader />
          <RouterProvider router={router} />
          <AuthenticatedChatbot />
        </AuthProvider>
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

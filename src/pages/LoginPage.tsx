import { useState, type FormEvent } from "react";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../hooks/useLogin";
import { HttpError } from "../api/http";

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneralError(null);

    const errors: { email?: string; password?: string } = {};
    if (email.trim() === "") {
      errors.email = "Email is required.";
    }
    if (password === "") {
      errors.password = "Password is required.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await login.mutateAsync({ email, password });
      navigate("/");
    } catch (error) {
      if (error instanceof HttpError) {
        setGeneralError(error.apiError.message);
      } else if (error instanceof Error) {
        setGeneralError(error.message);
      } else {
        setGeneralError("Unable to reach the server. Please try again.");
      }
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        Log In
      </Typography>
      <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2}>
        {generalError && <Alert severity="error">{generalError}</Alert>}

        <TextField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={Boolean(fieldErrors.email)}
          helperText={fieldErrors.email}
        />

        <TextField
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(fieldErrors.password)}
          helperText={fieldErrors.password}
        />

        <Button type="submit" variant="contained" disabled={login.isPending}>
          Log In
        </Button>
      </Stack>
    </Container>
  );
}

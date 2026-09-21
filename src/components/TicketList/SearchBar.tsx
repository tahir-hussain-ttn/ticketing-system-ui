import { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";

const DEBOUNCE_MS = 300;

export interface SearchBarProps {
  onSearch: (keyword: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => onSearch(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <TextField
      label="Search tickets"
      placeholder="Search by title or description"
      size="small"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      sx={{ minWidth: 260 }}
    />
  );
}

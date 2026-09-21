import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { STATUSES, type Status } from "../../types/ticket";

export interface StatusFilterProps {
  value: Status | "";
  onChange: (status: Status | "") => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <TextField
      select
      label="Status"
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value as Status | "")}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">All</MenuItem>
      {STATUSES.map((status) => (
        <MenuItem key={status} value={status}>
          {status}
        </MenuItem>
      ))}
    </TextField>
  );
}

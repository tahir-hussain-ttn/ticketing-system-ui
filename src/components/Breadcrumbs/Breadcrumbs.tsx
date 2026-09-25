import MuiBreadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";

export interface BreadcrumbSegment {
  label: string;
  to?: string;
}

export interface BreadcrumbsProps {
  segments: BreadcrumbSegment[];
}

export function Breadcrumbs({ segments }: BreadcrumbsProps) {
  return (
    <MuiBreadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
      {segments.map((segment, index) =>
        segment.to ? (
          <Link
            key={index}
            component={RouterLink}
            to={segment.to}
            underline="hover"
            color="inherit"
          >
            {segment.label}
          </Link>
        ) : (
          <Typography key={index} color="text.primary">
            {segment.label}
          </Typography>
        ),
      )}
    </MuiBreadcrumbs>
  );
}

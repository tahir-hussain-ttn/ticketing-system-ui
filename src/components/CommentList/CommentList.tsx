import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Pagination from "@mui/material/Pagination";
import type { CommentPage } from "../../types/comment";

export interface CommentListProps {
  commentPage: CommentPage;
  onPageChange: (page: number) => void;
}

export function CommentList({ commentPage, onPageChange }: CommentListProps) {
  if (commentPage.content.length === 0) {
    return (
      <Typography color="text.secondary" role="status">
        No comments yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      <List aria-label="Comment history">
        {commentPage.content.map((comment) => (
          <ListItem key={comment.id} divider>
            <ListItemText
              primary={comment.content}
              secondary={`${comment.authorName} — ${new Date(
                comment.createdAt,
              ).toLocaleString()}`}
            />
          </ListItem>
        ))}
      </List>
      {commentPage.totalPages > 1 && (
        <Pagination
          count={commentPage.totalPages}
          page={commentPage.page + 1}
          onChange={(_, value) => onPageChange(value - 1)}
        />
      )}
    </Stack>
  );
}

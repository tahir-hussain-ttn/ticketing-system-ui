/**
 * Static known-users list for the assignee dropdown. The backend's
 * `assignee` field is a plain string with no listing endpoint (see
 * research.md, "Assignee list source"), so this list is frontend-owned
 * until/unless the backend exposes one.
 */
export const KNOWN_ASSIGNEES: string[] = [
  "Alice Chen",
  "Bilal Ahmed",
  "Carla Gomez",
  "Daniel Okafor",
  "Emma Rossi",
];

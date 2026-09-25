export type ChatbotTurnStatus = "pending" | "answered" | "no-match" | "error";

export interface ChatbotTurn {
  id: string;
  query: string;
  status: ChatbotTurnStatus;
  response: string | null;
  sourceTickets: string[];
  timestamp: string;
}

export interface ChatbotConversation {
  id: string | null;
  turns: ChatbotTurn[];
  endedAt: string | null;
}

/** Matches the backend's ChatbotTurnResponse schema (backend-api-doc.json). */
export interface ChatbotTurnResponse {
  conversationId: string;
  responseText: string | null;
  sourceTicketIds: string[];
  confidentMatch: boolean;
}

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

export interface ChatbotQueryResponse {
  conversationId: string;
  turnId: string;
  status: "answered" | "no-match";
  response: string | null;
  sourceTickets: string[];
}

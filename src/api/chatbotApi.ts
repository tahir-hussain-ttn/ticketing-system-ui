import { request } from "./http";
import type { ChatbotTurnResponse } from "../types/chatbot";

export const chatbotApi = {
  submitQuery(
    query: string,
    conversationId?: string,
  ): Promise<ChatbotTurnResponse> {
    return request<ChatbotTurnResponse>("/api/v1/chatbot/messages", {
      method: "POST",
      body: { query, conversationId },
    });
  },

  endConversation(conversationId: string): Promise<void> {
    return request<void>(`/api/v1/chatbot/conversations/${conversationId}/end`, {
      method: "POST",
    });
  },
};

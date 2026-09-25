import { request } from "./http";
import type { ChatbotQueryResponse } from "../types/chatbot";

export const chatbotApi = {
  submitQuery(
    query: string,
    conversationId?: string,
  ): Promise<ChatbotQueryResponse> {
    const path = conversationId
      ? `/api/v1/chatbot/conversations/${conversationId}/queries`
      : `/api/v1/chatbot/conversations/queries`;
    return request<ChatbotQueryResponse>(path, {
      method: "POST",
      body: { query },
    });
  },
};

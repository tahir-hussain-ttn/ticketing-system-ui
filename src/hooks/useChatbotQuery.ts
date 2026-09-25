import { useMutation } from "@tanstack/react-query";
import { chatbotApi } from "../api/chatbotApi";

export function useChatbotQuery() {
  return useMutation({
    mutationFn: ({
      query,
      conversationId,
    }: {
      query: string;
      conversationId?: string;
    }) => chatbotApi.submitQuery(query, conversationId),
  });
}

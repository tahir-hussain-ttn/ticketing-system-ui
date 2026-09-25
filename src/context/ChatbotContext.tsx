import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ChatbotConversation, ChatbotTurn } from "../types/chatbot";
import { useChatbotQuery } from "../hooks/useChatbotQuery";

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

const EMPTY_CONVERSATION: ChatbotConversation = {
  id: null,
  turns: [],
  endedAt: null,
};

interface ChatbotContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  conversation: ChatbotConversation;
  isSubmitting: boolean;
  submitQuery: (query: string) => Promise<void>;
  endConversation: () => void;
}

const ChatbotContext = createContext<ChatbotContextValue | undefined>(undefined);

function makeTurnId(): string {
  return `turn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ChatbotProvider({ children }: { children: ReactNode }) {
  // Collapsed by default on every page load (FR-013b).
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<ChatbotConversation>(EMPTY_CONVERSATION);
  const chatbotQuery = useChatbotQuery();
  const lastActivityAt = useRef<number>(Date.now());

  function endConversation(): void {
    setConversation((prev) => ({ ...prev, endedAt: new Date().toISOString() }));
  }

  async function submitQuery(query: string): Promise<void> {
    const trimmed = query.trim();
    if (trimmed === "") {
      return;
    }

    const now = Date.now();
    const inactiveTooLong = now - lastActivityAt.current > INACTIVITY_LIMIT_MS;
    lastActivityAt.current = now;

    const startingNewConversation =
      conversation.id === null || conversation.endedAt !== null || inactiveTooLong;

    const pendingTurn: ChatbotTurn = {
      id: makeTurnId(),
      query: trimmed,
      status: "pending",
      response: null,
      sourceTickets: [],
      timestamp: new Date().toISOString(),
    };

    setConversation((prev) => ({
      id: startingNewConversation ? null : prev.id,
      endedAt: null,
      turns: startingNewConversation ? [pendingTurn] : [...prev.turns, pendingTurn],
    }));

    try {
      const result = await chatbotQuery.mutateAsync({
        query: trimmed,
        conversationId: startingNewConversation
          ? undefined
          : (conversation.id ?? undefined),
      });
      setConversation((prev) => ({
        id: result.conversationId,
        endedAt: null,
        turns: prev.turns.map((turn) =>
          turn.id === pendingTurn.id
            ? {
                ...turn,
                status: result.status,
                response: result.response,
                sourceTickets: result.sourceTickets,
              }
            : turn,
        ),
      }));
    } catch {
      setConversation((prev) => ({
        ...prev,
        turns: prev.turns.map((turn) =>
          turn.id === pendingTurn.id ? { ...turn, status: "error" } : turn,
        ),
      }));
    }
  }

  return (
    <ChatbotContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        conversation,
        isSubmitting: chatbotQuery.isPending,
        submitQuery,
        endConversation,
      }}
    >
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot(): ChatbotContextValue {
  const context = useContext(ChatbotContext);
  if (!context) {
    throw new Error("useChatbot must be used within a ChatbotProvider");
  }
  return context;
}

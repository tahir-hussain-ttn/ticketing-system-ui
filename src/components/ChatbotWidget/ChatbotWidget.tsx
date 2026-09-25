import Fab from "@mui/material/Fab";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import { useChatbot } from "../../context/ChatbotContext";
import { ChatbotConversationView } from "./ChatbotConversationView";

/** Collapsed by default (FR-013b); available on every page (FR-013). */
export function ChatbotWidget() {
  const { isOpen, open, close } = useChatbot();

  return (
    <>
      {isOpen && <ChatbotConversationView />}
      <Fab
        color="primary"
        aria-label={isOpen ? "Close resolution assistant" : "Open resolution assistant"}
        onClick={isOpen ? close : open}
        sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1300 }}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </Fab>
    </>
  );
}

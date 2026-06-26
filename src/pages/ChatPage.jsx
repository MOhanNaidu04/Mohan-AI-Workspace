import { useApp } from '../context/AppContext';
import { useNotification } from '../context/NotificationContext';
import ChatWindow from '../components/chat/ChatWindow';
import { promptTemplates } from '../data/prompts';
import { downloadFile, exportChatAsJSON, exportChatAsText } from '../utils/exportChat';
import { useNavigate } from 'react-router-dom';
import { buildChatShareText, buildChatShareUrl, buildShareTargets } from '../utils/shareChat';

export default function ChatPage() {
  const {
    selectedChat,
    messages,
    loading,
    sendMessage,
    draftPrompt,
    setDraftPrompt,
    createNewChat,
  } = useApp();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const handleSendMessage = async (text) => {
    const cleanText = text?.trim();

    if (!cleanText) {
      console.warn('[ChatPage] Attempted to send an empty message — ignored.');
      return;
    }

    console.log('[ChatPage] Sending message to chat "%s": "%s"', selectedChat?.title, cleanText.slice(0, 60));
    setDraftPrompt('');
    await sendMessage(cleanText, notify);
  };

  const handleSelectTemplate = (text) => {
    if (!text?.trim()) {
      console.warn('[ChatPage] Template selected with empty text — ignored.');
      return;
    }
    console.log('[ChatPage] Prompt template loaded into input.');
    setDraftPrompt(text);
    notify('Template loaded', 'Prompt inserted into the input box.');
  };

  const exportName =
    selectedChat?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chat';

  const handleExportText = () => {
    if (!messages || messages.length === 0) {
      console.warn('[ChatPage] Export TXT requested but no messages exist in this chat.');
      notify('Nothing to export', 'This chat has no messages to export yet.', 'error');
      return;
    }
    console.log('[ChatPage] Exporting chat "%s" as TXT (%d messages)', selectedChat?.title, messages.length);
    downloadFile(exportChatAsText(selectedChat, messages), `${exportName}.txt`, 'text/plain');
    notify('Chat exported', 'Text export downloaded successfully.');
  };

  const handleExportJSON = () => {
    if (!messages || messages.length === 0) {
      console.warn('[ChatPage] Export JSON requested but no messages exist in this chat.');
      notify('Nothing to export', 'This chat has no messages to export yet.', 'error');
      return;
    }
    console.log('[ChatPage] Exporting chat "%s" as JSON (%d messages)', selectedChat?.title, messages.length);
    downloadFile(exportChatAsJSON(selectedChat, messages), `${exportName}.json`, 'application/json');
    notify('Chat exported', 'JSON export downloaded successfully.');
  };

  const handleNewChat = async () => {
    console.log('[ChatPage] Creating new chat in category "business".');
    const chat = await createNewChat('business');
    setDraftPrompt('');
    navigate(`/chat?chat=${encodeURIComponent(chat.id)}`);
    notify('New chat created', 'Start typing to begin a fresh conversation.');
  };

  const handleCopyLink = async () => {
    if (!selectedChat?.id) {
      notify('No chat selected', 'Open a chat before copying its link.', 'error');
      return;
    }

    const shareUrl = buildChatShareUrl(selectedChat.id);
    await navigator.clipboard.writeText(shareUrl);
    notify('Link copied', 'Chat link copied to your clipboard.');
  };

  const openShareUrl = (url, label) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    notify('Share ready', `${label} share opened in a new tab.`);
  };

  const handleShare = async () => {
    if (!selectedChat?.id) {
      notify('No chat selected', 'Open a chat before sharing.', 'error');
      return;
    }

    const shareUrl = buildChatShareUrl(selectedChat.id);
    const shareText = buildChatShareText(selectedChat.title);
    const targets = buildShareTargets(shareUrl, shareText);

    if (navigator.share) {
      await navigator.share({
        title: selectedChat.title,
        text: shareText,
        url: shareUrl,
      });
      return;
    }

    openShareUrl(targets.x, 'X');
  };

  const handleShareX = () => {
    if (!selectedChat?.id) return notify('No chat selected', 'Open a chat before sharing.', 'error');
    const shareUrl = buildChatShareUrl(selectedChat.id);
    const shareText = buildChatShareText(selectedChat.title);
    openShareUrl(buildShareTargets(shareUrl, shareText).x, 'X');
  };

  const handleShareWhatsApp = () => {
    if (!selectedChat?.id) return notify('No chat selected', 'Open a chat before sharing.', 'error');
    const shareUrl = buildChatShareUrl(selectedChat.id);
    const shareText = buildChatShareText(selectedChat.title);
    openShareUrl(buildShareTargets(shareUrl, shareText).whatsapp, 'WhatsApp');
  };

  const handleShareLinkedIn = () => {
    if (!selectedChat?.id) return notify('No chat selected', 'Open a chat before sharing.', 'error');
    const shareUrl = buildChatShareUrl(selectedChat.id);
    const shareText = buildChatShareText(selectedChat.title);
    openShareUrl(buildShareTargets(shareUrl, shareText).linkedin, 'LinkedIn');
  };

  return (
    <ChatWindow
      activeChat={selectedChat}
      messages={messages}
      loading={loading}
      promptValue={draftPrompt}
      onPromptChange={setDraftPrompt}
      onSendMessage={handleSendMessage}
      onSelectTemplate={handleSelectTemplate}
      quickTemplates={promptTemplates}
      onExportText={handleExportText}
      onExportJSON={handleExportJSON}
      onNewChat={handleNewChat}
      onCopyLink={handleCopyLink}
      onShare={handleShare}
      onShareX={handleShareX}
      onShareWhatsApp={handleShareWhatsApp}
      onShareLinkedIn={handleShareLinkedIn}
    />
  );
}

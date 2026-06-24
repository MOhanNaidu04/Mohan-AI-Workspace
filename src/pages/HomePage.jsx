import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useNotification } from '../context/NotificationContext';

const suggestions = [
  {
    title: 'Write a script',
    text: 'Write a TypeScript script that fetches data from an API and processes it.',
  },
  {
    title: 'Analyze document',
    text: 'Analyze this document and provide a comprehensive summary with key insights.',
  },
  {
    title: 'Brainstorm ideas',
    text: 'Brainstorm 10 innovative product ideas for AI-powered tools in 2025.',
  },
  {
    title: 'Research topic',
    text: 'Provide a comprehensive research overview on quantum computing and its applications.',
  },
];

export default function HomePage() {
  const { loading, sendMessage, draftPrompt, setDraftPrompt } = useApp();
  const { notify } = useNotification();
  const [promptText, setPromptText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Transfer any draft prompt from another page into the local input
  useEffect(() => {
    if (draftPrompt) {
      console.log('[HomePage] Draft prompt received from another page — loading into input.');
      setPromptText(draftPrompt);
      setDraftPrompt('');
    }
  }, [draftPrompt, setDraftPrompt]);

  const handleSend = async () => {
    const trimmed = promptText.trim();

    if (!trimmed) {
      console.warn('[HomePage] Send attempted with empty prompt — ignored.');
      notify('Empty message', 'Please type a message before sending.', 'error');
      return;
    }

    if (loading) {
      console.warn('[HomePage] Send attempted while AI is already responding — ignored.');
      return;
    }

    console.log('[HomePage] Sending message: "%s"', trimmed.slice(0, 80));
    setPromptText('');
    await sendMessage(trimmed, notify);
  };

  // Set up speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[HomePage] Speech Recognition API not available in this browser.');
      return;
    }

    console.log('[HomePage] Speech Recognition API detected — initializing.');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      setPromptText((prev) => (prev ? `${prev} ${final}${interim}` : `${final}${interim}`));
    };

    recognition.onstart = () => {
      console.log('[HomePage] Speech recognition started.');
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log('[HomePage] Speech recognition ended.');
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('[HomePage] Speech recognition error:', event.error);
      const messages = {
        'not-allowed': 'Microphone access was denied. Please allow microphone permission and try again.',
        'no-speech': 'No speech was detected. Please speak clearly and try again.',
        'network': 'Speech recognition requires a network connection. Please check your internet.',
        'audio-capture': 'No microphone was found. Please connect a microphone and try again.',
      };
      const message = messages[event.error] || `Speech recognition error: ${event.error}`;
      notify('Voice input error', message, 'error');
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (_) {
        // Safely ignore stop errors during cleanup
      }
      recognitionRef.current = null;
    };
  }, [notify]);

  const toggleListen = () => {
    const recognition = recognitionRef.current;

    if (!recognition) {
      console.warn('[HomePage] Voice input toggled but SpeechRecognition is not available.');
      notify('Voice not supported', 'Your browser does not support speech recognition. Try Chrome or Edge.', 'error');
      return;
    }

    if (isListening) {
      console.log('[HomePage] Stopping speech recognition.');
      recognition.stop();
    } else {
      console.log('[HomePage] Starting speech recognition.');
      try {
        recognition.start();
      } catch (err) {
        console.error('[HomePage] Failed to start speech recognition:', err);
        notify('Voice error', 'Could not start the microphone. Please check browser permissions.', 'error');
      }
    }
  };

  const handleSelectTemplate = (suggestion) => {
    if (!suggestion?.text?.trim()) {
      console.warn('[HomePage] Suggestion selected but has no text — ignored.');
      return;
    }
    console.log('[HomePage] Suggestion selected: "%s"', suggestion.title);
    setPromptText(suggestion.text);
    notify('Template loaded', `"${suggestion.title}" inserted into the input box.`);
  };

  return (
    <div className="w-full py-4 text-slate-950 dark:text-white sm:px-4 sm:py-10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 sm:gap-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-slate-200/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-slate-950/5 sm:rounded-3xl sm:p-10"
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-accent-500 dark:text-accent-400">Celume AI</p>
            <h1 className="mt-4 text-3xl font-semibold text-slate-950 dark:text-white sm:text-4xl">
              Good afternoon, Mohan
            </h1>
          </div>

          <div className="mt-6 rounded-2xl bg-white/70 p-4 backdrop-blur-lg dark:bg-slate-900/70 sm:mt-10 sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300">How can I help you today?</p>
              <span className="hidden sm:inline rounded-full bg-white/5 dark:bg-white/[0.02] backdrop-blur-lg px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-700 dark:text-slate-100">
                Celume Ultra 3.1
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft backdrop-blur-lg dark:bg-slate-950 sm:flex-row sm:items-center sm:rounded-full">
              <button
                type="button"
                onClick={() => {
                  console.log('[HomePage] Clearing prompt input.');
                  setPromptText('');
                }}
                title="Clear input"
                className="h-12 w-12 shrink-0 rounded-full bg-accent-500 text-lg font-bold text-white transition hover:bg-accent-600"
              >
                +
              </button>
              <input
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); }}
                placeholder="Ask anything…"
                aria-label="Message input"
                className="min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={toggleListen}
                aria-label={isListening ? 'Stop recording' : 'Start voice input'}
                className={`h-12 w-full rounded-full px-6 text-sm font-semibold text-white transition sm:ml-2 sm:w-auto ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-accent-500 hover:bg-accent-600'
                }`}
              >
                {isListening ? '⏹ Stop' : '🎙 Record'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Quick Suggestions ─────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.title}
              type="button"
              onClick={() => handleSelectTemplate(suggestion)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.24, delay: index * 0.05 }}
              className="cursor-pointer rounded-2xl border border-white/70 bg-white/70 p-4 text-left shadow-soft backdrop-blur-lg transition hover:bg-white dark:border-slate-800 dark:bg-slate-950/70 dark:hover:bg-slate-900 sm:p-6"
            >
              <p className="text-sm font-semibold text-slate-950 dark:text-white">{suggestion.title}</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{suggestion.text}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

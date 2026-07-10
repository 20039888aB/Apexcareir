import { motion } from 'framer-motion';
import { Bot, Expand, Minus, Send, ShieldAlert, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAIAssistantChat } from '../hooks/useAIAssistantChat';

export default function ApexcareAIFab() {
  const [isOpen, setIsOpen] = useState(false);
  const { input, setInput, messages, sendMessage, clearChat, isPending, sessionId, recentSessions, selectSession } =
    useAIAssistantChat();
  const location = useLocation();

  if (location.pathname === '/apexcareir-ai') {
    return null;
  }

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isPending) return;
    sendMessage(value);
    setInput('');
  };

  return (
    <>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="fixed bottom-24 right-4 z-50 h-[480px] w-[min(360px,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-white/50 bg-white/95 shadow-2xl backdrop-blur-md sm:right-6"
        >
          <div className="flex items-center justify-between border-b border-gold/15 bg-sky-pad/45 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy text-white">
                <Bot size={16} />
              </span>
              <div>
                <p className="text-xs font-semibold text-forest">ApexcareIR AI</p>
                <p className="text-[11px] text-forest/60">Educational IR assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                to="/apexcareir-ai"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gold/25 bg-white text-forest hover:border-burgundy/40 hover:text-burgundy"
                aria-label="Expand AI chat"
                title="Expand"
                onClick={() => setIsOpen(false)}
              >
                <Expand size={14} />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gold/25 bg-white text-forest hover:border-gold/40"
                aria-label="Minimize AI chat"
                title="Minimize"
              >
                <Minus size={14} />
              </button>
            </div>
          </div>

          <div className="mx-3 mt-3 rounded-xl border border-gold/30 bg-gold/10 p-2 text-[11px] text-burgundy-dark">
            <div className="flex items-start gap-2">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <p>Education only. Not a medical diagnosis.</p>
            </div>
          </div>

          <div className="mx-3 mt-2 flex flex-wrap gap-2">
            {['Symptoms', 'Procedures', 'Recovery'].map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-gold/20 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-burgundy/80"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="mx-3 mt-2">
            <label className="mb-1 block text-[11px] font-semibold text-forest/70">Recent Conversations</label>
            <select
              value={sessionId ?? ''}
              onChange={(event) => {
                if (event.target.value) {
                  selectSession(event.target.value);
                }
              }}
              className="w-full rounded-lg border border-gold/20 bg-white px-2 py-1.5 text-[11px] text-forest"
            >
              <option value="" disabled>
                Select conversation
              </option>
              {recentSessions.map((session) => (
                <option key={session.session_id} value={session.session_id}>
                  {session.title}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 h-[246px] space-y-2 overflow-y-auto px-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`max-w-[92%] rounded-2xl px-3 py-2 text-xs whitespace-pre-line ${
                  message.role === 'user'
                    ? 'ml-auto bg-burgundy text-white'
                    : 'border border-sky-light/40 bg-sky-pad/60 text-forest'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="absolute inset-x-0 bottom-0 border-t border-sky-pad/70 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={clearChat}
                className="inline-flex items-center gap-1 rounded-lg border border-gold/20 bg-white px-2 py-1 text-[11px] font-medium text-forest hover:border-burgundy/30 hover:bg-burgundy/5 hover:text-burgundy"
                disabled={messages.length <= 1}
              >
                <Trash2 size={12} />
                Clear
              </button>
              <span className="text-[11px] text-forest/50">Press Enter to send</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about IR procedures, symptoms..."
                className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/25 px-3 py-2 text-xs text-forest outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
              />
              <button type="submit" className="btn-burgundy !rounded-xl !px-3 !py-2" disabled={isPending}>
                <Send size={14} />
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <motion.div
        className="fixed bottom-6 right-24 z-50 sm:right-[5.5rem]"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="group flex h-14 items-center gap-2 rounded-full border border-white/35 bg-burgundy px-4 text-white shadow-2xl backdrop-blur-md"
          aria-label={isOpen ? 'Close ApexcareIR AI' : 'Open ApexcareIR AI'}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            {isOpen ? <X size={20} /> : <Bot size={20} />}
          </span>
          <span className="hidden text-xs font-semibold tracking-wide xl:block">
            {isOpen ? 'Close AI' : 'ApexcareIR AI'}
          </span>
        </button>
      </motion.div>
    </>
  );
}

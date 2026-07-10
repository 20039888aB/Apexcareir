import { Bot, Send, ShieldAlert, Trash2, Sparkles, ScanLine, HeartHandshake } from 'lucide-react';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FloatingIRMotifs from '../components/animations/FloatingIRMotifs';
import FadeIn from '../components/animations/FadeIn';
import { useAIAssistantChat } from '../hooks/useAIAssistantChat';

export default function ApexcareAIAssistantPage() {
  const { input, setInput, messages, sendMessage, clearChat, isPending, sessionId, recentSessions, selectSession } =
    useAIAssistantChat();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isPending) return;
    sendMessage(value);
    setInput('');
  };

  const aiHighlights = [
    {
      title: 'Patient-friendly explanations',
      text: 'Get simpler educational explanations of IR procedures, preparation, and recovery.',
      Icon: HeartHandshake,
    },
    {
      title: 'Interventional radiology focus',
      text: 'Designed around image-guided procedures, symptoms, and specialist patient education.',
      Icon: ScanLine,
    },
    {
      title: 'Safe by design',
      text: 'Educational only, with strict boundaries against presenting a diagnosis as certain.',
      Icon: Sparkles,
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-hero-gradient py-20">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="section-heading">ApexcareIR AI</h1>
            <p className="mt-4 text-navy/60 max-w-3xl mx-auto">
              Educational AI assistant for Interventional Radiology information, patient guidance, likely possibilities,
              and procedure explanations with strict safety boundaries.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {['Patient Education', 'Procedure Guidance', 'Safety Boundaries', 'Recent Conversations'].map((label) => (
                <span key={label} className="ir-chip">
                  {label}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {aiHighlights.map(({ title, text, Icon }, index) => (
              <FadeIn key={title} delay={index * 0.06}>
                <div className="card modern-ir-card !p-5 h-full">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/12 text-forest">
                    <Icon size={18} />
                  </div>
                  <h2 className="font-semibold text-navy mb-2">{title}</h2>
                  <p className="text-sm leading-relaxed text-navy/60">{text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <div className="mb-4 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-burgundy-dark text-sm flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <p>
                Safety notice: ApexcareIR AI is for education only. It does not provide medical diagnosis. Always consult
                a qualified healthcare professional for diagnosis and treatment decisions.
              </p>
            </div>
          </FadeIn>

          <div className="card modern-ir-card !p-0 overflow-hidden">
            <div className="border-b border-sky-pad/70 px-5 py-3 flex flex-col gap-3 bg-sky-pad/40 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-burgundy" />
                <p className="text-sm font-semibold text-navy">ApexcareIR AI Assistant</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={sessionId ?? ''}
                  onChange={(event) => {
                    if (event.target.value) {
                      selectSession(event.target.value);
                    }
                  }}
                  className="rounded-lg border border-gold/20 bg-white/90 px-3 py-1.5 text-xs text-slate-700"
                >
                  <option value="" disabled>
                    Recent conversations
                  </option>
                  {recentSessions.map((session) => (
                    <option key={session.session_id} value={session.session_id}>
                      {session.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={clearChat}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gold/20 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={messages.length <= 1}
                >
                  <Trash2 size={13} />
                  Clear Chat
                </button>
              </div>
            </div>

            <div className="h-[440px] overflow-y-auto px-4 py-4 space-y-3 bg-white/85">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                    message.role === 'user'
                      ? 'ml-auto bg-burgundy text-white'
                      : 'bg-sky-pad/60 text-navy border border-sky-light/40'
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>

            <form onSubmit={onSubmit} className="border-t border-sky-pad/70 p-4 flex items-center gap-2 bg-white">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about IR procedures, symptoms, recovery, preparation..."
                className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/25 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
              />
              <button type="submit" className="btn-burgundy !rounded-xl !px-4 !py-3" disabled={isPending}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

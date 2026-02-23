'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AITerminalProps {
  wallet: string | undefined;
  weekNumber: number | null;
}

export default function AITerminal({ wallet, weekNumber }: AITerminalProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !wallet || streaming) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/terminal/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, messages: newMessages, weekNumber }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `Error: ${err.error || 'Request failed'}`,
          };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6);
          try {
            const event = JSON.parse(json);
            if (event.type === 'mode') {
              setIsOwner(event.isOwner);
            } else if (event.type === 'text') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + event.text,
                };
                return updated;
              });
            } else if (event.type === 'error') {
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: `Error: ${event.error}`,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Error: Connection failed. Please try again.',
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, wallet, messages, streaming, weekNumber]);

  const accentColor = isOwner ? '#f59e0b' : '#06b6d4';

  if (!wallet) return null;

  return (
    <>
      {/* Toggle Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="ai-terminal-toggle"
          style={{ borderColor: `${accentColor}40`, boxShadow: `0 0 20px ${accentColor}15` }}
          title="TURBO AI Assistant"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="ai-terminal-panel" style={{ borderColor: `${accentColor}30` }}>
          {/* Header */}
          <div className="ai-terminal-header" style={{ borderBottomColor: `${accentColor}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <span className="syne" style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.08em' }}>
                TURBO AI
              </span>
              {isOwner && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(245,158,11,0.15)',
                  color: '#f59e0b',
                  border: '1px solid rgba(245,158,11,0.25)',
                }}>
                  OWNER MODE
                </span>
              )}
              {!isOwner && messages.length > 0 && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(6,182,212,0.15)',
                  color: '#06b6d4',
                  border: '1px solid rgba(6,182,212,0.25)',
                }}>
                  TA MODE
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#52525b',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="ai-terminal-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#3f3f46' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', opacity: 0.4 }}>
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
                <div className="syne" style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                  {weekNumber ? `Week ${weekNumber} Assistant` : 'TURBO AI Assistant'}
                </div>
                <div style={{ fontSize: 11 }}>
                  Ask about your assignment
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`ai-terminal-message ${msg.role}`}
                style={msg.role === 'user' ? { borderColor: `${accentColor}30` } : undefined}
              >
                <div className="ai-terminal-message-label" style={{ color: msg.role === 'user' ? accentColor : '#52525b' }}>
                  {msg.role === 'user' ? 'You' : 'TURBO AI'}
                </div>
                <div className="ai-terminal-message-content">
                  {msg.content || (streaming && i === messages.length - 1 ? (
                    <span className="ai-terminal-cursor">|</span>
                  ) : null)}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="ai-terminal-input" style={{ borderTopColor: `${accentColor}15` }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={streaming ? 'Thinking...' : 'Ask about your assignment...'}
              disabled={streaming}
              style={{ borderColor: `${accentColor}20` }}
            />
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              style={{
                background: input.trim() && !streaming ? accentColor : '#27272a',
                borderColor: input.trim() && !streaming ? accentColor : '#27272a',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !streaming ? '#000' : '#52525b'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

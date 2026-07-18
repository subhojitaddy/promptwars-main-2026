import React, { useEffect, useRef, useState } from 'react';
import { Send, BrainCircuit, RefreshCw } from 'lucide-react';
import { apiFetch } from '../config';
import { renderMarkdown } from '../utils/markdown';

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  created_at: string;
}

export const AICoach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChatHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const res = await apiFetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userText = inputText;
    setInputText('');
    setIsLoading(true);

    // Optimistically add user message to list
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ sender: 'user', text: userText })
      });

      if (res.ok) {
        const coachMsg = await res.json();
        setMessages(prev => [...prev, coachMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'coach',
            text: 'I apologize, but I had trouble processing that message. Please try sending it again.',
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'coach',
          text: 'Network issue detected. Please check if the backend is running.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div 
      className="glass-panel" 
      style={{ 
        height: '600px', 
        display: 'flex', 
        flexDirection: 'column', 
        marginTop: '24px', 
        overflow: 'hidden' 
      }}
    >
      {/* Chat Header */}
      <div 
        style={{ 
          padding: '16px 24px', 
          borderBottom: '1px solid rgba(255,255,255,0.06)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.01)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            background: 'var(--accent-cyan)',
            boxShadow: '0 0 10px var(--accent-cyan)'
          }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>GenAI Habit Coach</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CBT & Behavioral Support</span>
          </div>
        </div>
        <button 
          onClick={fetchChatHistory} 
          disabled={isHistoryLoading}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            padding: '4px'
          }}
          title="Refresh chat history"
        >
          <RefreshCw size={16} className={isHistoryLoading ? 'float-effect' : ''} />
        </button>
      </div>

      {/* Messages Window */}
      <div 
        style={{ 
          flex: 1, 
          padding: '24px', 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px' 
        }}
      >
        {messages.length === 0 && !isHistoryLoading ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '20px'
          }}>
            <BrainCircuit size={48} style={{ color: 'var(--accent-purple)', marginBottom: '16px', opacity: 0.7 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Start your reflection journey</p>
            <p style={{ fontSize: '0.88rem', maxWidth: '320px' }}>
              Say hello or ask how to break a craving. Let's work together to replace bad habits with mindfulness.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isCoach = m.sender === 'coach';
            return (
              <div 
                key={m.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: isCoach ? 'flex-start' : 'flex-end',
                  width: '100%'
                }}
              >
                <div 
                  style={{ 
                    maxWidth: '80%', 
                    padding: '14px 18px', 
                    borderRadius: isCoach ? '0 var(--radius-md) var(--radius-md) var(--radius-md)' : 'var(--radius-md) 0 var(--radius-md) var(--radius-md)',
                    background: isCoach ? 'rgba(255, 255, 255, 0.04)' : 'linear-gradient(135deg, rgba(127, 0, 255, 0.2), rgba(0, 242, 254, 0.2))',
                    border: isCoach ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 242, 254, 0.1)',
                    color: 'var(--text-primary)',
                    fontSize: '0.94rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {renderMarkdown(m.text)}
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <div 
              style={{ 
                padding: '14px 18px', 
                borderRadius: '0 var(--radius-md) var(--radius-md) var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                gap: '4px',
                alignItems: 'center'
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'float 1.2s infinite' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'float 1.2s infinite 0.2s' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'float 1.2s infinite 0.4s' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form 
        onSubmit={handleSendMessage}
        style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.1)'
        }}
      >
        <input 
          type="text" 
          className="input-field" 
          placeholder="Ask for coaching advice or reflect on your day..." 
          aria-label="Ask for coaching advice or reflect on your day"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
          style={{ flex: 1 }}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={isLoading || !inputText.trim()}
          style={{ 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

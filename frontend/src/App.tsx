import { useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { AICoach } from './components/AICoach';
import { LogSession } from './components/LogSession';
import { PanicButton } from './components/PanicButton';
import { ShieldAlert, BarChart3, Brain, PlusCircle, Sparkles } from 'lucide-react';
import { apiFetch } from './config';

interface Habit {
  id: number;
  name: string;
  category: string;
  target_description: string;
  streak: number;
  longest_streak: number;
  last_checked_date: string | null;
}

function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'coach' | 'logs'>('dashboard');
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHabits = async () => {
    try {
      setError(null);
      const response = await apiFetch('/api/habits');
      if (response.ok) {
        const data = await response.json();
        setHabits(data);
      } else {
        setError('Failed to fetch habit details from server.');
      }
    } catch (err) {
      setError('Cannot connect to the backend server. Please verify if docker containers are running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header 
        className="glass-panel" 
        style={{ 
          margin: '24px 24px 0 24px', 
          padding: '16px 28px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
            padding: '8px',
            borderRadius: '12px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              MindfulFlow
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '-2px' }}>
              GenAI Habit Reclamation
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.88rem',
              background: activeTab === 'dashboard' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'dashboard' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-secondary)'
            }}
          >
            <BarChart3 size={16} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('coach')} 
            className="btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.88rem',
              background: activeTab === 'coach' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'coach' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: activeTab === 'coach' ? 'var(--accent-purple)' : 'var(--text-secondary)'
            }}
          >
            <Brain size={16} />
            AI Coach
          </button>
          <button 
            onClick={() => setActiveTab('logs')} 
            className="btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              fontSize: '0.88rem',
              background: activeTab === 'logs' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              borderColor: activeTab === 'logs' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: activeTab === 'logs' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
            }}
          >
            <PlusCircle size={16} />
            Log & Configure
          </button>
        </nav>

        {/* SOS Emergency Trigger */}
        <button 
          onClick={() => setIsPanicOpen(true)}
          className="btn-panic"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '10px 18px',
            fontSize: '0.88rem' 
          }}
        >
          <ShieldAlert size={16} />
          SOS Grounding
        </button>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flex: 1, padding: '24px 24px 60px 24px' }}>
        {error && (
          <div 
            className="glass-panel glow-purple" 
            style={{ 
              padding: '16px 24px', 
              backgroundColor: 'rgba(244, 63, 94, 0.1)', 
              borderColor: 'rgba(244, 63, 94, 0.3)',
              color: 'var(--text-primary)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '24px',
              fontSize: '0.9rem'
            }}
          >
            <strong>Connection Warning:</strong> {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex-center" style={{ minHeight: '300px', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'breathing 2s infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Synchronizing your dashboard...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard habits={habits} onRefresh={fetchHabits} />}
            {activeTab === 'coach' && <AICoach />}
            {activeTab === 'logs' && <LogSession habits={habits} onRefresh={fetchHabits} />}
          </>
        )}
      </main>

      {/* SOS Modal Overlay */}
      <PanicButton 
        isOpen={isPanicOpen} 
        onClose={() => setIsPanicOpen(false)} 
        habits={habits.map(h => ({ id: h.id, name: h.name }))} 
      />
    </div>
  );
}

export default App;

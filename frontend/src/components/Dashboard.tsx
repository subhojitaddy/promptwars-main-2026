import React, { useEffect, useState } from 'react';
import { Flame, Brain, Check, ShieldAlert, Sparkles, Trash2, Calendar } from 'lucide-react';
import { apiFetch } from '../config';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Habit {
  id: number;
  name: string;
  category: string;
  target_description: string;
  streak: number;
  longest_streak: number;
  last_checked_date: string | null;
}

interface CravingLog {
  id: number;
  habit_id: number;
  severity: number;
  trigger_context: string;
  mood: string;
  was_resisted: boolean;
  created_at: string;
}

interface DashboardProps {
  habits: Habit[];
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ habits, onRefresh }) => {
  const [nudge, setNudge] = useState<string>('Loading your personalized AI nudge...');
  const [logs, setLogs] = useState<CravingLog[]>([]);

  // Fetch AI Nudge
  const fetchNudge = async () => {
    try {
      const res = await apiFetch('/api/nudge');
      if (res.ok) {
        const data = await res.json();
        setNudge(data.response);
      }
    } catch (err) {
      setNudge('Keep up the mindfulness. Every step you take today is a seed for tomorrow.');
    }
  };

  // Fetch all logs to plot chart
  const fetchLogs = async () => {
    try {
      const res = await apiFetch('/api/logs');
      if (res.ok) {
        const data: CravingLog[] = await res.json();
        // Sort logs by date
        data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs for chart:', err);
    }
  };

  useEffect(() => {
    if (habits.length > 0) {
      fetchNudge();
      fetchLogs();
    } else {
      setNudge('Create a habit in the "Log & Configure" tab to generate personalized coaching nudges!');
    }
  }, [habits]);

  // Handle Habit Check-in
  const handleCheckin = async (habitId: number) => {
    try {
      const res = await apiFetch(`/api/habits/${habitId}/checkin`, {
        method: 'POST'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error during check-in:', err);
    }
  };

  // Handle Habit Delete
  const handleDelete = async (habitId: number) => {
    if (!confirm('Are you sure you want to delete this habit and all its logs?')) return;
    try {
      const res = await apiFetch(`/api/habits/${habitId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error deleting habit:', err);
    }
  };

  // Check if habit is already checked in today
  const isAlreadyCheckedInToday = (lastCheckedDate: string | null) => {
    if (!lastCheckedDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return lastCheckedDate === today;
  };

  // Prep Chart Data (last 7 logs or aggregate daily severity)
  const chartData = {
    labels: logs.slice(-10).map(l => new Date(l.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
    datasets: [
      {
        fill: true,
        label: 'Craving Severity (1-5)',
        data: logs.slice(-10).map(l => l.severity),
        borderColor: '#00f2fe',
        backgroundColor: 'rgba(0, 242, 254, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#00f2fe',
        pointBorderColor: '#fff',
        pointHoverRadius: 8
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#11131c',
        titleFont: { family: 'Outfit' },
        bodyFont: { family: 'Inter' },
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
      }
    },
    scales: {
      y: {
        min: 1,
        max: 5,
        grid: {
          color: 'rgba(255,255,255,0.05)'
        },
        ticks: {
          color: '#9ca3af',
          stepSize: 1
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#9ca3af',
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginTop: '24px' }}>
      
      {/* AI Nudge Banner */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px', 
          background: 'linear-gradient(135deg, rgba(127, 0, 255, 0.08), rgba(0, 242, 254, 0.08))',
          borderLeft: '4px solid var(--accent-purple)',
          display: 'flex',
          alignItems: 'start',
          gap: '16px',
          boxShadow: 'var(--shadow-glow)'
        }}
      >
        <div style={{ 
          background: 'rgba(127, 0, 255, 0.15)', 
          padding: '12px', 
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-purple)'
        }}>
          <Brain className="float-effect" size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '6px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} style={{ color: 'var(--accent-cyan)' }} />
            Mindful Nudge
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.98rem', lineHeight: '1.5' }}>
            "{nudge}"
          </p>
        </div>
      </div>

      {/* Habits Grid */}
      <div>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>Active Habits</h3>
        {habits.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No habits configured yet. Go to the <strong>Log & Configure</strong> tab to start breaking bad patterns!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {habits.map((h) => {
              const checkedIn = isAlreadyCheckedInToday(h.last_checked_date);
              return (
                <div key={h.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {/* Category Tag */}
                  <span style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    right: '16px', 
                    fontSize: '0.75rem', 
                    padding: '4px 8px', 
                    borderRadius: '12px',
                    background: h.category === 'Digital' ? 'rgba(0, 242, 254, 0.1)' : 
                                h.category === 'Substance' ? 'rgba(244, 63, 94, 0.1)' :
                                h.category === 'Health' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: h.category === 'Digital' ? 'var(--accent-cyan)' : 
                           h.category === 'Substance' ? 'var(--accent-rose)' :
                           h.category === 'Health' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {h.category}
                  </span>

                  <h4 style={{ fontSize: '1.25rem', marginBottom: '8px', maxWidth: '75%' }}>{h.name}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', flex: 1, marginBottom: '20px' }}>
                    {h.target_description || "No limit target description provided."}
                  </p>

                  {/* Streak displays */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Flame style={{ 
                        color: h.streak > 0 ? 'var(--accent-amber)' : 'var(--text-muted)',
                        fill: h.streak > 0 ? 'var(--accent-amber)' : 'none',
                        filter: h.streak > 0 ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.5))' : 'none'
                      }} />
                      <div>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'block', lineHeight: 1 }}>{h.streak}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Streak</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar style={{ color: 'var(--text-muted)' }} size={20} />
                      <div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'semibold', display: 'block', lineHeight: 1 }}>{h.longest_streak}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Best Streak</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => handleCheckin(h.id)}
                      disabled={checkedIn}
                      className="btn-primary"
                      style={{ 
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        background: checkedIn 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
                        color: checkedIn ? 'var(--accent-emerald)' : '#fff',
                        border: checkedIn ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                        boxShadow: checkedIn ? 'none' : '0 4px 10px rgba(127, 0, 255, 0.25)',
                        cursor: checkedIn ? 'default' : 'pointer'
                      }}
                    >
                      <Check size={16} />
                      {checkedIn ? 'Completed' : 'Check-in'}
                    </button>
                    <button 
                      onClick={() => handleDelete(h.id)}
                      className="btn-secondary"
                      style={{ padding: '10px', color: 'var(--accent-rose)' }}
                      title="Delete Habit"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Craving Analytics Chart */}
      {logs.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert style={{ color: 'var(--accent-cyan)' }} />
            Craving Severity Trends
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Visualizes intensity of triggers over the last 10 log events. Spikes suggest high-stress environments.
          </p>
          <div style={{ height: '240px', position: 'relative' }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

    </div>
  );
};

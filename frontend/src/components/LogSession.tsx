import React, { useState } from 'react';
import { PlusCircle, AlertOctagon, CheckCircle, Flame } from 'lucide-react';
import { apiFetch } from '../config';

interface Habit {
  id: number;
  name: string;
  category: string;
  target_description: string;
  streak: number;
  longest_streak: number;
}

interface LogSessionProps {
  habits: Habit[];
  onRefresh: () => void;
}

export const LogSession: React.FC<LogSessionProps> = ({ habits, onRefresh }) => {
  const [habitName, setHabitName] = useState('');
  const [category, setCategory] = useState('Digital');
  const [targetDesc, setTargetDesc] = useState('');
  
  // Log form states
  const [selectedHabitId, setSelectedHabitId] = useState<number | ''>('');
  const [severity, setSeverity] = useState<number>(3);
  const [triggerContext, setTriggerContext] = useState('');
  const [mood, setMood] = useState('');
  const [wasResisted, setWasResisted] = useState(true);
  const [notes, setNotes] = useState('');
  
  // Status feedback
  const [habitStatus, setHabitStatus] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    setIsLoading(true);
    setHabitStatus(null);
    try {
      const response = await apiFetch('/api/habits', {
        method: 'POST',
        body: JSON.stringify({
          name: habitName,
          category,
          target_description: targetDesc
        }),
      });

      if (response.ok) {
        setHabitStatus('Habit configured successfully! Keep track and break the cycle.');
        setHabitName('');
        setTargetDesc('');
        onRefresh();
      } else {
        setHabitStatus('Failed to create habit. Please try again.');
      }
    } catch (err) {
      setHabitStatus('Network error creating habit.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHabitId) return;

    setIsLoading(true);
    setLogStatus(null);
    try {
      const response = await apiFetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify({
          habit_id: Number(selectedHabitId),
          severity,
          trigger_context: triggerContext,
          mood,
          was_resisted: wasResisted,
          notes
        }),
      });

      if (response.ok) {
        setLogStatus(wasResisted 
          ? 'Urge logged! Fantastic job resisting the trigger.' 
          : 'Slip logged. Remember, this is just data for our journey. Be kind to yourself.'
        );
        // Reset log fields
        setTriggerContext('');
        setMood('');
        setNotes('');
        setSeverity(3);
        onRefresh();
      } else {
        setLogStatus('Failed to log session.');
      }
    } catch (err) {
      setLogStatus('Network error logging craving.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginTop: '24px' }}>
      
      {/* Configure Habit Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle style={{ color: 'var(--accent-cyan)' }} />
          Configure Target Habit
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Identify the specific pattern you want to dismantle (e.g., social scrolling, stress smoking).
        </p>

        <form onSubmit={handleCreateHabit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label htmlFor="habit-name-input" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Habit Name</label>
            <input 
              id="habit-name-input"
              type="text" 
              className="input-field"
              placeholder="e.g., Excessive Screen Time"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              required 
            />
          </div>

          <div>
            <label htmlFor="habit-category-select" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Category</label>
            <select 
              id="habit-category-select"
              className="input-field" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ background: '#1c1e2d', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="Digital">Digital / Screen Time</option>
              <option value="Substance">Substance (Smoking/Drinking/Caffeine)</option>
              <option value="Health">Physical Health (Junk Food/Nail Biting)</option>
              <option value="Emotional">Emotional Reactivity</option>
              <option value="Productivity">Procrastination / Work</option>
            </select>
          </div>

          <div>
            <label htmlFor="habit-target-input" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Target Boundary</label>
            <textarea 
              id="habit-target-input"
              className="input-field"
              placeholder="e.g., Limit screen time to 45 mins. Avoid phone in bed."
              rows={3}
              value={targetDesc}
              onChange={(e) => setTargetDesc(e.target.value)}
            />
          </div>

          {habitStatus && (
            <div style={{ 
              padding: '12px', 
              borderRadius: 'var(--radius-sm)', 
              backgroundColor: habitStatus.includes('successfully') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              border: `1px solid ${habitStatus.includes('successfully') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
              fontSize: '0.85rem'
            }}>
              {habitStatus}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading}
            style={{ marginTop: '8px' }}
          >
            {isLoading ? 'Configuring...' : 'Establish Habit'}
          </button>
        </form>
      </div>

      {/* Log Craving / Trigger Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertOctagon style={{ color: 'var(--accent-rose)' }} />
          Log Cravings & Triggers
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
          Caught a craving or experienced a slip? Log it to train the AI Nudge Engine.
        </p>

        {habits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            Please configure at least one habit first to enable trigger logging.
          </div>
        ) : (
          <form onSubmit={handleCreateLog} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <div>
              <label htmlFor="log-habit-select" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Select Habit</label>
              <select 
                id="log-habit-select"
                className="input-field"
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value === '' ? '' : Number(e.target.value))}
                required
                style={{ background: '#1c1e2d', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <option value="">-- Choose Habit --</option>
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="log-severity-input" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Craving Severity: <strong style={{ color: 'var(--accent-cyan)' }}>{severity} / 5</strong>
              </label>
              <input 
                id="log-severity-input"
                type="range" 
                min="1" 
                max="5" 
                className="input-field" 
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                style={{ height: '8px', padding: '0', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Mild Urge</span>
                <span style={{ marginLeft: 'auto' }}>Overwhelming</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="log-trigger-input" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Trigger Context</label>
                <input 
                  id="log-trigger-input"
                  type="text" 
                  className="input-field"
                  placeholder="e.g., Boredom, Late night"
                  value={triggerContext}
                  onChange={(e) => setTriggerContext(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="log-mood-input" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Current Mood</label>
                <input 
                  id="log-mood-input"
                  type="text" 
                  className="input-field"
                  placeholder="e.g., Anxious, Tired"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 0' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Outcome:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input 
                  type="radio" 
                  checked={wasResisted === true} 
                  onChange={() => setWasResisted(true)} 
                  style={{ accentColor: 'var(--accent-emerald)' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                  <CheckCircle size={16} /> Resisted Urge
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input 
                  type="radio" 
                  checked={wasResisted === false} 
                  onChange={() => setWasResisted(false)} 
                  style={{ accentColor: 'var(--accent-rose)' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-rose)', fontWeight: 600 }}>
                  <Flame size={16} /> I Slipped
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="log-notes-input" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Reflections & Thoughts</label>
              <textarea 
                id="log-notes-input"
                className="input-field"
                placeholder="What occurred? What thought loop led to this trigger?"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {logStatus && (
              <div style={{ 
                padding: '12px', 
                borderRadius: 'var(--radius-sm)', 
                backgroundColor: logStatus.includes('resisted') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${logStatus.includes('resisted') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'}`,
                fontSize: '0.85rem'
              }}>
                {logStatus}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading}
              style={{ 
                marginTop: '8px',
                background: wasResisted 
                  ? 'linear-gradient(135deg, var(--accent-emerald), #059669)'
                  : 'linear-gradient(135deg, var(--accent-rose), #e11d48)',
                boxShadow: wasResisted
                  ? '0 4px 15px rgba(16, 185, 129, 0.3)'
                  : '0 4px 15px rgba(244, 63, 94, 0.3)'
              }}
            >
              {isLoading ? 'Saving...' : 'Log Urge Event'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

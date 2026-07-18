import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, X, Shield, Sparkles } from 'lucide-react';
import { apiFetch } from '../config';
import { renderMarkdown } from '../utils/markdown';

interface Habit {
  id: number;
  name: string;
}

interface PanicButtonProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
}

type BreathPhase = 'Inhale' | 'Hold (Full)' | 'Exhale' | 'Hold (Empty)';

export const PanicButton: React.FC<PanicButtonProps> = ({ isOpen, onClose, habits }) => {
  const [selectedHabitId, setSelectedHabitId] = useState<number | ''>('');
  const [mood, setMood] = useState('Overwhelmed');
  const [groundingText, setGroundingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Breathing guide states
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('Inhale');
  const [breathTimer, setBreathTimer] = useState(4);
  const [isBreathingActive, setIsBreathingActive] = useState(true);

  // Box Breathing cycle logic
  useEffect(() => {
    if (!isOpen || !isBreathingActive) return;

    const timer = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev <= 1) {
          // Switch phase
          setBreathPhase((currentPhase) => {
            switch (currentPhase) {
              case 'Inhale': return 'Hold (Full)';
              case 'Hold (Full)': return 'Exhale';
              case 'Exhale': return 'Hold (Empty)';
              case 'Hold (Empty)': return 'Inhale';
              default: return 'Inhale';
            }
          });
          return 4; // Reset to 4 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, breathPhase, isBreathingActive]);

  // Reset selected habit when habits list updates
  useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId]);

  const handleGetGrounding = async () => {
    if (!selectedHabitId) return;

    setIsLoading(true);
    setGroundingText('');
    try {
      const res = await apiFetch('/api/grounding', {
        method: 'POST',
        body: JSON.stringify({
          habit_id: Number(selectedHabitId),
          current_mood: mood
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGroundingText(data.response);
      } else {
        setGroundingText('Find a comfortable seat, press your feet firmly into the ground, and take 5 slow, deep breaths. This urge will pass.');
      }
    } catch (err) {
      setGroundingText('Place your hand over your heart. Breathe in for 4 seconds, hold for 4, exhale for 4. You are safe, and this craving is temporary.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(5, 5, 8, 0.9)',
      backdropFilter: 'blur(20px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '750px',
          padding: '32px',
          border: '1px solid rgba(244, 63, 94, 0.15)',
          boxShadow: '0 10px 40px rgba(244, 63, 94, 0.15)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Shield style={{ color: 'var(--accent-rose)' }} size={28} />
          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>SOS Grounding space</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Take a breath. Intercept the habit loop before it acts.</p>
          </div>
        </div>

        {/* Layout: Box Breathing on Left, AI Grounding on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
          
          {/* Box Breathing Visualizer */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.02)',
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.04)'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={18} style={{ color: 'var(--accent-cyan)' }} />
              Box Breathing Guide
            </h3>

            {/* Breathing Circle Container */}
            <div style={{ 
              width: '160px', 
              height: '160px', 
              borderRadius: '50%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative',
              marginBottom: '20px'
            }}>
              {/* Animated Ring */}
              <div 
                className="breathing-indicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '2px solid var(--accent-cyan)',
                  // Pause animation if breathing is deactivated
                  animationPlayState: isBreathingActive ? 'running' : 'paused'
                }}
              />
              <span style={{ fontSize: '1.8rem', fontWeight: 'bold', zIndex: 1, fontFamily: 'var(--font-display)' }}>{breathTimer}s</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', zIndex: 1, fontWeight: 500 }}>{breathPhase}</span>
            </div>

            <button 
              className="btn-secondary" 
              onClick={() => setIsBreathingActive(!isBreathingActive)}
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              {isBreathingActive ? 'Pause Timer' : 'Resume Timer'}
            </button>
          </div>

          {/* AI Grounding Generator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={18} style={{ color: 'var(--accent-purple)' }} />
              Adaptive Grounding Exercise
            </h3>

            {habits.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Please create a habit first to get customized grounding recommendations.
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label htmlFor="panic-habit-select" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Target Habit</label>
                    <select 
                      id="panic-habit-select"
                      className="input-field" 
                      value={selectedHabitId}
                      onChange={(e) => setSelectedHabitId(Number(e.target.value))}
                      style={{ background: '#1c1e2d', padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      {habits.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="panic-mood-select" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-secondary)' }}>Current State / Mood</label>
                    <select 
                      id="panic-mood-select"
                      className="input-field" 
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      style={{ background: '#1c1e2d', padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      <option value="Overwhelmed">Overwhelmed</option>
                      <option value="Anxious">Anxious / Stressed</option>
                      <option value="Bored">Bored / Empty</option>
                      <option value="Angry">Angry / Irritated</option>
                      <option value="Tired">Tired / Fatigued</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGetGrounding} 
                  className="btn-panic" 
                  disabled={isLoading}
                  style={{ fontSize: '0.9rem', padding: '10px' }}
                >
                  {isLoading ? 'Calibrating...' : 'Generate Grounding Exercise'}
                </button>
              </>
            )}

            {groundingText && (
              <div 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-sm)', 
                  fontSize: '0.88rem', 
                  lineHeight: '1.5',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255,255,255,0.05)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {renderMarkdown(groundingText)}
              </div>
            )}
          </div>

        </div>

        {/* Bottom banner */}
        <div style={{ 
          marginTop: '28px', 
          paddingTop: '16px', 
          borderTop: '1px solid rgba(255,255,255,0.06)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: 'var(--accent-rose)',
          fontSize: '0.8rem'
        }}>
          <AlertCircle size={14} />
          <span>If you are dealing with a severe medical emergency or chemical addiction crisis, please contact local emergency hotlines.</span>
        </div>
      </div>
    </div>
  );
};

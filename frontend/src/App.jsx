import { useEffect, useRef, useState } from 'react';
import './styles.css';

const metrics = [
  { label: 'Workout Streak', value: '12 Days' },
  { label: 'Calories Burned', value: '8,420' },
  { label: 'Performance Score', value: '91%' },
];

const modules = [
  {
    title: 'AI Gym Trainer',
    description: 'Real-time posture tracking, rep counting, and form correction.',
    status: 'Active',
  },
  {
    title: 'Diet Coach',
    description: 'Personalized meal recommendations based on your goals and BMI.',
    status: 'Updated',
  },
  {
    title: 'Habit Tracker',
    description: 'Predicts skip risk and sends intelligent motivation nudges.',
    status: 'Learning',
  },
  {
    title: 'Virtual Gym Buddy',
    description: 'Conversational guidance for motivation and workout progress.',
    status: 'Online',
  },
];

const dashboardMenu = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'reports', label: 'Reports' },
  { id: 'workout', label: 'Workouts' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'coach', label: 'AI Coach' },
  { id: 'devices', label: 'Devices' },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8018';

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I can help with workouts, nutrition, motivation, and habit planning.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceTelemetry, setDeviceTelemetry] = useState(null);
  const [deviceId, setDeviceId] = useState('fit-band-01');
  const [deviceSending, setDeviceSending] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({
    exercise: 'Squat',
    reps: 8,
    formScore: 8,
    durationMinutes: 30,
    heartRate: 132,
  });
  const [workoutResult, setWorkoutResult] = useState(null);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [dietForm, setDietForm] = useState({
    goal: 'fat_loss',
    bmi: 24.5,
    weightKg: 74,
    heightCm: 178,
    preferences: 'high-protein, vegetarian',
    activityLevel: 'moderate',
  });
  const [dietResult, setDietResult] = useState(null);
  const [dietLoading, setDietLoading] = useState(false);
  const [habitForm, setHabitForm] = useState({
    streakDays: 5,
    sleepHours: 6.5,
    mood: 'balanced',
    workoutCompleted: true,
  });
  const [habitResult, setHabitResult] = useState(null);
  const [habitLoading, setHabitLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', goal: 'fat_loss' });
  const [authMessage, setAuthMessage] = useState('Create an account or sign in to enter your dashboard.');
  const [profile, setProfile] = useState({
    name: 'Demo User',
    email: 'demo@fit.com',
    goal: 'fat_loss',
    weightKg: 74,
    heightCm: 178,
  });
  const [workoutActive, setWorkoutActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('Camera idle');
  const [cameraReady, setCameraReady] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [caloriesBurned, setCaloriesBurned] = useState(284);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const loadDeviceTelemetry = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/iot/latest`);
        const data = await response.json();
        setDeviceTelemetry(data);
      } catch (error) {
        setDeviceTelemetry({ status: 'offline', device_id: deviceId });
      }
    };

    loadDeviceTelemetry();
    const interval = window.setInterval(loadDeviceTelemetry, 5000);
    return () => {
      window.clearInterval(interval);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [deviceId]);

  useEffect(() => {
    if (!workoutActive) return undefined;

    const interval = window.setInterval(() => {
      setCaloriesBurned((current) => current + 1);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [workoutActive]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = authMode === 'register'
        ? {
            name: authForm.name,
            email: authForm.email,
            password: authForm.password,
            goal: authForm.goal,
          }
        : {
            email: authForm.email,
            password: authForm.password,
          };
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Authentication failed');
      setProfile({
        name: data.name,
        email: data.email,
        goal: data.goal || authForm.goal,
        weightKg: data.weight_kg || 74,
        heightCm: data.height_cm || 178,
      });
      setIsLoggedIn(true);
      setAuthMessage(authMode === 'register' ? `Welcome, ${data.name}! Your account is ready.` : `Welcome back, ${data.name}!`);
    } catch (error) {
      setAuthMessage(error.message || 'Unable to complete authentication right now.');
    }
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          goal: profile.goal,
          weight_kg: Number(profile.weightKg),
          height_cm: Number(profile.heightCm),
          password: authForm.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Profile update failed');
      setProfile({
        name: data.name,
        email: data.email,
        goal: data.goal || 'fat_loss',
        weightKg: data.weight_kg || 74,
        heightCm: data.height_cm || 178,
      });
      setAuthMessage('Profile saved successfully.');
    } catch (error) {
      setAuthMessage(error.message || 'Unable to save profile.');
    }
  };

  const startWorkoutSession = async () => {
    setWorkoutActive(true);
    setCameraStatus('Requesting camera access...');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not available in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setCameraStatus('Camera monitoring active');
    } catch (error) {
      setCameraStatus(error.message || 'Camera access blocked or unavailable');
      setWorkoutActive(false);
    }
  };

  const stopWorkoutSession = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setWorkoutActive(false);
    setCameraStatus('Camera stopped');
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_message: userMessage }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply || 'No response yet.' }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, the AI coach is unavailable right now.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutSubmit = async (event) => {
    event.preventDefault();
    setWorkoutLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/workout/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: workoutForm.exercise,
          reps: Number(workoutForm.reps),
          form_score: Number(workoutForm.formScore),
          duration_minutes: Number(workoutForm.durationMinutes),
          heart_rate: Number(workoutForm.heartRate),
        }),
      });
      const data = await response.json();
      setWorkoutResult(data);
    } catch (error) {
      setWorkoutResult({ feedback: 'The workout analysis service is temporarily unavailable.' });
    } finally {
      setWorkoutLoading(false);
    }
  };

  const handleDietSubmit = async (event) => {
    event.preventDefault();
    setDietLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/diet/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: dietForm.goal,
          bmi: Number(dietForm.bmi),
          weight_kg: Number(dietForm.weightKg),
          height_cm: Number(dietForm.heightCm),
          preferences: dietForm.preferences.split(',').map((item) => item.trim()).filter(Boolean),
          activity_level: dietForm.activityLevel,
        }),
      });
      const data = await response.json();
      setDietResult(data);
    } catch (error) {
      setDietResult({ notes: 'The diet coach is temporarily unavailable.' });
    } finally {
      setDietLoading(false);
    }
  };

  const handleHabitSubmit = async (event) => {
    event.preventDefault();
    setHabitLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/habit/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streak_days: Number(habitForm.streakDays),
          sleep_hours: Number(habitForm.sleepHours),
          mood: habitForm.mood,
          workout_completed: Boolean(habitForm.workoutCompleted),
        }),
      });
      const data = await response.json();
      setHabitResult(data);
    } catch (error) {
      setHabitResult({ nudge: 'The habit tracker is temporarily unavailable.' });
    } finally {
      setHabitLoading(false);
    }
  };

  const handleDeviceTelemetry = async (event) => {
    event.preventDefault();
    setDeviceSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/iot/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          heart_rate: 78 + Math.floor(Math.random() * 12),
          steps: 8200 + Math.floor(Math.random() * 500),
          calories_burned: 320 + Math.floor(Math.random() * 60),
          temperature_c: 36.5 + Math.random() * 0.4,
          battery_level: 84 + Math.random() * 8,
          status: 'online',
        }),
      });
      const data = await response.json();
      setDeviceTelemetry(data);
    } catch (error) {
      setDeviceTelemetry({ status: 'offline', device_id: deviceId });
    } finally {
      setDeviceSending(false);
    }
  };

  return (
    <div className="app-shell">
      {!isLoggedIn ? (
        <>
          <header className="hero">
            <div>
              <p className="eyebrow">AI-powered fitness ecosystem</p>
              <h1>AI Gym &amp; Fitness Assistant</h1>
              <p className="hero-text">
                Register as a new user or sign in to access your personalized dashboard, workout tools, and AI coaching.
              </p>
            </div>
            <button className="primary-btn">Get Started</button>
          </header>

          <section className="panel auth-panel">
            <div className="panel-header">
              <h2>Account Access</h2>
              <span className="pill">{authMode === 'register' ? 'New user' : 'Returning user'}</span>
            </div>
            <div className="auth-grid">
              <form className="input-card" onSubmit={handleAuthSubmit}>
                <div className="auth-toggle">
                  <button type="button" className={authMode === 'login' ? 'active-toggle' : ''} onClick={() => setAuthMode('login')}>Login</button>
                  <button type="button" className={authMode === 'register' ? 'active-toggle' : ''} onClick={() => setAuthMode('register')}>Register</button>
                </div>
                <h3>{authMode === 'register' ? 'Create Account' : 'Sign In'}</h3>
                {authMode === 'register' && (
                  <label>
                    Name
                    <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} />
                  </label>
                )}
                <label>
                  Email
                  <input value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
                </label>
                <label>
                  Password
                  <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
                </label>
                {authMode === 'register' && (
                  <label>
                    Goal
                    <select value={authForm.goal} onChange={(event) => setAuthForm({ ...authForm, goal: event.target.value })}>
                      <option value="fat_loss">Fat Loss</option>
                      <option value="muscle_gain">Muscle Gain</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </label>
                )}
                <button type="submit">{authMode === 'register' ? 'Create Account' : 'Sign In'}</button>
              </form>
              <div className="input-card">
                <h3>Why register?</h3>
                <ul className="checklist">
                  <li>Save your profile and fitness goal</li>
                  <li>Track workouts and diet plans</li>
                  <li>Use AI coaching and live monitoring</li>
                </ul>
              </div>
            </div>
            <p className="helper-text">{authMessage}</p>
          </section>
        </>
      ) : (
        <div className="dashboard-shell">
          <aside className="sidebar">
            <div className="sidebar-brand">
              <p className="eyebrow">Member portal</p>
              <h2>{profile.name}</h2>
              <span className="pill muted">{profile.goal.replace('_', ' ')}</span>
            </div>
            <nav className="sidebar-nav">
              {dashboardMenu.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-item ${activeSection === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="sidebar-foot">
              <p>Stay focused. Your plan is organized by goal, not by clutter.</p>
            </div>
          </aside>

          <div className="dashboard-main">
            <header className="hero dashboard-hero">
              <div>
                <p className="eyebrow">AI-powered fitness ecosystem</p>
                <h1>Welcome back to your dashboard</h1>
                <p className="hero-text">
                  Use the menu to jump straight to your profile, reports, workouts, nutrition, AI coaching, or device sync.
                </p>
              </div>
              <button type="button" className="primary-btn" onClick={() => setActiveSection('workout')}>
                Start session
              </button>
            </header>

            <section className="metrics-grid">
              {metrics.map((item) => (
                <div className="metric-card" key={item.label}>
                  <p>{item.label}</p>
                  <h3>{item.value}</h3>
                </div>
              ))}
            </section>

            {activeSection === 'overview' && (
              <>
                <div className="feature-grid">
                  <section className="panel section-panel">
                    <div className="panel-header">
                      <h2>Calories monitoring scale</h2>
                      <span className="pill">Live</span>
                    </div>
                    <div className="scale-display">
                      <div className="scale-ring">
                        <span>{caloriesBurned}</span>
                        <small>kcal</small>
                      </div>
                      <div>
                        <p className="section-copy">Current burn rate is steady and in range for today’s workout.</p>
                        <strong>+{Math.max(4, Math.round(caloriesBurned / 70))} kcal/min</strong>
                      </div>
                    </div>
                  </section>

                  <section className="panel section-panel">
                    <div className="panel-header">
                      <h2>AI chat bot</h2>
                      <span className="pill">Coach</span>
                    </div>
                    <div className="assistant-preview">
                      <p>{messages[messages.length - 1]?.text}</p>
                      <button type="button" className="secondary-btn" onClick={() => setActiveSection('coach')}>
                        Open chat
                      </button>
                    </div>
                  </section>
                </div>

                <div className="section-grid">
                  <div className="panel section-panel">
                    <div className="panel-header">
                      <h2>Today’s focus</h2>
                      <span className="pill">Recommended</span>
                    </div>
                    <ul className="checklist">
                      <li>Upper body strength session</li>
                      <li>Protein-rich breakfast</li>
                      <li>8 hours of sleep target</li>
                      <li>15-minute mobility warm-up</li>
                    </ul>
                  </div>
                  <div className="panel section-panel">
                    <div className="panel-header">
                      <h2>AI modules</h2>
                      <span className="pill muted">Live</span>
                    </div>
                    <div className="module-list">
                      {modules.map((module) => (
                        <div className="module-item" key={module.title}>
                          <div>
                            <h3>{module.title}</h3>
                            <p>{module.description}</p>
                          </div>
                          <span>{module.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <section className="panel section-panel bottom-panel">
                  <div className="panel-header">
                    <h2>AI chat bot</h2>
                    <span className="pill">Coach</span>
                  </div>
                  <div className="chat-window compact-chat">
                    {messages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                        {message.text}
                      </div>
                    ))}
                    {loading && <div className="message assistant">Thinking...</div>}
                  </div>
                  <form className="chat-form" onSubmit={sendMessage}>
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask your fitness coach..."
                    />
                    <button type="submit">Send</button>
                  </form>
                </section>
              </>
            )}

            {activeSection === 'profile' && (
              <div className="section-grid">
                <section className="panel section-panel">
                  <div className="panel-header">
                    <h2>Account & profile</h2>
                    <span className="pill">Signed in</span>
                  </div>
                  <form className="input-card" onSubmit={handleProfileUpdate}>
                    <label>
                      Name
                      <input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
                    </label>
                    <label>
                      Goal
                      <select value={profile.goal} onChange={(event) => setProfile({ ...profile, goal: event.target.value })}>
                        <option value="fat_loss">Fat Loss</option>
                        <option value="muscle_gain">Muscle Gain</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </label>
                    <label>
                      Weight (kg)
                      <input type="number" value={profile.weightKg} onChange={(event) => setProfile({ ...profile, weightKg: event.target.value })} />
                    </label>
                    <label>
                      Height (cm)
                      <input type="number" value={profile.heightCm} onChange={(event) => setProfile({ ...profile, heightCm: event.target.value })} />
                    </label>
                    <button type="submit">Save Profile</button>
                  </form>
                  <p className="helper-text">{authMessage}</p>
                </section>
              </div>
            )}

            {activeSection === 'reports' && (
              <div className="section-grid">
                <section className="panel section-panel">
                  <div className="panel-header">
                    <h2>Progress reports</h2>
                    <span className="pill">Updated</span>
                  </div>
                  <div className="quick-grid">
                    <div className="input-card">
                      <h3>Workout insight</h3>
                      <p className="section-copy">Your recent sessions show balanced volume and steady recovery.</p>
                      {workoutResult && <div className="result-box"><strong>{workoutResult.performance_score}%</strong><p>{workoutResult.feedback}</p></div>}
                    </div>
                    <div className="input-card">
                      <h3>Nutrition snapshot</h3>
                      <p className="section-copy">Your nutrition target is aligned to your current goal and activity level.</p>
                      {dietResult && <div className="result-box"><strong>{dietResult.calories_target} kcal</strong><p>{dietResult.notes}</p></div>}
                    </div>
                    <div className="input-card">
                      <h3>Habit outlook</h3>
                      <p className="section-copy">Consistency remains strong and your skip risk is trending down.</p>
                      {habitResult && <div className="result-box"><strong>{habitResult.skip_risk_percent}% risk</strong><p>{habitResult.nudge}</p></div>}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeSection === 'workout' && (
              <div className="section-grid">
                <section className="panel section-panel">
                  <div className="panel-header">
                    <h2>Workout studio</h2>
                    <span className="pill">Live</span>
                  </div>
                  <div className="workout-controls">
                    <button type="button" className="primary-btn" onClick={workoutActive ? stopWorkoutSession : startWorkoutSession}>
                      {workoutActive ? 'Stop Workout' : 'Start Workout'}
                    </button>
                    <span className="pill">{cameraStatus}</span>
                  </div>
                  <div className="camera-card">
                    <video ref={videoRef} className="camera-preview" autoPlay playsInline muted />
                    <div>
                      <strong>{cameraReady ? 'Camera monitoring active' : 'Camera preview ready when you start'}</strong>
                      <p>Live monitoring helps start your session and track movement while your workout begins.</p>
                    </div>
                  </div>
                  <form className="input-card" onSubmit={handleWorkoutSubmit}>
                    <h3>Workout check-in</h3>
                    <label>
                      Exercise
                      <input value={workoutForm.exercise} onChange={(event) => setWorkoutForm({ ...workoutForm, exercise: event.target.value })} />
                    </label>
                    <label>
                      Reps
                      <input type="number" value={workoutForm.reps} onChange={(event) => setWorkoutForm({ ...workoutForm, reps: event.target.value })} />
                    </label>
                    <label>
                      Form Score
                      <input type="number" value={workoutForm.formScore} onChange={(event) => setWorkoutForm({ ...workoutForm, formScore: event.target.value })} />
                    </label>
                    <button type="submit" disabled={workoutLoading}>{workoutLoading ? 'Analyzing…' : 'Analyze'}</button>
                    {workoutResult && (
                      <div className="result-box">
                        <strong>{workoutResult.performance_score}%</strong>
                        <p>{workoutResult.feedback}</p>
                      </div>
                    )}
                  </form>
                </section>
              </div>
            )}

            {activeSection === 'nutrition' && (
              <div className="section-grid">
                <section className="panel section-panel">
                  <div className="panel-header">
                    <h2>Nutrition guidance</h2>
                    <span className="pill">Plan</span>
                  </div>
                  <form className="input-card" onSubmit={handleDietSubmit}>
                    <label>
                      Goal
                      <select value={dietForm.goal} onChange={(event) => setDietForm({ ...dietForm, goal: event.target.value })}>
                        <option value="fat_loss">Fat Loss</option>
                        <option value="muscle_gain">Muscle Gain</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </label>
                    <label>
                      Preferences
                      <input value={dietForm.preferences} onChange={(event) => setDietForm({ ...dietForm, preferences: event.target.value })} />
                    </label>
                    <button type="submit" disabled={dietLoading}>{dietLoading ? 'Planning…' : 'Plan Meal'}</button>
                    {dietResult && (
                      <div className="result-box">
                        <strong>{dietResult.calories_target} kcal</strong>
                        <p>{dietResult.notes}</p>
                      </div>
                    )}
                  </form>
                </section>
              </div>
            )}

            {activeSection === 'coach' && (
              <div className="section-grid">
                <section className="panel section-panel">
                  <div className="panel-header">
                    <h2>Virtual gym buddy</h2>
                    <span className="pill">AI chat</span>
                  </div>
                  <div className="chat-window">
                    {messages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                        {message.text}
                      </div>
                    ))}
                    {loading && <div className="message assistant">Thinking...</div>}
                  </div>
                  <form className="chat-form" onSubmit={sendMessage}>
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask your fitness coach..."
                    />
                    <button type="submit">Send</button>
                  </form>
                </section>
              </div>
            )}

            {activeSection === 'devices' && (
              <div className="section-grid">
                <section className="panel section-panel">
                  <div className="panel-header">
                    <h2>IoT device link</h2>
                    <span className="pill">Telemetry</span>
                  </div>
                  <div className="iot-grid">
                    <form className="input-card" onSubmit={handleDeviceTelemetry}>
                      <label>
                        Device ID
                        <input value={deviceId} onChange={(event) => setDeviceId(event.target.value)} />
                      </label>
                      <button type="submit" disabled={deviceSending}>{deviceSending ? 'Syncing…' : 'Send telemetry'}</button>
                    </form>
                    <div className="result-box iot-box">
                      <strong>{deviceTelemetry?.device_id || 'No device connected'}</strong>
                      <p>Status: {deviceTelemetry?.status || 'offline'}</p>
                      <p>Heart rate: {deviceTelemetry?.heart_rate ?? '—'} bpm</p>
                      <p>Steps: {deviceTelemetry?.steps ?? '—'}</p>
                      <p>Calories: {deviceTelemetry?.calories_burned ?? '—'}</p>
                      <p>Battery: {deviceTelemetry?.battery_level ?? '—'}%</p>
                      <p>Last sync: {deviceTelemetry?.received_at || 'Waiting for first payload'}</p>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

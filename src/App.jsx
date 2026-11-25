
import React, { useState, useEffect, useRef } from "react";
import "./App.css";

const NAV = [
  ["▦", "Dashboard"],
  ["◎", "Live Monitoring"],
  ["◷", "Reminders"],
  ["♧", "Caregiver Alerts"],
  ["▥", "Analytics"],
  ["⚙", "Settings"],
];


const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const uid = () => Date.now() + Math.random();
const timestamp = () => new Date().toLocaleString();

function useStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

function Stat({ icon, title, value, subtitle, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <p>{title}</p>
      <h2>{value}</h2>
      <small>{subtitle}</small>
    </div>
  );
}

function ActivityList({ logs }) {
  if (!logs.length) {
    return (
      <div className="empty">
        <span>◎</span>
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return logs.map(log => (
    <div className="activity-row" key={log.id}>
      <div className="activity-icon">↗</div>

      <div className="grow">
        <strong>{log.title}</strong>
        <small>{log.time}</small>
        {log.details && <p>{log.details}</p>}
      </div>

      <span className="tag">{log.status}</span>
    </div>
  ));
}

const emptyForm = {
  name: "",
  category: "Hydration",
  time: "09:00",
};

export default function App() {
  const [page, setPage] = useState("Dashboard");

  const [dark, setDark] = useStorage("ec-dark", false);
  const [voice, setVoice] = useStorage("ec-voice", true);
  const [resident, setResident] = useStorage(
    "ec-resident", "Demo Resident"
  );

  const [logs, setLogs] = useStorage("ec-logs", []);
  const [alerts, setAlerts] = useStorage("ec-alerts", []);
  const [reminders, setReminders] = useStorage(
    "ec-reminders", []
  );

  const [monitoring, setMonitoring] = useState(false);
  const [posture, setPosture] = useState("Normal");
  const [event, setEvent] = useState(null);
  const [countdown, setCountdown] = useState(30);

  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [processing, setProcessing] = useState(false);

  const aiStatus = "Local rules";
  const [aiResult, setAiResult] = useState("");
  const [lastResponse, setLastResponse] = useState(null);

  const [toast, setToast] = useState("");
  const [now, setNow] = useState(new Date());

  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [activeReminder, setActiveReminder] = useState(null);
  const [reminderSeconds, setReminderSeconds] = useState(60);


  const recognitionRef = useRef(null);
  const eventRef = useRef(null);
  const busyRef = useRef(false);
  const speakingRef = useRef(false);
  const speechToken = useRef(0);
  const reminderRef = useRef(null);

  function notify(message) {
    setToast(message);
  }

  function addLog(title, status, details = "") {
    setLogs(old => [
      {
        id: uid(),
        title,
        status,
        details,
        time: timestamp(),
      },
      ...old,
    ]);
  }

  // TEXT TO SPEECH

  function speak(message) {
    if (!voice || !window.speechSynthesis) {
      return Promise.resolve();
    }

    const token = ++speechToken.current;

    window.speechSynthesis.cancel();

    return new Promise(resolve => {
      const speech = new SpeechSynthesisUtterance(message);

      speech.lang = "en-IN";
      speech.rate = 0.85;

      speakingRef.current = true;
      setSpeaking(true);

      let finished = false;
      let timer;

      function finish() {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        if (speechToken.current === token) {
          speakingRef.current = false;
          setSpeaking(false);
        }

        resolve();
      }

      speech.onend = finish;
      speech.onerror = finish;

      timer = setTimeout(() => {
        if (speechToken.current === token) {
          window.speechSynthesis.cancel();
        }
        finish();
      }, 12000);

      window.speechSynthesis.speak(speech);
    });
  }

  function stopSpeaking() {
    speechToken.current++;
    window.speechSynthesis?.cancel();
    speakingRef.current = false;
    setSpeaking(false);
  }

  // SPEECH TO TEXT

  function stopListening() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (recognition) {
      try {
        recognition.abort();
      } catch {}
    }

    setListening(false);
  }

  function startListening() {
    if (!SpeechRecognition) {
      notify("Use Chrome or Edge for speech recognition.");
      return;
    }

    if (
      !eventRef.current ||
      busyRef.current ||
      speakingRef.current
    ) return;

    stopListening();

    const recognition = new SpeechRecognition();
    const eventId = eventRef.current.id;

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      if (recognitionRef.current !== recognition) return;
      setListening(true);
      setTranscript("");
    };

    recognition.onresult = e => {
      if (
        recognitionRef.current !== recognition ||
        eventRef.current?.id !== eventId
      ) return;

      const text = e.results[0][0].transcript;

      setTranscript(text);
      setListening(false);
      classifyResponse(text);
    };

    recognition.onerror = e => {
      if (recognitionRef.current !== recognition) return;

      setListening(false);

      if (e.error !== "aborted") {
        notify(
          `Microphone error: ${e.error}. Try typing instead.`
        );
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setListening(false);
      }
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      notify("Unable to start microphone.");
    }
  }

  // LOCAL RESPONSE CLASSIFICATION

  function localClassification(text) {
    const value = text.toLowerCase().trim();

    if (
      /\b(help|hurt|pain|injured|emergency|not okay|not fine|cannot get up|can't get up)\b/
        .test(value)
    ) {
      return "HELP";
    }

    if (
      /^(i am okay|i'm okay|i am fine|i'm fine|i am safe|i'm safe|yes i am okay)[.!]?$/
        .test(value)
    ) {
      return "SAFE";
    }

    return "UNCLEAR";
  }

  async function classifyResponse(text) {
    if (
      !text.trim() ||
      !eventRef.current ||
      busyRef.current
    ) return;

    const eventId = eventRef.current.id;

    busyRef.current = true;
    setProcessing(true);
    stopListening();
    stopSpeaking();

    const classification = localClassification(text);
    const source = "Local rules";

    busyRef.current = false;
    setProcessing(false);

    if (eventRef.current?.id !== eventId) return;

    setAiResult(`${classification} · ${source}`);

    setLastResponse({
      text,
      classification,
      source,
      time: timestamp(),
    });

    addLog(
      "Voice response",
      classification,
      `${text} — ${source}`
    );

    await resolveEvent(classification, text);
  }

  // SAFETY MONITORING

  function toggleMonitoring() {
    if (eventRef.current) return;

    setMonitoring(!monitoring);
    setPosture("Normal");

    addLog(
      "Safety monitoring",
      monitoring ? "Stopped" : "Started",
      "Simulation mode"
    );

    notify(
      monitoring ? "Monitoring stopped" : "Monitoring started"
    );
  }

  async function simulateEvent(type) {
    if (
      !monitoring ||
      eventRef.current ||
      reminderRef.current
    ) return;

    const newEvent = {
      id: uid(),
      type,
      retries: 0,
      time: timestamp(),
    };

    eventRef.current = newEvent;

    setEvent(newEvent);
    setPosture(type);
    setCountdown(30);
    setTranscript("");
    setAiResult("");

    addLog(type, "Detected", "Simulated safety event");

    await speak(
      "Are you okay? Please tell me if you need help."
    );
  }

  async function resolveEvent(result, reason = "") {
    const current = eventRef.current;

    if (!current) return;

    stopListening();
    stopSpeaking();

    if (result === "UNCLEAR" && current.retries < 2) {
      const updated = {
        ...current,
        retries: current.retries + 1,
      };

      eventRef.current = updated;

      setEvent(updated);
      setCountdown(30);
      setTranscript("");

      await speak(
        "I could not understand your response. Are you okay?"
      );

      return;
    }

    eventRef.current = null;

    setEvent(null);
    setPosture("Normal");

    if (result === "SAFE") {
      addLog(current.type, "Safe", reason);

      notify("Safety response recorded");

      await speak(
        "Thank you. Your response has been recorded."
      );

      return;
    }

    const alert = {
      id: uid(),
      type: current.type,
      reason:
        result === "UNCLEAR"
          ? "Unclear response after retries"
          : reason === "No response before timeout"
            ? reason
            : "Help requested",
      time: timestamp(),
      delivery: "In-app only",
      reviewed: false,
    };

    setAlerts(old => [alert, ...old]);

    addLog(current.type, "Escalated", alert.reason);

    notify("Prototype caregiver alert created");

    speak("A demonstration caregiver alert has been recorded.");


  }

  // TIMERS

  useEffect(() => {
    const timer = setInterval(
      () => setNow(new Date()), 1000
    );

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(
      () => setToast(""), 4500
    );

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!event || processing || speaking) return;

    if (countdown <= 0) {
      if (!busyRef.current) {
        resolveEvent("HELP", "No response before timeout");
      }
      return;
    }

    const timer = setTimeout(
      () => setCountdown(s => s - 1), 1000
    );

    return () => clearTimeout(timer);
  }, [event, countdown, processing, speaking]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // REMINDERS

  function saveReminder(e) {
    e.preventDefault();

    if (!form.name.trim()) return;

    if (editing !== null) {
      setReminders(old =>
        old.map(r =>
          r.id === editing
            ? { ...r, ...form, lastRun: "" }
            : r
        )
      );
    } else {
      setReminders(old => [
        ...old,
        {
          ...form,
          id: uid(),
          enabled: true,
          lastRun: "",
          snoozeUntil: null,
        },
      ]);
    }

    setEditing(null);
    setForm(emptyForm);
    notify("Reminder saved");
  }

  function triggerReminder(reminder) {
    if (
      eventRef.current ||
      reminderRef.current ||
      !reminder.enabled
    ) return;

    reminderRef.current = reminder;

    setActiveReminder(reminder);
    setReminderSeconds(60);

    speak(`This is your reminder. ${reminder.name}.`);
  }

  function finishReminder(status) {
    const current = reminderRef.current;

    if (!current) return;

    reminderRef.current = null;

    stopSpeaking();
    addLog(current.name, status);

    if (status === "Snoozed") {
      setReminders(old =>
        old.map(r =>
          r.id === current.id
            ? {
                ...r,
                snoozeUntil: Date.now() + 120000,
              }
            : r
        )
      );
    }

    setActiveReminder(null);
    notify(`Reminder ${status.toLowerCase()}`);
  }

  useEffect(() => {
    if (!activeReminder) return;

    if (reminderSeconds <= 0) {
      finishReminder("Missed");
      return;
    }

    const timer = setTimeout(
      () => setReminderSeconds(s => s - 1), 1000
    );

    return () => clearTimeout(timer);
  }, [activeReminder, reminderSeconds]);

  useEffect(() => {
    if (eventRef.current || reminderRef.current) return;

    const time =
      String(now.getHours()).padStart(2, "0") +
      ":" +
      String(now.getMinutes()).padStart(2, "0");

    const today = now.toDateString();

    const due = reminders.find(r =>
      r.enabled &&
      (
        (r.time === time && r.lastRun !== today) ||
        (r.snoozeUntil && now.getTime() >= r.snoozeUntil)
      )
    );

    if (due) {
      setReminders(old =>
        old.map(r =>
          r.id === due.id
            ? {
                ...r,
                lastRun: today,
                snoozeUntil: null,
              }
            : r
        )
      );

      triggerReminder(due);
    }
  }, [now, reminders, event, activeReminder]);

  function testRules() {
    notify(`Local rule test: ${localClassification("I am okay")}`);
  }

  function testAlert() {
    setAlerts(old => [{ id: uid(), type: "Test notification", reason: "Academic prototype test", time: timestamp(), delivery: "In-app only", reviewed: false }, ...old]);
    notify("In-app test alert recorded");
  }

  function exportReport() {
    const data = {
      mode: "Academic prototype",
      exportedAt: timestamp(),
      logs,
      alerts,
      reminders,
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "eldercare-report.json";
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function resetData() {
    if (!window.confirm("Clear all demonstration data?")) return;

    setLogs([]);
    setAlerts([]);
    setReminders([]);
    setLastResponse(null);

    notify("Demo data cleared");
  }

  const acknowledged = logs.filter(
    l => l.status === "Acknowledged"
  ).length;

  const missed = logs.filter(
    l => l.status === "Missed"
  ).length;

  const total = acknowledged + missed;

  const adherence = total
    ? Math.round(acknowledged / total * 100)
    : 0;

  const unread = alerts.filter(a => !a.reviewed).length;

  return (
    <div className={`app ${dark ? "dark" : ""}`}>

      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="logo">✚</div>

          <div>
            <h2>ElderCare<span>AI</span></h2>
            <small>INTELLIGENT CARE COMPANION</small>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <nav>
          {NAV.map(([icon, name]) => (
            <button
              key={name}
              className={`nav-button ${
                page === name ? "selected" : ""
              }`}
              onClick={() => setPage(name)}
            >
              <span className="nav-icon">{icon}</span>
              {name}

              {name === "Caregiver Alerts" && unread > 0 && (
                <span className="notification">{unread}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy">
            <span>◇</span>
            <h4>Privacy-aware care</h4>
            <p>
              No raw video is collected. Voice recognition
              may use browser-provider online services.
            </p>
          </div>

          <div className="profile">
            <div className="avatar">C</div>

            <div>
              <strong>Caregiver</strong>
              <small>Academic workspace</small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}

      <main className="main">

        <header className="topbar">
          <div className="breadcrumb">
            Workspace / <strong>{page}</strong>
          </div>

          <div className="header-actions">
            <span className="demo-label">Prototype Mode</span>

            <button
              className="icon-button"
              onClick={() => setDark(!dark)}
              aria-label="Toggle dark mode"
            >
              {dark ? "☀" : "☾"}
            </button>

            <button
              className="icon-button"
              onClick={() => setPage("Caregiver Alerts")}
              aria-label="Open alerts"
            >
              ♧ {unread || ""}
            </button>
          </div>
        </header>

        <div className="content">

          {/* DASHBOARD */}

          {page === "Dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    CAREGIVER OVERVIEW
                  </div>

                  <h1>Care Dashboard</h1>

                  <p>Welcome to the care workspace for {resident}.</p>
                </div>

                <div className="date">
                  {now.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>

              <div className="hero">
                <div>
                  <div className="hero-label">
                    AI-POWERED ELDERLY CARE
                  </div>

                  <h2>
                    Intelligent care.<br />
                    Connected assistance.
                  </h2>

                  <p>
                    Voice-enabled safety check-ins, smart
                    reminders and caregiver notifications
                    in one workspace.
                  </p>

                  <button
                    className="hero-button"
                    onClick={() => setPage("Live Monitoring")}
                  >
                    Open Safety Monitor →
                  </button>
                </div>

                <div className="hero-art">
                  <svg viewBox="0 0 150 150">
                    <circle
                      cx="75" cy="75" r="70"
                      fill="none"
                      stroke="#ffffff30"
                    />

                    <path
                      d="M75 18L120 38V78Q115 115 75 133Q35 115 30 78V38Z"
                      fill="#ffffff10"
                      stroke="#a7f3d0"
                      strokeWidth="3"
                    />

                    <path
                      d="M45 75H62L72 50L85 100L95 75H108"
                      fill="none"
                      stroke="#a7f3d0"
                      strokeWidth="4"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="stats-grid">
                <Stat
                  icon="◎"
                  title="Monitoring"
                  value={monitoring ? "Active" : "Offline"}
                  subtitle="Simulated detection"
                  color="teal"
                />

                <Stat
                  icon="♫"
                  title="Voice Assistant"
                  value={voice ? "Enabled" : "Disabled"}
                  subtitle={
                    SpeechRecognition
                      ? "STT available"
                      : "STT unavailable"
                  }
                  color="blue"
                />

                <Stat
                  icon="✦"
                  title="Response Engine"
                  value={aiStatus}
                  subtitle="Local rule-based classification"
                  color="purple"
                />

                <Stat
                  icon="♧"
                  title="Caregiver Alerts"
                  value={alerts.length}
                  subtitle={`${unread} unreviewed`}
                  color="orange"
                />
              </div>

              {lastResponse && (
                <section className="panel spaced-bottom">
                  <div className="panel-heading">
                    <h3>Latest Response</h3>
                    <span className="tag">
                      {lastResponse.source}
                    </span>
                  </div>

                  <p className="muted">
                    Recognized speech
                  </p>

                  <h3>"{lastResponse.text}"</h3>

                  <div className="info-box">
                    Classification:{" "}
                    <strong>
                      {lastResponse.classification}
                    </strong>
                  </div>
                </section>
              )}

              <div className="two-columns">

                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Recent Activity</h3>
                      <p>Latest events and responses</p>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => setPage("Analytics")}
                    >
                      View all →
                    </button>
                  </div>

                  <ActivityList logs={logs.slice(0, 5)} />
                </section>

                <section className="panel">
                  <h3>Reminder Adherence</h3>

                  <p className="muted">
                    Recorded acknowledgements
                  </p>

                  <div
                    className="donut"
                    style={{
                      "--progress": `${adherence}%`,
                    }}
                  >
                    <div className="donut-center">
                      <h2>{total ? `${adherence}%` : "—"}</h2>
                      <small>Adherence</small>
                    </div>
                  </div>

                  <div className="legend">
                    <span>● Acknowledged</span>
                    <strong>{acknowledged}</strong>
                  </div>

                  <div className="legend">
                    <span>○ Missed</span>
                    <strong>{missed}</strong>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* LIVE MONITORING */}

          {page === "Live Monitoring" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    SAFETY MONITORING
                  </div>

                  <h1>Live Monitoring</h1>

                  <p>
                    Demonstrate the prototype safety workflow.
                  </p>
                </div>

                <button
                  className={`button ${
                    monitoring ? "danger" : ""
                  }`}
                  onClick={toggleMonitoring}
                  disabled={!!event}
                >
                  {monitoring
                    ? "■ Stop Monitoring"
                    : "▶ Start Monitoring"}
                </button>
              </div>

              <div className="two-columns">

                <section className="panel">
                  <div className="panel-heading">
                    <h3>Pose Visualization</h3>
                    <span className="tag">Simulation</span>
                  </div>

                  <div className="camera-view">
                    <div className="camera-header">
                      <span>
                        {monitoring
                          ? "● ACTIVE"
                          : "○ OFFLINE"}
                      </span>

                      <span>SYNTHETIC POSE</span>
                    </div>

                    <svg viewBox="0 0 400 300">
                      <defs>
                        <pattern
                          id="grid"
                          width="25"
                          height="25"
                          patternUnits="userSpaceOnUse"
                        >
                          <path
                            d="M25 0H0V25"
                            fill="none"
                            stroke="#29444e"
                            strokeWidth=".7"
                          />
                        </pattern>
                      </defs>

                      <rect
                        width="400"
                        height="300"
                        fill="url(#grid)"
                      />

                      {monitoring ? (
                        <g
                          className="skeleton"
                          transform={
                            posture === "Fall"
                              ? "translate(330 100) rotate(90) scale(.85)"
                              : "translate(200 20)"
                          }
                        >
                          <circle cx="0" cy="25" r="18" />

                          <path d="M0 43V135 M-45 65H45" />

                          <path d="M-45 65L-70 110L-50 150" />

                          <path d="M45 65L70 110L50 150" />

                          <path d="M-30 135H30" />

                          <path d="M-30 135L-40 195L-45 245" />

                          <path d="M30 135L40 195L45 245" />

                          {[
                            [-45, 65],
                            [45, 65],
                            [-70, 110],
                            [70, 110],
                            [-50, 150],
                            [50, 150],
                            [-30, 135],
                            [30, 135],
                            [-40, 195],
                            [40, 195],
                            [-45, 245],
                            [45, 245],
                          ].map(([x, y], i) => (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r="5"
                              className="joint"
                            />
                          ))}
                        </g>
                      ) : (
                        <text
                          x="200"
                          y="150"
                          fill="#94a3b8"
                          textAnchor="middle"
                          fontSize="15"
                        >
                          Start monitoring to begin
                        </text>
                      )}
                    </svg>

                    <div className="camera-footer">
                      Synthetic pose data · No live camera
                    </div>
                  </div>

                  <div className="info-box">
                    Current state: <strong>{posture}</strong>
                  </div>
                </section>

                <section className="panel">
                  <h3>Detection Controls</h3>

                  <p className="muted">
                    Trigger a demonstration event.
                  </p>

                  <div className="control-list">

                    <button
                      className="scenario"
                      disabled={
                        !monitoring ||
                        !!event ||
                        !!activeReminder
                      }
                      onClick={() => simulateEvent("Fall")}
                    >
                      <span>⚠</span>

                      <div>
                        <strong>Simulate Fall</strong>
                        <small>Start spoken safety check-in</small>
                      </div>
                    </button>

                    <button
                      className="scenario"
                      disabled={
                        !monitoring ||
                        !!event ||
                        !!activeReminder
                      }
                      onClick={() =>
                        simulateEvent("Inactivity")
                      }
                    >
                      <span>◷</span>

                      <div>
                        <strong>Simulate Inactivity</strong>
                        <small>Test inactivity response</small>
                      </div>
                    </button>

                  </div>

                  <div className="module-list">
                    <div>
                      <span>Speech-to-Text</span>
                      <strong>
                        {SpeechRecognition
                          ? "Available"
                          : "Unavailable"}
                      </strong>
                    </div>

                    <div>
                      <span>Text-to-Speech</span>
                      <strong>
                        {voice ? "Enabled" : "Disabled"}
                      </strong>
                    </div>

                    <div>
                      <span>Local Response Rules</span>
                      <strong>{aiStatus}</strong>
                    </div>

                    <div>
                      <span>Caregiver Alerts</span>
                      <strong>In-app only</strong>
                    </div>
                  </div>
                </section>
              </div>

              <div className="notice">
                Academic prototype: safety events are simulated.
                This is not a validated emergency monitoring system.
              </div>
            </>
          )}

          {/* REMINDERS */}

          {page === "Reminders" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">DAILY CARE</div>

                  <h1>Smart Reminders</h1>

                  <p>
                    Schedule spoken reminders and record responses.
                  </p>
                </div>
              </div>

              <div className="two-columns">

                <section className="panel">
                  <h3>
                    {editing !== null
                      ? "Edit Reminder"
                      : "Create Reminder"}
                  </h3>

                  <form onSubmit={saveReminder}>

                    <label>Reminder name</label>

                    <input
                      required
                      maxLength={100}
                      placeholder="Example: Drink water"
                      value={form.name}
                      onChange={e =>
                        setForm({
                          ...form,
                          name: e.target.value,
                        })
                      }
                    />

                    <label>Category</label>

                    <select
                      value={form.category}
                      onChange={e =>
                        setForm({
                          ...form,
                          category: e.target.value,
                        })
                      }
                    >
                      <option>Medication</option>
                      <option>Hydration</option>
                      <option>Appointment</option>
                      <option>Daily Routine</option>
                    </select>

                    <label>Scheduled time</label>

                    <input
                      type="time"
                      required
                      value={form.time}
                      onChange={e =>
                        setForm({
                          ...form,
                          time: e.target.value,
                        })
                      }
                    />

                    <button
                      className="button"
                      type="submit"
                    >
                      {editing !== null
                        ? "Save Changes"
                        : "+ Add Reminder"}
                    </button>

                    {editing !== null && (
                      <button
                        type="button"
                        className="outline"
                        onClick={() => {
                          setEditing(null);
                          setForm(emptyForm);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </form>
                </section>

                <section className="panel">
                  <h3>Scheduled Reminders</h3>

                  {!reminders.length && (
                    <div className="empty">
                      <span>◷</span>
                      <p>No reminders scheduled</p>
                    </div>
                  )}

                  {reminders.map(r => (
                    <div
                      className="reminder-card"
                      key={r.id}
                    >
                      <div className="reminder-top">
                        <div className="activity-icon">
                          ◷
                        </div>

                        <div className="grow">
                          <strong>{r.name}</strong>

                          <small>
                            {r.category} · Daily at {r.time}
                          </small>
                        </div>

                        <button
                          className={`switch ${
                            r.enabled ? "on" : ""
                          }`}
                          role="switch"
                          aria-checked={r.enabled}
                          aria-label={`Enable ${r.name}`}
                          onClick={() =>
                            setReminders(old =>
                              old.map(item =>
                                item.id === r.id
                                  ? {
                                      ...item,
                                      enabled: !item.enabled,
                                    }
                                  : item
                              )
                            )
                          }
                        >
                          <span />
                        </button>
                      </div>

                      <div className="actions">
                        <button
                          className="outline"
                          disabled={
                            !r.enabled ||
                            !!event ||
                            !!activeReminder
                          }
                          onClick={() => triggerReminder(r)}
                        >
                          ▶ Test Now
                        </button>

                        <button
                          className="outline"
                          onClick={() => {
                            setEditing(r.id);

                            setForm({
                              name: r.name,
                              category: r.category,
                              time: r.time,
                            });
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="outline delete"
                          onClick={() =>
                            setReminders(old =>
                              old.filter(
                                item => item.id !== r.id
                              )
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              </div>

              <div className="notice">
                Reminders run while the application is open.
                Acknowledgement does not verify medication ingestion.
              </div>
            </>
          )}

          {/* CAREGIVER ALERTS */}

          {page === "Caregiver Alerts" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    NOTIFICATION CENTER
                  </div>

                  <h1>Caregiver Alerts</h1>

                  <p>
                    Review locally recorded safety events. No external notifications are sent.
                  </p>
                </div>

                <button
                  className="button"
                  onClick={testAlert}
                >
                  Create Test Alert
                </button>
              </div>

              <div className="stats-grid">
                <Stat
                  icon="♧"
                  title="Total Alerts"
                  value={alerts.length}
                  subtitle="Recorded safety events"
                  color="orange"
                />

                <Stat
                  icon="⚠"
                  title="Unreviewed"
                  value={unread}
                  subtitle="Awaiting review"
                  color="purple"
                />

                <Stat
                  icon="✓"
                  title="Reviewed"
                  value={alerts.length - unread}
                  subtitle="Reviewed alerts"
                  color="teal"
                />

                <Stat
                  icon="✉"
                  title="Unreviewed"
                  value={
                    alerts.filter(
                      a => !a.reviewed
                    ).length
                  }
                  subtitle="Awaiting local review"
                  color="blue"
                />
              </div>

              <section className="panel">
                <h3>Alert History</h3>

                {!alerts.length && (
                  <div className="empty">
                    <span>✓</span>
                    <p>No alerts recorded</p>
                  </div>
                )}

                {alerts.map(alert => (
                  <div
                    className="alert-card"
                    key={alert.id}
                  >
                    <div className="alert-icon">
                      ⚠
                    </div>

                    <div className="grow">
                      <strong>
                        {alert.type} — Prototype Alert
                      </strong>

                      <small>{alert.time}</small>

                      <p>Reason: {alert.reason}</p>

                      <span
                        className={`tag ${
                          alert.reviewed
                            ? "success"
                            : "warning"
                        }`}
                      >
                        In-app record
                      </span>
                    </div>

                    <button
                      className="outline"
                      disabled={alert.reviewed}
                      onClick={() =>
                        setAlerts(old =>
                          old.map(a =>
                            a.id === alert.id
                              ? { ...a, reviewed: true }
                              : a
                          )
                        )
                      }
                    >
                      {alert.reviewed
                        ? "Reviewed ✓"
                        : "Mark Reviewed"}
                    </button>
                  </div>
                ))}
              </section>
            </>
          )}

          {/* ANALYTICS */}

          {page === "Analytics" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    REPORTS AND INSIGHTS
                  </div>

                  <h1>Care Analytics</h1>

                  <p>Review recorded prototype activity.</p>
                </div>

                <button
                  className="button"
                  onClick={exportReport}
                >
                  ↓ Export Report
                </button>
              </div>

              <div className="stats-grid">
                <Stat
                  icon="▥"
                  title="Activity"
                  value={logs.length}
                  subtitle="Recorded events"
                  color="blue"
                />

                <Stat
                  icon="✓"
                  title="Acknowledged"
                  value={acknowledged}
                  subtitle="Reminder responses"
                  color="teal"
                />

                <Stat
                  icon="◷"
                  title="Missed"
                  value={missed}
                  subtitle="Unconfirmed reminders"
                  color="orange"
                />

                <Stat
                  icon="◎"
                  title="Adherence"
                  value={total ? `${adherence}%` : "—"}
                  subtitle="Acknowledgement rate"
                  color="purple"
                />
              </div>

              <section className="panel">
                <h3>Activity Analysis</h3>

                <div className="chart">
                  {[
                    ["Acknowledged", acknowledged, "#0d9488"],
                    ["Missed", missed, "#f59e0b"],
                    ["Alerts", alerts.length, "#ef6477"],
                  ].map(([label, value, color]) => (
                    <div
                      className="chart-column"
                      key={label}
                    >
                      <strong>{value}</strong>

                      <div className="bar-area">
                        <div
                          className="chart-bar"
                          style={{
                            height: `${
                              value /
                              Math.max(
                                acknowledged,
                                missed,
                                alerts.length,
                                1
                              ) *
                              100
                            }%`,
                            background: color,
                          }}
                        />
                      </div>

                      <small>{label}</small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel spaced">
                <h3>Complete Activity Log</h3>

                <ActivityList logs={logs} />
              </section>
            </>
          )}

          {/* SETTINGS */}

          {page === "Settings" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    CONFIGURATION
                  </div>

                  <h1>Settings</h1>

                  <p>
                    Configure the resident and connected services.
                  </p>
                </div>
              </div>

              <section className="panel settings-panel">

                <h3>Resident and Caregiver</h3>

                <label>Resident display name</label>

                <input
                  value={resident}
                  maxLength={60}
                  onChange={e =>
                    setResident(e.target.value)
                  }
                  placeholder="Demo Resident"
                />

                <p className="muted">Use fictional resident information. Alerts are stored locally and are not sent to a remote caregiver.</p>

                <div className="setting-row">
                  <div>
                    <strong>Voice Assistant</strong>
                    <p>Enable spoken prompts.</p>
                  </div>

                  <button
                    className={`switch ${voice ? "on" : ""}`}
                    role="switch"
                    aria-checked={voice}
                    aria-label="Voice assistant"
                    onClick={() => setVoice(!voice)}
                  >
                    <span />
                  </button>
                </div>

                <div className="setting-row">
                  <div>
                    <strong>Dark Mode</strong>
                    <p>Change application appearance.</p>
                  </div>

                  <button
                    className={`switch ${dark ? "on" : ""}`}
                    role="switch"
                    aria-checked={dark}
                    aria-label="Dark mode"
                    onClick={() => setDark(!dark)}
                  >
                    <span />
                  </button>
                </div>

                <div className="setting-row">
                  <div>
                    <strong>Text-to-Speech</strong>
                    <p>Test the spoken assistant.</p>
                  </div>

                  <button
                    className="outline"
                    disabled={!voice}
                    onClick={() =>
                      speak(
                        "Welcome to ElderCare AI Companion."
                      )
                    }
                  >
                    ▶ Test Voice
                  </button>
                </div>

                <div className="setting-row">
                  <div>
                    <strong>Local Response Rules</strong>
                    <p>Mode: {aiStatus}</p>
                  </div>

                  <button
                    className="outline"
                    onClick={testRules}
                  >
                    Test Rules
                  </button>
                </div>

                <div className="setting-row">
                  <div>
                    <strong>Caregiver Alerts</strong>
                    <p>Create a local demonstration notification.</p>
                  </div>

                  <button
                    className="outline"
                    onClick={testAlert}
                  >
                    Test In-App Alert
                  </button>
                </div>

                <div className="setting-row">
                  <div>
                    <strong>Clear Demo Data</strong>
                    <p>Remove locally saved records.</p>
                  </div>

                  <button
                    className="button danger"
                    onClick={resetData}
                  >
                    Reset Data
                  </button>
                </div>
              </section>
            </>
          )}

          <footer>
            ElderCare AI Companion © {now.getFullYear()} ·
            Academic Prototype · Not an emergency service
          </footer>

        </div>
      </main>

      {/* SAFETY CHECK-IN MODAL */}

      {event && (
        <div className="modal-overlay">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Safety check-in"
          >
            <div className="modal-icon warning">
              ⚠
            </div>

            <div className="eyebrow">
              {event.type.toUpperCase()} CHECK-IN
            </div>

            <h2>Are you okay?</h2>

            <p>
              A possible {event.type.toLowerCase()} has been
              simulated. Please speak or type your response.
            </p>

            <div className="countdown">
              {countdown}s
            </div>

            <div className="progress">
              <div
                style={{
                  width: `${countdown / 30 * 100}%`,
                }}
              />
            </div>

            <div className="voice-status">
              {speaking
                ? "🔊 Assistant speaking..."
                : listening
                  ? "🎙 Listening..."
                  : processing
                    ? "✦ Analysing response..."
                    : "Ready for your response"}
            </div>

            <button
              className={`mic-button ${
                listening ? "listening" : ""
              }`}
              disabled={
                processing ||
                speaking ||
                !SpeechRecognition
              }
              onClick={
                listening
                  ? stopListening
                  : startListening
              }
              aria-label="Use microphone"
            >
              🎙
            </button>

            <p className="muted">
              {listening
                ? "Tap to stop listening"
                : "Tap microphone to speak"}
            </p>

            <textarea
              rows={3}
              maxLength={500}
              value={transcript}
              placeholder="Or type your response here..."
              onChange={e =>
                setTranscript(e.target.value)
              }
              disabled={processing}
            />

            {aiResult && (
              <div className="ai-result">
                Rule-based classification:{" "}
                <strong>{aiResult}</strong>
              </div>
            )}

            <div className="modal-actions">

              <button
                className="button"
                disabled={
                  processing || !transcript.trim()
                }
                onClick={() =>
                  classifyResponse(transcript)
                }
              >
                {processing
                  ? "Analysing..."
                  : "✦ Analyse Response"}
              </button>

              <div className="quick-actions">

                <button
                  className="outline"
                  disabled={processing}
                  onClick={() =>
                    resolveEvent(
                      "SAFE",
                      "Manual safe response"
                    )
                  }
                >
                  ✓ I'm Okay
                </button>

                <button
                  className="button danger"
                  disabled={processing}
                  onClick={() =>
                    resolveEvent(
                      "HELP",
                      "Manual help request"
                    )
                  }
                >
                  I Need Help
                </button>
              </div>
            </div>

            <small>
              Retry {event.retries} of 2
            </small>
          </div>
        </div>
      )}

      {/* REMINDER MODAL */}

      {activeReminder && (
        <div className="modal-overlay">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Routine reminder"
          >
            <div className="modal-icon">
              ◷
            </div>

            <div className="eyebrow">
              {activeReminder.category}
            </div>

            <h2>{activeReminder.name}</h2>

            <p>Scheduled routine reminder</p>

            <div className="countdown">
              {reminderSeconds}s
            </div>

            <div className="modal-actions">

              <button
                className="button"
                onClick={() =>
                  finishReminder("Acknowledged")
                }
              >
                ✓ Acknowledge
              </button>

              <button
                className="outline"
                onClick={() =>
                  finishReminder("Snoozed")
                }
              >
                Snooze 2 Minutes
              </button>

              <button
                className="outline"
                onClick={() =>
                  finishReminder("Missed")
                }
              >
                Mark Unconfirmed
              </button>

            </div>
          </div>
        </div>
      )}

      {/* TOAST */}

      {toast && (
        <div className="toast" role="status">
          {toast}

          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

    </div>
  );
}

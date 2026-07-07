"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * TerminalOnboarding
 * A Matrix-inspired onboarding: the system types to the user line by line,
 * then waits for minimal styled inputs. Cool, sparse, a little uncanny.
 * White/grey on black, monospace.
 *
 * Collects birth data (date, time, place) as a conversation, then calls
 * onComplete with the answers. Account/email step is intentionally NOT here —
 * decide whether it comes before this screen or after "…found you."
 *
 * Usage:
 *   <TerminalOnboarding onComplete={(data) => { ... }} />
 *   // data = { date: string, time: string, place: string, timeUnknown: boolean }
 */

type Answers = {
  date?: string;
  time?: string;
  place?: string;
  timeUnknown?: boolean;
};

type Field = {
  type: "date" | "time" | "text";
  placeholder: string;
  key: "date" | "time" | "place";
  toggle?: string;
};

type Step = {
  say: string[];
  field?: Field;
  final?: boolean;
};

const STEPS: Step[] = [
  { say: ["a shape was set the moment you arrived...", "let's find it. "] },
  {
    say: ["when did you arrive?"],
    field: { type: "date", placeholder: "MM / DD / YYYY", key: "date" },
  },
  {
    say: ["the hour matters more than you'd think."],
    field: {
      type: "time",
      placeholder: "HH : MM",
      key: "time",
      toggle: "i don't know the time",
    },
  },
  {
    say: ["and where?"],
    field: { type: "text", placeholder: "city, country", key: "place" },
  },
  { say: ["…found you."], final: true },
];

// timing knobs
const TYPE_MS = 26; // per character
const DOT_PAUSE = 90; // extra pause after a period
const LINE_PAUSE = 420; // beat between lines
const START_DELAY = 120;

// auto-insert separators as digits are typed
function formatDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8); // MMDDYYYY
  let out = "";
  for (let i = 0; i < d.length; i++) {
    out += d[i];
    if (i === 1 || i === 3) out += " / ";
  }
  return out;
}
function formatTime(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4); // HHMM
  let out = "";
  for (let i = 0; i < d.length; i++) {
    out += d[i];
    if (i === 1) out += " : ";
  }
  return out;
}

type LogLine = { text: string; cls: "sys" | "me" };

export default function TerminalOnboarding({
  onComplete,
}: {
  onComplete?: (data: Answers) => void;
}) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [typing, setTyping] = useState<string>(""); // currently-typing partial line
  const [showField, setShowField] = useState(false);
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [value, setValue] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [meridiem, setMeridiem] = useState<"AM" | "PM">("AM");
  const [isFinal, setIsFinal] = useState(false);

  const answers = useRef<Answers>({});
  const stepRef = useRef(0);
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Monotonic token identifying the active run. Each effect invocation bumps
  // it; any in-flight async loop bails the moment it no longer matches. This
  // prevents React StrictMode's double-invoked effect from typing lines twice.
  const runIdRef = useRef(0);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wait = (ms: number) =>
    new Promise<void>((res) => setTimeout(res, ms));

  const scrollDown = () => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // type one system line, char by char
  const typeLine = useCallback(
    async (text: string, runId: number) => {
      if (runId !== runIdRef.current) return;
      if (text === "") {
        setLines((l) => [...l, { text: "", cls: "sys" }]);
        return;
      }
      if (reduceMotion) {
        setLines((l) => [...l, { text, cls: "sys" }]);
        scrollDown();
        return;
      }
      setTyping("");
      await wait(START_DELAY);
      let acc = "";
      for (let i = 0; i < text.length; i++) {
        if (runId !== runIdRef.current) return;
        acc += text[i];
        setTyping(acc);
        scrollDown();
        // eslint-disable-next-line no-await-in-loop
        await wait(TYPE_MS + (text[i] === "." ? DOT_PAUSE : 0));
      }
      // commit the finished line, clear the in-progress buffer
      setTyping("");
      setLines((l) => [...l, { text, cls: "sys" }]);
      scrollDown();
    },
    [reduceMotion]
  );

  const runStep = useCallback(
    async (runId: number) => {
      if (runId !== runIdRef.current) return;
      const s = STEPS[stepRef.current];
      if (!s) return;
      setShowField(false);
      setActiveField(null);
      setValue("");
      setTimeUnknown(false);
      setMeridiem("AM");

      for (const line of s.say) {
        // eslint-disable-next-line no-await-in-loop
        await typeLine(line, runId);
        if (runId !== runIdRef.current) return;
        // eslint-disable-next-line no-await-in-loop
        await wait(LINE_PAUSE);
      }
      if (runId !== runIdRef.current) return;

      if (s.final) {
        setIsFinal(true);
        return;
      }
      if (s.field) {
        setActiveField(s.field);
        setShowField(true);
        setTimeout(() => inputRef.current?.focus(), 80);
        return;
      }
      // Interstitial step (no field, not final): auto-advance to the next step
      // after a short beat so the intro flows into the first question.
      await wait(LINE_PAUSE);
      if (runId !== runIdRef.current) return;
      stepRef.current += 1;
      runStep(runId);
    },
    [typeLine]
  );

  useEffect(() => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    stepRef.current = 0;
    setLines([]);
    setTyping("");
    runStep(runId);
    return () => {
      // Invalidate this run so any in-flight async loop stops immediately.
      runIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const f = activeField;
    if (!f) return;
    const base = value.trim();
    // For the time field, append the chosen AM/PM marker to the value.
    const composed =
      f.type === "time" && base ? `${base} ${meridiem}` : base;
    const val = timeUnknown ? "(time unknown)" : composed;
    if (!val) return;

    answers.current[f.key] = timeUnknown ? "" : val;
    if (f.key === "time") answers.current.timeUnknown = timeUnknown;

    // echo the user's answer back, brighter
    setShowField(false);
    setActiveField(null);
    setLines((l) => [...l, { text: val, cls: "me" }]);
    setValue("");
    await wait(300);
    stepRef.current += 1;
    runStep(runIdRef.current);
  };

  const finish = () => {
    onComplete?.(answers.current);
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        color: "#000",
        // Match the BEGIN button: Geist family at semibold weight. Set here on
        // the root container so every child (log lines, inputs, buttons, which
        // all use fontFamily "inherit") picks up the same typeface.
        fontFamily: '"Geist", sans-serif',
        fontWeight: 600,
        width: "100%",
        maxWidth: 440,
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          // Translucent frosted-grey glass rectangle with curved corners that
          // floats over the animated sky. The blur + subtle border + shadow
          // give it a glassmorphism feel while the grey tint keeps the text
          // readable against the moving background behind it.
          width: "100%",
          // Subtract the page's vertical padding (main uses py-6 = 48px total)
          // so the card fits fully inside the viewport and the flex parent can
          // center it vertically instead of overflowing / pinning to the top.
          height: "min(100dvh - 96px, 760px)",
          background: "rgba(120, 120, 120, 0.38)",
          backdropFilter: "blur(16px) saturate(120%)",
          WebkitBackdropFilter: "blur(16px) saturate(120%)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          borderRadius: 28,
          boxShadow:
            "0 24px 60px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
          padding: "calc(env(safe-area-inset-top, 0px) + 28px) 28px calc(env(safe-area-inset-bottom, 0px) + 28px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          ref={logRef}
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflowY: "auto",
            paddingTop: "clamp(12px, 3vh, 32px)",
          }}
        >
          {lines.map((l, i) => (
            <div
              key={i}
              style={{
                fontSize: 16,
                lineHeight: 1.55,
                letterSpacing: ".3px",
                whiteSpace: "pre-wrap",
                textWrap: "pretty",
                color: l.cls === "me" ? "#000" : "#1a1a1a",
              }}
            >
              {l.cls === "me" && (
                <span style={{ color: "#333" }}>{"› "}</span>
              )}
              {l.text === "" ? "\u00A0" : l.text}
            </div>
          ))}

          {/* the line currently being typed */}
          {typing !== "" && (
            <div
              style={{
                fontSize: 16,
                lineHeight: 1.55,
                letterSpacing: ".3px",
                whiteSpace: "pre-wrap",
                textWrap: "pretty",
                color: "#1a1a1a",
              }}
            >
              {typing}
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 19,
                  background: "#000",
                  marginLeft: 2,
                  verticalAlign: -3,
                  animation: "siBlink 1.05s steps(1) infinite",
                }}
              />
            </div>
          )}
        </div>

        {/* answer zone */}
        {showField && activeField && (
          <div style={{ marginTop: 6 }}>
            {(() => {
              const isMasked =
                activeField.type === "date" || activeField.type === "time";
              const mask = activeField.placeholder; // "MM / DD / YYYY" or "HH : MM"
              const nbsp = (s: string) => s.replace(/ /g, "\u00A0");
              const typed = value; // already formatted on change
              const remaining = mask.slice(typed.length);
              return (
                <div
                  style={{
                    position: "relative",
                    borderBottom: "1px solid #4a4a4a",
                    padding: "9px 2px",
                  }}
                >
                  {/* ghost watermark: typed part transparent, remaining grey */}
                  {isMasked && !timeUnknown && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        left: 2,
                        top: 9,
                        fontSize: 16,
                        letterSpacing: 1,
                        color: "#3a3a3a",
                        pointerEvents: "none",
                        whiteSpace: "pre",
                      }}
                    >
                      <span style={{ color: "transparent" }}>{nbsp(typed)}</span>
                      {nbsp(remaining)}
                    </div>
                  )}
                  {/* plain placeholder for free-text fields */}
                  <input
                    ref={inputRef}
                    value={value}
                    disabled={timeUnknown}
                    inputMode={isMasked ? "numeric" : "text"}
                    placeholder={isMasked ? "" : activeField.placeholder}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (activeField.type === "date") setValue(formatDate(v));
                      else if (activeField.type === "time")
                        setValue(formatTime(v));
                      else setValue(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submit();
                    }}
                    style={{
                      position: "relative",
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      color: "#000",
                      fontFamily: "inherit",
                      fontSize: 16,
                      letterSpacing: 1,
                      padding: 0,
                      outline: "none",
                      caretColor: "#000",
                    }}
                  />
                </div>
              );
            })()}
            {activeField.type === "time" && !timeUnknown && (
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                {(["AM", "PM"] as const).map((m) => {
                  const selected = meridiem === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMeridiem(m);
                        setTimeout(() => inputRef.current?.focus(), 30);
                      }}
                      style={{
                        background: selected ? "#000" : "transparent",
                        border: `1px solid ${selected ? "#000" : "#4a4a4a"}`,
                        color: selected ? "#fff" : "#1a1a1a",
                        fontFamily: "inherit",
                        fontSize: 11,
                        letterSpacing: 2,
                        padding: "8px 16px",
                        borderRadius: 30,
                        cursor: "pointer",
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            )}
            {activeField.toggle && (
              <div
                onClick={() => {
                  const next = !timeUnknown;
                  setTimeUnknown(next);
                  if (!next) setTimeout(() => inputRef.current?.focus(), 30);
                }}
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  letterSpacing: 1,
                  color: "#222",
                  cursor: "pointer",
                }}
              >
                {(timeUnknown ? "● " : "○ ") + activeField.toggle}
              </div>
            )}
            <button
              onClick={submit}
              style={{
                marginTop: 14,
                background: "transparent",
                border: "1px solid #000",
                color: "#000",
                fontFamily: "inherit",
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                padding: "11px 20px",
                borderRadius: 30,
                cursor: "pointer",
              }}
            >
              enter ⏎
            </button>
          </div>
        )}

        {/* final */}
        {isFinal && (
          <button
            onClick={finish}
            style={{
              marginTop: 14,
              alignSelf: "flex-start",
              background: "transparent",
              border: "1px solid #000",
              color: "#000",
              fontFamily: "inherit",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              padding: "12px 22px",
              borderRadius: 30,
              cursor: "pointer",
            }}
          >
            enter the spiral ⏎
          </button>
        )}
      </div>

      <style>{`@keyframes siBlink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

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
  { say: ["a shape was set the moment you arrived.", "let's find it."] },
  {
    say: ["when did you arrive?"],
    field: { type: "date", placeholder: "YYYY / MM / DD", key: "date" },
  },
  {
    say: ["the hour matters more than you'd think."],
    field: {
      type: "time",
      placeholder: "— : —",
      key: "time",
      toggle: "i don't know the time",
    },
  },
  {
    say: ["and where?"],
    field: { type: "text", placeholder: "city, country", key: "place" },
  },
  { say: ["", "…found you.", "", "the spiral is yours now."], final: true },
];

// timing knobs
const TYPE_MS = 26; // per character
const DOT_PAUSE = 90; // extra pause after a period
const LINE_PAUSE = 420; // beat between lines
const START_DELAY = 120;

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
    const val = timeUnknown ? "(time unknown)" : value.trim();
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
        background: "#000",
        color: "#e8e4da",
        fontFamily:
          "var(--font-space-mono), 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 380,
          maxWidth: "100%",
          height: "92vh",
          maxHeight: 780,
          padding: "40px 30px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          ref={logRef}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            overflowY: "auto",
            paddingTop: 30,
          }}
        >
          {lines.map((l, i) => (
            <div
              key={i}
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                letterSpacing: ".3px",
                whiteSpace: "pre-wrap",
                color: l.cls === "me" ? "#e8e4da" : "#9a958a",
              }}
            >
              {l.cls === "me" && (
                <span style={{ color: "#6a6660" }}>{"› "}</span>
              )}
              {l.text === "" ? "\u00A0" : l.text}
            </div>
          ))}

          {/* the line currently being typed */}
          {typing !== "" && (
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                letterSpacing: ".3px",
                whiteSpace: "pre-wrap",
                color: "#9a958a",
              }}
            >
              {typing}
              <span
                style={{
                  display: "inline-block",
                  width: 9,
                  height: 17,
                  background: "#e8e4da",
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
            <input
              ref={inputRef}
              value={value}
              disabled={timeUnknown}
              placeholder={activeField.placeholder}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #2a2a2a",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 16,
                letterSpacing: 1,
                padding: "9px 2px",
                outline: "none",
              }}
            />
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
                  color: "#5a5650",
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
                border: "1px solid #3a3a3a",
                color: "#cfcbc1",
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
              border: "1px solid #3a3a3a",
              color: "#cfcbc1",
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

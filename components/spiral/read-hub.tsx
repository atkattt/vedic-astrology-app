"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * ReadHub
 * The terminal-style read + judge component for the spiral screen.
 * The system "speaks" a read (types out in grey mono with a › prompt and
 * blinking cursor); the user responds with bracketed [ ✓ yes ] / [ ✕ no ]
 * commands (green / red). Disagree can optionally open why-chips.
 *
 * Black + grey palette; matches the onboarding terminal voice.
 *
 * Props:
 *   read       — the current read text (string). When it changes, it re-types.
 *   remaining  — number shown as "N left" (optional).
 *   askWhy     — if true, Disagree opens reason chips before advancing (default true).
 *   onAgree    — () => void
 *   onDisagree — (reason?: string) => void   // reason from chips, or undefined if skipped/askWhy=false
 *
 * Usage:
 *   <ReadHub
 *     read={currentRead}
 *     remaining={readsLeft}
 *     onAgree={handleAgree}
 *     onDisagree={(reason) => handleDisagree(reason)}
 *   />
 */

const TYPE_MS = 24;
const DOT_PAUSE = 120;
const START_DELAY = 200;
const WHY_REASONS = ["not me", "used to be", "too harsh", "not sure"];

export default function ReadHub({
  read,
  remaining,
  askWhy = true,
  onAgree,
  onDisagree,
}: {
  read: string;
  remaining?: number;
  askWhy?: boolean;
  onAgree?: () => void;
  onDisagree?: (reason?: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false); // typing finished -> commands show
  const [whyOpen, setWhyOpen] = useState(false);
  const [fading, setFading] = useState(false);
  const cancelled = useRef(false);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // type out whenever `read` changes
  useEffect(() => {
    cancelled.current = false;
    setDone(false);
    setWhyOpen(false);
    setTyped("");

    if (reduceMotion) {
      setTyped(read);
      setDone(true);
      return;
    }

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (cancelled.current) return;
      if (i < read.length) {
        const ch = read[i];
        i++;
        setTyped(read.slice(0, i));
        timer = setTimeout(tick, TYPE_MS + (ch === "." ? DOT_PAUSE : 0));
      } else {
        setDone(true);
      }
    };
    timer = setTimeout(tick, START_DELAY);
    return () => {
      cancelled.current = true;
      clearTimeout(timer);
    };
  }, [read, reduceMotion]);

  const advance = useCallback((fn: () => void) => {
    setFading(true);
    setTimeout(() => {
      setFading(false);
      fn();
    }, 280);
  }, []);

  const handleAgree = () => {
    if (!done) return;
    advance(() => onAgree?.());
  };

  const handleDisagree = () => {
    if (!done) return;
    if (askWhy) {
      setWhyOpen(true);
    } else {
      advance(() => onDisagree?.(undefined));
    }
  };

  const pickReason = (reason?: string) => {
    advance(() => onDisagree?.(reason));
  };

  // keyboard Y / N
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (whyOpen) return;
      if (e.key.toLowerCase() === "y") handleAgree();
      if (e.key.toLowerCase() === "n") handleDisagree();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, whyOpen]);

  const mono =
    "'Geist Pixel', ui-monospace, monospace";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 460,
        border: "1px solid #1a1a1a",
        borderRadius: 12,
        background: "#070707",
        padding: "20px 18px 16px",
        fontFamily: mono,
      }}
    >
      {/* meta line */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#4a4a4a",
          marginBottom: 18,
        }}
      >
        <span>a read about you</span>
        {typeof remaining === "number" && <span>{remaining} left</span>}
      </div>

      {/* the typed read */}
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.55,
          letterSpacing: 0.4,
          color: "#9a9a9a",
          minHeight: 66,
          whiteSpace: "pre-wrap",
          opacity: fading ? 0.3 : 1,
          transition: "opacity .25s",
        }}
      >
        <span style={{ color: "#555" }}>{"› "}</span>
        {typed}
        {!done && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 16,
              background: "#9a9a9a",
              marginLeft: 1,
              verticalAlign: -3,
              animation: "rhBlink 1.05s steps(1) infinite",
            }}
          />
        )}
      </div>

      {/* commands OR why-chips */}
      {!whyOpen ? (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 20,
            opacity: done && !fading ? 1 : 0,
            transition: "opacity .4s",
            pointerEvents: done && !fading ? "auto" : "none",
          }}
        >
          <CmdButton variant="yes" onClick={handleAgree}>
            yes
          </CmdButton>
          <CmdButton variant="no" onClick={handleDisagree}>
            no
          </CmdButton>
        </div>
      ) : (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "#4a4a4a",
              marginBottom: 10,
            }}
          >
            why? (optional)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {WHY_REASONS.map((r) => (
              <Chip key={r} onClick={() => pickReason(r)}>
                {r}
              </Chip>
            ))}
            <Chip dashed onClick={() => pickReason(undefined)}>
              skip
            </Chip>
          </div>
        </div>
      )}

      <style>{`@keyframes rhBlink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

function CmdButton({
  variant,
  onClick,
  children,
}: {
  variant: "yes" | "no";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const green = {
    color: hover ? "#8fe0a3" : "#5fa873",
    border: hover ? "#3f8a55" : "#1f3a28",
    bg: hover ? "rgba(95,168,115,.1)" : "transparent",
    glow: hover ? "0 0 14px rgba(95,168,115,.15)" : "none",
    glyph: "✓",
  };
  const red = {
    color: hover ? "#e88f9c" : "#b0606e",
    border: hover ? "#8a3f4c" : "#3a1f24",
    bg: hover ? "rgba(176,96,110,.1)" : "transparent",
    glow: hover ? "0 0 14px rgba(176,96,110,.15)" : "none",
    glyph: "✕",
  };
  const s = variant === "yes" ? green : red;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 8,
        color: s.color,
        fontFamily: "inherit",
        fontSize: 13,
        letterSpacing: 1,
        padding: "13px 10px",
        cursor: "pointer",
        textAlign: "center",
        boxShadow: s.glow,
        transition: "all .16s",
      }}
    >
      <span style={{ opacity: 0.5 }}>[</span> {s.glyph} {children}{" "}
      <span style={{ opacity: 0.5 }}>]</span>
    </button>
  );
}

function Chip({
  children,
  dashed,
  onClick,
}: {
  children: React.ReactNode;
  dashed?: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: "inherit",
        fontSize: 12,
        letterSpacing: 0.5,
        border: `1px ${dashed ? "dashed" : "solid"} ${
          hover ? "#b0606e" : "#2a2a2a"
        }`,
        borderRadius: 20,
        padding: "8px 13px",
        cursor: "pointer",
        background: "transparent",
        color: hover ? "#e88f9c" : "#7a7a7a",
        transition: "all .16s",
      }}
    >
      {children}
    </button>
  );
}

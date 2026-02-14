"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Heart = {
  id: string;
  x: number; // px
  y: number; // px
  size: number; // px
  drift: number; // px left/right
  duration: number; // ms
  delay: number; // ms
  emoji: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function distance(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function Page() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);

  const [accepted, setAccepted] = useState(false);
  const [noPos, setNoPos] = useState<{ x: number; y: number } | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  const heartEmojis = useMemo(() => ["💖", "💗", "💘", "💝", "💕", "❤️", "🩷"], []);

  // Track pointer/mouse for proximity behavior
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      setPointer({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Place the "No" button near its normal position once we know layout
  useEffect(() => {
    if (!wrapRef.current || !noBtnRef.current) return;

    const placeInitial = () => {
      const wrap = wrapRef.current!;
      const noBtn = noBtnRef.current!;
      const w = wrap.getBoundingClientRect();
      const b = noBtn.getBoundingClientRect();

      // Put it roughly where it already is, but converted to wrap-relative coords
      const x = b.left - w.left;
      const y = b.top - w.top;
      setNoPos({ x, y });
    };

    // Run after first paint + when resizing
    const t = window.setTimeout(placeInitial, 0);
    window.addEventListener("resize", placeInitial);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", placeInitial);
    };
  }, []);

  // Make the "No" button dodge only when pointer is close
  useEffect(() => {
    if (accepted) return;
    if (!wrapRef.current || !noBtnRef.current) return;
    if (!pointer) return;
    if (!noPos) return;

    const wrap = wrapRef.current.getBoundingClientRect();
    const btnRect = noBtnRef.current.getBoundingClientRect();

    const btnCenterX = btnRect.left + btnRect.width / 2;
    const btnCenterY = btnRect.top + btnRect.height / 2;

    // How close before it dodges (tune this)
    const dangerRadius = Math.max(90, Math.min(150, btnRect.width * 1.2));

    const d = distance(pointer.x, pointer.y, btnCenterX, btnCenterY);
    if (d > dangerRadius) return;

    // Calculate new position away from pointer
    const awayX = btnCenterX - pointer.x;
    const awayY = btnCenterY - pointer.y;
    const len = Math.max(1, Math.hypot(awayX, awayY));
    const nx = awayX / len;
    const ny = awayY / len;

    // Scoot amount
    const scoot = 140;

    // Current pos is wrap-relative; convert center movement into wrap-relative offset
    const currentX = noPos.x;
    const currentY = noPos.y;

    // Propose new top-left position
    let proposedX = currentX + nx * scoot;
    let proposedY = currentY + ny * scoot;

    // Keep within wrapper bounds
    const maxX = wrap.width - btnRect.width;
    const maxY = wrap.height - btnRect.height;

    // Add a little randomness so it feels playful
    proposedX += (Math.random() - 0.5) * 60;
    proposedY += (Math.random() - 0.5) * 60;

    proposedX = clamp(proposedX, 0, maxX);
    proposedY = clamp(proposedY, 0, maxY);

    // If it didn't move much (stuck in corner), try a random spot
    const moved = Math.hypot(proposedX - currentX, proposedY - currentY);
    if (moved < 40) {
      proposedX = Math.random() * maxX;
      proposedY = Math.random() * maxY;
    }

    setNoPos({ x: proposedX, y: proposedY });
  }, [pointer, noPos, accepted]);

  // Mobile: dodge on touchstart if finger is near the "No" button
  const onNoTouchStart: React.TouchEventHandler<HTMLButtonElement> = (e) => {
    if (accepted) return;
    if (!wrapRef.current || !noBtnRef.current || !noPos) return;

    const touch = e.touches[0];
    if (!touch) return;

    const btnRect = noBtnRef.current.getBoundingClientRect();
    const dangerRadius = 140;
    const btnCenterX = btnRect.left + btnRect.width / 2;
    const btnCenterY = btnRect.top + btnRect.height / 2;

    const d = distance(touch.clientX, touch.clientY, btnCenterX, btnCenterY);
    if (d > dangerRadius) return;

    // Prevent accidental click
    e.preventDefault();
    e.stopPropagation();

    // Move it by faking a pointer position
    setPointer({ x: touch.clientX, y: touch.clientY });
  };

  const popHearts = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const count = 70; // "a lot of hearts"
    const newHearts: Heart[] = Array.from({ length: count }).map((_, i) => {
      const size = 14 + Math.random() * 24;
      return {
        id: uid() + "-" + i,
        x: Math.random() * w,
        y: h - 80 - Math.random() * 60,
        size,
        drift: (Math.random() - 0.5) * 180,
        duration: 1200 + Math.random() * 1400,
        delay: Math.random() * 250,
        emoji: heartEmojis[Math.floor(Math.random() * heartEmojis.length)],
      };
    });

    setHearts((prev) => [...prev, ...newHearts]);

    // Cleanup after animation finishes
    window.setTimeout(() => {
      setHearts((prev) => prev.slice(newHearts.length));
    }, 3200);
  };

  const onYes = () => {
    setAccepted(true);
    popHearts();
  };

  return (
    <div className="page">
      <div className="bgGlow" aria-hidden="true" />

      {/* Hearts overlay */}
      <div className="heartsLayer" aria-hidden="true">
        {hearts.map((heart) => (
          <span
            key={heart.id}
            className="heart"
            style={{
              left: heart.x,
              top: heart.y,
              fontSize: heart.size,
              animationDuration: `${heart.duration}ms`,
              animationDelay: `${heart.delay}ms`,
              ["--drift" as any]: `${heart.drift}px`,
            }}
          >
            {heart.emoji}
          </span>
        ))}
      </div>

      <main className="card" ref={wrapRef}>
        <div className="title">
          <span className="sparkle">✨</span>
          <h1>Will you be my Valentine? 💌</h1>
          <span className="sparkle">✨</span>
        </div>

        <p className="subtitle">
          I promise snacks, good vibes, and a lot of “I’m proud of you” energy 🥺🌷
        </p>

        <div className="actionsArea">
          <button
            className="btn yes"
            onClick={onYes}
            disabled={accepted}
            aria-label="Yes"
          >
            Yes 💖
          </button>

          {/* The "No" button is positioned absolutely so it can scoot */}
          <button
            ref={noBtnRef}
            className="btn no"
            onClick={(e) => {
              // If someone somehow clicks it (rare), just scoot anyway
              e.preventDefault();
              e.stopPropagation();
              setPointer((p) => p ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
            }}
            onTouchStart={onNoTouchStart}
            style={
              noPos
                ? {
                    transform: `translate3d(${noPos.x}px, ${noPos.y}px, 0)`,
                  }
                : undefined
            }
            aria-label="No"
          >
            No 🙅‍♀️💔
          </button>
        </div>

        <div className={`message ${accepted ? "show" : ""}`}>
          {/* Must match EXACT text */}
          Best decision ever. I love you ❤️
        </div>

        <div className="footer">
          <span>💞</span>
          <span>Made with extra cute energy</span>
          <span>💞</span>
        </div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100dvh;
          display: grid;
          place-items: center;
          padding: 18px;
          background: radial-gradient(1200px 800px at 50% 10%, #ffe7f2 0%, #fff 40%, #fff 100%);
          overflow: hidden;
          position: relative;
        }

        .bgGlow {
          position: absolute;
          inset: -40%;
          background:
            radial-gradient(circle at 20% 30%, rgba(255, 102, 178, 0.18), transparent 55%),
            radial-gradient(circle at 80% 20%, rgba(255, 77, 109, 0.14), transparent 60%),
            radial-gradient(circle at 50% 80%, rgba(255, 153, 204, 0.18), transparent 55%);
          filter: blur(20px);
          pointer-events: none;
          animation: floaty 10s ease-in-out infinite;
        }

        @keyframes floaty {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -10px, 0) scale(1.03); }
        }

        .card {
          width: min(520px, 100%);
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(255, 120, 170, 0.25);
          border-radius: 24px;
          box-shadow: 0 18px 60px rgba(255, 82, 140, 0.15);
          padding: 22px 18px;
          backdrop-filter: blur(10px);
          position: relative;

          /* Make space for the dodging button to move around */
          height: min(520px, 72vh);
          overflow: hidden;
        }

        .title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
        }

        h1 {
          margin: 0;
          font-size: clamp(22px, 5.6vw, 30px);
          letter-spacing: -0.02em;
          color: #b3125a;
        }

        .sparkle {
          font-size: 18px;
          opacity: 0.9;
        }

        .subtitle {
          margin: 12px auto 0;
          text-align: center;
          color: rgba(90, 20, 50, 0.85);
          line-height: 1.4;
          font-size: 15px;
          max-width: 42ch;
        }

        .actionsArea {
          position: relative;
          margin-top: 18px;
          height: 250px; /* playground area for the "No" button */
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(255, 218, 236, 0.55), rgba(255, 255, 255, 0.35));
          border: 1px dashed rgba(255, 120, 170, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 14px;
        }

        .btn {
          border: none;
          border-radius: 999px;
          padding: 12px 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 220ms ease, box-shadow 220ms ease, filter 220ms ease, opacity 220ms ease;
          touch-action: manipulation;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          will-change: transform;
        }

        .btn:active {
          transform: translateY(1px) scale(0.99);
        }

        .yes {
          position: relative;
          z-index: 2;
          background: linear-gradient(180deg, #ff4d9d, #ff2f76);
          color: white;
          box-shadow: 0 12px 26px rgba(255, 58, 124, 0.25);
        }

        .yes:hover {
          filter: brightness(1.02);
          transform: translateY(-1px) scale(1.02);
        }

        .yes:disabled {
          opacity: 0.65;
          cursor: default;
        }

        .no {
          position: absolute;
          left: 0;
          top: 0;
          z-index: 1;
          background: rgba(255, 255, 255, 0.9);
          color: #8b2a58;
          border: 1px solid rgba(255, 77, 157, 0.35);
          box-shadow: 0 10px 24px rgba(255, 120, 170, 0.15);

          /* Smooth scooting */
          transition: transform 240ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }

        .no:hover {
          transform: translate3d(var(--x, 0), var(--y, 0), 0) scale(1.02);
        }

        .message {
          margin-top: 18px;
          text-align: center;
          font-size: 18px;
          font-weight: 800;
          color: #b3125a;
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 320ms ease, transform 320ms ease;
        }

        .message.show {
          opacity: 1;
          transform: translateY(0);
        }

        .footer {
          margin-top: 16px;
          display: flex;
          gap: 10px;
          justify-content: center;
          align-items: center;
          color: rgba(90, 20, 50, 0.7);
          font-size: 13px;
        }

        /* Hearts overlay */
        .heartsLayer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .heart {
          position: absolute;
          animation-name: heartPop;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
          opacity: 0;
          filter: drop-shadow(0 6px 12px rgba(255, 60, 130, 0.18));
        }

        @keyframes heartPop {
          0% {
            transform: translate3d(0, 0, 0) scale(0.7);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--drift), -520px, 0) scale(1.2);
            opacity: 0;
          }
        }

        /* Small screen tweaks */
        @media (max-width: 420px) {
          .actionsArea {
            height: 270px;
          }
          .btn {
            font-size: 15px;
            padding: 12px 14px;
          }
        }
      `}</style>
    </div>
  );
}
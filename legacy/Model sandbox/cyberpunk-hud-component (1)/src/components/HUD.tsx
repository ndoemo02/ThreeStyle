import { useState, useEffect, useCallback } from "react";

/* ─── data ─── */
const KEYWORD_SETS = [
  ["Nocne miasto", "Beton", "Przyszłość"],
  ["Neon", "Ulica", "Kod"],
  ["Cień", "Bass", "Imperium"],
  ["Chrome", "Fala", "Dźwięk"],
  ["Laserowy deszcz", "Cyberprzestrzeń", "Rap"],
  ["Bitwa", "Mikrofon", "Korona"],
];

const STT_LINES = [
  "lecę z tekstem nocą...",
  "beton pęka, gdy flow się rozpędza...",
  "Na ulicach miasta...",
  "Czuj ten bit?",
  "cyfrowy świat, analogowy ból...",
  "Raz, rymuj faz...",
  "",
];

/* ─── sub-components ─── */

function StatusBlinker() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVisible((v) => !v), 520);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-[11px] tracking-widest text-cyan-neon/80 uppercase">
      {"// ANALYZING VOCAL INPUT"}
      <span className={visible ? "opacity-100" : "opacity-0"}>_</span>
    </span>
  );
}

interface BarProps {
  label: string;
  value: number;
  variant: "cyan" | "purple" | "mixed";
}

function FlowBar({ label, value, variant }: BarProps) {
  const gradientClass =
    variant === "cyan"
      ? "bar-gradient-cyan"
      : variant === "purple"
        ? "bar-gradient-purple"
        : "bar-gradient-mixed";

  const glowColor =
    variant === "purple" ? "shadow-[0_0_8px_#bf00ff55]" : "shadow-[0_0_8px_#00f0ff55]";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase">
        <span className="text-white/50">{label}</span>
        <span className="text-cyan-neon/90 tabular-nums">{value}%</span>
      </div>
      <div className="relative h-[6px] w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${gradientClass} ${glowColor} animate-bar-pulse transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/* ─── main HUD ─── */

export default function HUD() {
  const [keywords, setKeywords] = useState(KEYWORD_SETS[0]);
  const [keyAnim, setKeyAnim] = useState(0);
  const [sttText, setSttText] = useState(STT_LINES[0]);
  const [stats, setStats] = useState({ rhyme: 72, flow: 85, sps: 64 });

  /* rotate keywords every 5 s */
  const rotateKeywords = useCallback(() => {
    setKeyAnim((prev) => {
      const next = (prev + 1) % KEYWORD_SETS.length;
      setKeywords(KEYWORD_SETS[next]);
      return next;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(rotateKeywords, 5000);
    return () => clearInterval(id);
  }, [rotateKeywords]);

  /* rotate STT text every 3.5 s */
  useEffect(() => {
    let idx = 0;
    const id = setInterval(() => {
      idx = (idx + 1) % STT_LINES.length;
      setSttText(STT_LINES[idx]);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  /* jitter stats */
  useEffect(() => {
    const id = setInterval(() => {
      setStats({
        rhyme: Math.min(100, Math.max(30, 72 + Math.round((Math.random() - 0.5) * 18))),
        flow: Math.min(100, Math.max(40, 85 + Math.round((Math.random() - 0.5) * 14))),
        sps: Math.min(100, Math.max(25, 64 + Math.round((Math.random() - 0.5) * 20))),
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="
        pointer-events-auto
        absolute bottom-6 left-1/2 -translate-x-1/2
        w-[95vw] max-w-3xl
        rounded-2xl
        bg-black/60 backdrop-blur-xl
        neon-border-cyan
        animate-pulse-glow
        scanline-overlay
        overflow-hidden
        select-none
        z-50
      "
    >
      {/* ══ Top edge accent line ══ */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-neon/70 to-transparent" />

      <div className="px-5 py-4 md:px-7 md:py-5 space-y-4">
        {/* ───────── HEADER ───────── */}
        <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* Logo diamond */}
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div className="absolute h-6 w-6 rotate-45 rounded-sm border border-cyan-neon/60 bg-cyan-neon/10" />
              <span className="relative text-[10px] font-bold text-cyan-neon">TS</span>
            </div>
            <h1 className="font-mono text-sm md:text-base font-bold tracking-[0.35em] uppercase text-white animate-glitch-text">
              RAP-COACH <span className="text-cyan-neon">V1</span>
            </h1>
            {/* live dot */}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-neon/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-neon" />
            </span>
          </div>

          <StatusBlinker />
        </header>

        {/* thin separator */}
        <div className="h-[1px] w-full bg-gradient-to-r from-cyan-neon/30 via-purple-neon/20 to-cyan-neon/30" />

        {/* ───────── STT USER INPUT ───────── */}
        <section className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="mb-1 font-mono text-[10px] tracking-[0.25em] uppercase text-purple-neon/70">
            ▸ LIVE STT INPUT
          </p>
          <p className="min-h-[1.5rem] font-mono text-sm text-white/70 italic leading-relaxed">
            {sttText ? (
              <>
                "<span className="text-white/90">{sttText}</span>"
              </>
            ) : (
              <span className="text-white/30 animate-blink">Waiting for vocal input…</span>
            )}
          </p>
        </section>

        {/* ───────── PROMPTER (KEYWORDS) ───────── */}
        <section className="rounded-lg neon-border-purple bg-purple-neon/[0.04] px-4 py-4">
          <p className="mb-3 font-mono text-[10px] tracking-[0.25em] uppercase text-cyan-neon/60">
            ◆ FREESTYLE KEYWORDS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
            {keywords.map((word, i) => (
              <span
                key={`${keyAnim}-${i}`}
                className="animate-word-fade text-lg md:text-2xl font-extrabold tracking-wide text-white drop-shadow-[0_0_10px_#00f0ff66]"
                style={{ animationDelay: `${i * 0.15}s`, animationFillMode: "both" }}
              >
                {word}
                {i < keywords.length - 1 && (
                  <span className="ml-3 md:ml-5 text-cyan-neon/40 font-light">/</span>
                )}
              </span>
            ))}
          </div>
        </section>

        {/* thin separator */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-neon/20 to-transparent" />

        {/* ───────── FLOW-METER (STATS) ───────── */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
          <FlowBar label="Rhyme Density" value={stats.rhyme} variant="cyan" />
          <FlowBar label="Flow Accuracy" value={stats.flow} variant="purple" />
          <FlowBar label="Syllables / sec" value={stats.sps} variant="mixed" />
        </section>
      </div>

      {/* ══ Bottom edge accent line ══ */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-purple-neon/50 to-transparent" />
    </div>
  );
}

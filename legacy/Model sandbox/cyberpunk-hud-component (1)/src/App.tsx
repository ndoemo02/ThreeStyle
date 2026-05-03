import HUD from "./components/HUD";

/* Simulated dark 3D background scene */
function CyberpunkBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#07070e]">
      {/* Radial gradient "city glow" */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_110%,#0d1a3a_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_70%_85%,#1a0030_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_30%_25%_at_25%_90%,#001a2a_0%,transparent_55%)]" />

      {/* Grid floor */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[55vh] opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.25) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          transform: "perspective(400px) rotateX(55deg)",
          transformOrigin: "bottom",
        }}
      />

      {/* Floating particles (decorative dots) */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${20 + Math.random() * 60}%`,
            background: i % 3 === 0 ? "#bf00ff" : "#00f0ff",
            opacity: 0.15 + Math.random() * 0.35,
            animation: `float-up ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 3}s infinite`,
          }}
        />
      ))}

      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.035]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* Top vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
    </div>
  );
}

/* ─── Title overlay (top of screen) ─── */
function TopBar() {
  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 md:px-10 md:py-6">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rotate-45 border border-cyan-neon/50 bg-cyan-neon/20" />
        <span className="font-mono text-[11px] tracking-[0.4em] uppercase text-cyan-neon/60">
          ThreeStyle.ai
        </span>
      </div>
      <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/20">
        E-SPORT FREESTYLE PLATFORM
      </span>
    </div>
  );
}

export function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans text-white antialiased">
      <CyberpunkBackground />
      <TopBar />

      {/* Main viewport (pointer-events-none so clicks pass through to 3D scene) */}
      <div className="pointer-events-none fixed inset-0 z-30">
        <HUD />
      </div>
    </div>
  );
}

import { memo, useEffect, useMemo, useRef, useState } from "react";
import zenLogoSrc from "../../imports/zen-logo.png";

const PANE_HEIGHT = 440;
const SCAN_START_Y = -80;
const SCAN_END_Y = PANE_HEIGHT + 20;
const CHIP_POSITIONS = [56, 152, 248, 344];
const CHIP_REVEAL_AT = [10, 32, 55, 78];

const brandIcon = (slug: string) => `https://cdn.simpleicons.org/${slug}/0a0a0a`;

type Chip = {
  label: string;
  type: string;
  mark: string;
  logo?: string;
  fallbackLogo?: string;
  tone: keyof typeof toneStyle;
  side: "left" | "right";
};

const chipCycles: Chip[][] = [
  [
    { label: "OpenAI", type: "GPT-5.5", mark: "AI", logo: brandIcon("openai"), tone: "zinc", side: "left" },
    { label: "Claude", type: "Opus", mark: "C", logo: brandIcon("anthropic"), tone: "orange", side: "right" },
    { label: "GitHub", type: "Tool", mark: "GH", logo: brandIcon("github"), tone: "slate", side: "left" },
    { label: "Supabase", type: "Data", mark: "SB", logo: brandIcon("supabase"), tone: "emerald", side: "right" },
  ],
  [
    { label: "Gemini", type: "Model", mark: "G", logo: brandIcon("googlegemini"), fallbackLogo: brandIcon("google"), tone: "blue", side: "left" },
    { label: "Resend", type: "SMTP", mark: "RS", logo: brandIcon("resend"), tone: "violet", side: "right" },
    { label: "Telegram", type: "Bot", mark: "TG", logo: brandIcon("telegram"), tone: "cyan", side: "left" },
    { label: "Stripe", type: "Hooks", mark: "ST", logo: brandIcon("stripe"), tone: "purple", side: "right" },
  ],
  [
    { label: "Hermes", type: "Agent", mark: "HX", tone: "fuchsia", side: "left" },
    { label: "Vercel", type: "Deploy", mark: "VC", logo: brandIcon("vercel"), tone: "zinc", side: "right" },
    { label: "NEAR", type: "Proof", mark: "N", logo: brandIcon("near"), tone: "teal", side: "left" },
    { label: "Cipher", type: "Safety", mark: "Σ", tone: "rose", side: "right" },
  ],
];

const toneStyle = {
  cyan: { "--g": "34,211,238", "--ink": "#083344" },
  rose: { "--g": "244,63,94", "--ink": "#4c0519" },
  slate: { "--g": "148,163,184", "--ink": "#020617" },
  emerald: { "--g": "16,185,129", "--ink": "#022c22" },
  blue: { "--g": "59,130,246", "--ink": "#172554" },
  violet: { "--g": "139,92,246", "--ink": "#2e1065" },
  fuchsia: { "--g": "217,70,239", "--ink": "#4a044e" },
  teal: { "--g": "20,184,166", "--ink": "#042f2e" },
  orange: { "--g": "249,115,22", "--ink": "#431407" },
  purple: { "--g": "168,85,247", "--ink": "#3b0764" },
  zinc: { "--g": "113,113,122", "--ink": "#09090b" },
} as const;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function smootherstep(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function getScanY(p: number) {
  return SCAN_START_Y + clamp(p, 0, 1) * (SCAN_END_Y - SCAN_START_Y);
}
function getChipReveal(progress: number, index: number) {
  const p = clamp(progress * 100, 0, 100);
  const start = CHIP_REVEAL_AT[index];
  const fadeIn = smootherstep(start, start + 5, p);
  const clear = 1 - smootherstep(96, 100, p);
  const s = clamp(fadeIn * clear, 0, 1);
  return { strength: s, opacity: s, scale: 0.86 + s * 0.14, blur: (1 - s) * 4, y: (1 - s) * 16 };
}
function getChipPulse(progress: number, index: number) {
  const p = clamp(progress * 100, 0, 100);
  const start = CHIP_REVEAL_AT[index];
  return clamp(smootherstep(start, start + 2, p) * (1 - smootherstep(start + 8, start + 16, p)), 0, 1);
}

// Accepts a ref instead of a value — the internal rAF reads from the ref directly,
// so React.memo can skip all re-renders while the canvas stays perfectly in sync.
const FluidScanField = memo(function FluidScanField({
  progressRef,
}: {
  progressRef: React.MutableRefObject<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return;

    const vs = `attribute vec2 a;varying vec2 v;void main(){v=a*0.5+0.5;gl_Position=vec4(a,0.0,1.0);}`;
    const fs = `
      precision highp float;
      varying vec2 v;
      uniform float t;
      uniform float s;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}
      float fbm(vec2 p){float a=0.5;float r=0.0;for(int i=0;i<5;i++){r+=a*noise(p);p*=2.02;a*=0.5;}return r;}
      void main(){
        vec2 uv=v;
        float y=1.0-uv.y;
        float warp=fbm(vec2(uv.x*3.0+t*0.18,y*2.0-t*0.12))*0.06;
        float yw=y+warp;
        float d=abs(yw-s);
        float core=exp(-d*d*60000.0);
        float bloom=exp(-d*d*1400.0);
        float wide=exp(-d*d*180.0);
        float haze=exp(-d*d*40.0);
        float fall=smoothstep(0.0,0.18,uv.x)*smoothstep(1.0,0.82,uv.x);
        float caustic=fbm(vec2(uv.x*8.0+t*0.6,y*10.0-t*0.5));
        float ribbon=smoothstep(0.55,1.0,sin((uv.x*22.0+caustic*3.0)+t*1.6)*0.5+0.5);
        float chroma=bloom*(0.3+0.5*caustic+0.25*ribbon);
        vec3 cy=vec3(0.18,0.92,1.0);
        vec3 bl=vec3(0.42,0.5,1.0);
        vec3 mg=vec3(1.0,0.32,0.78);
        vec3 wh=vec3(1.0);
        vec3 c=wh*core*2.4;
        c+=mix(cy,bl,uv.x+caustic*0.2)*bloom*1.4;
        c+=mix(mg,cy,sin(uv.x*6.0+t*1.2)*0.5+0.5)*chroma*0.8;
        c+=vec3(0.55,0.78,1.0)*wide*0.22;
        c+=vec3(0.4,0.6,1.0)*haze*0.06;
        float a=fall*clamp(core*1.0+bloom*0.7+wide*0.18+haze*0.04,0.0,0.98);
        gl_FragColor=vec4(c,a);
      }`;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(prog, "a");
    const tLoc = gl.getUniformLocation(prog, "t");
    const sLoc = gl.getUniformLocation(prog, "s");

    let raf = 0;
    const render = (time: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.enableVertexAttribArray(aLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(tLoc, time * 0.001);
      gl.uniform1f(sLoc, clamp(progressRef.current, 0, 1));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      gl.deleteProgram(prog);
      gl.deleteShader(vShader);
      gl.deleteShader(fShader);
      gl.deleteBuffer(buf);
    };
  }, []); // runs once — progress is read from ref inside the render loop

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-30 h-full w-full mix-blend-screen" />;
});

function HoloChip({ chip, top, reveal }: { chip: Chip; top: number; reveal: ReturnType<typeof getChipReveal> }) {
  const [logoIdx, setLogoIdx] = useState(0);
  const sources = [chip.logo, chip.fallbackLogo].filter(Boolean) as string[];
  const src = sources[logoIdx];
  const sideClass = chip.side === "right" ? "right-6" : "left-6";

  return (
    <div
      className={`holo-chip pointer-events-none absolute ${sideClass} z-40 flex items-center gap-3 rounded-2xl px-3.5 py-2.5 backdrop-blur-2xl`}
      style={{
        top,
        opacity: reveal.opacity,
        transform: `translate3d(0, ${reveal.y}px, 0) scale(${reveal.scale})`,
        filter: `blur(${reveal.blur}px) saturate(${1 + reveal.strength * 0.5})`,
        willChange: "opacity, transform, filter",
        ...(toneStyle[chip.tone] as React.CSSProperties),
      }}
    >
      <span className="relative z-10 grid size-8 place-items-center overflow-hidden rounded-xl border border-white/40 bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_0_20px_rgba(var(--g),0.5)]">
        {src ? (
          <img
            src={src}
            alt=""
            className="size-[18px] object-contain"
            onError={() => setLogoIdx((i) => (i + 1 < sources.length ? i + 1 : i))}
          />
        ) : (
          <span className="text-[9px] font-black tracking-tight text-slate-900">{chip.mark}</span>
        )}
      </span>
      <span className="relative z-10 flex flex-col leading-none">
        <span className="whitespace-nowrap text-[11px] font-black tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{chip.label}</span>
        <span className="mt-1.5 inline-flex w-fit items-center rounded-full border border-white/30 bg-white/15 px-2 py-[2px] text-[8px] font-black uppercase tracking-[0.18em] text-white/95">
          {chip.type}
        </span>
      </span>
      <span className="holo-chip-glint" />
    </div>
  );
}

function ScanBurst({ top, strength }: { top: number; strength: number }) {
  if (strength < 0.02) return null;
  return (
    <div
      className="pointer-events-none absolute left-4 right-4 z-20 h-[80px] rounded-[40px]"
      style={{
        top: top - 24,
        opacity: strength,
        transform: `scale(${0.7 + strength * 0.4})`,
        filter: `blur(${20 - strength * 14}px)`,
        willChange: "opacity, transform, filter",
      }}
    >
      <span className="absolute inset-x-8 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-white to-transparent" />
      <span className="absolute inset-x-0 top-1/2 h-20 -translate-y-1/2 rounded-full bg-cyan-300/30 blur-2xl" />
      <span className="absolute inset-x-12 top-1/2 h-12 -translate-y-1/2 rounded-full bg-fuchsia-300/20 blur-xl" />
    </div>
  );
}

// Static — no props that ever change, memo means it renders exactly once.
const OrbitalRings = memo(function OrbitalRings() {
  return (
    <svg className="pointer-events-none absolute left-1/2 top-1/2 z-[5] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 opacity-60" viewBox="0 0 460 460" fill="none">
      <defs>
        <radialGradient id="ring-g" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="rgba(56,189,248,0)" />
          <stop offset="100%" stopColor="rgba(56,189,248,0.4)" />
        </radialGradient>
      </defs>
      <g style={{ transformOrigin: "230px 230px", animation: "orbital-spin 28s linear infinite", willChange: "transform" }}>
        <circle cx="230" cy="230" r="180" stroke="rgba(99,102,241,0.25)" strokeWidth="0.5" strokeDasharray="2 6" />
        <circle cx="230" cy="230" r="180" fill="url(#ring-g)" opacity="0.3" />
      </g>
      <g style={{ transformOrigin: "230px 230px", animation: "orbital-spin-rev 36s linear infinite", willChange: "transform" }}>
        <circle cx="230" cy="230" r="140" stroke="rgba(34,211,238,0.3)" strokeWidth="0.5" strokeDasharray="1 4" />
        <circle cx="50" cy="230" r="2" fill="rgba(255,255,255,0.9)" />
      </g>
      <g style={{ transformOrigin: "230px 230px", animation: "orbital-spin 44s linear infinite", willChange: "transform" }}>
        <circle cx="230" cy="230" r="100" stroke="rgba(217,70,239,0.25)" strokeWidth="0.5" strokeDasharray="3 8" />
        <circle cx="330" cy="230" r="1.5" fill="rgba(255,255,255,0.8)" />
      </g>
    </svg>
  );
});

function useZenLogoPoints(step = 11) {
  const [points, setPoints] = useState<Array<{ x: number; y: number; size: number; phase: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = zenLogoSrc;
    img.onload = () => {
      if (cancelled) return;
      const w = img.width;
      const h = img.height;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        return;
      }
      const pts: Array<{ x: number; y: number; size: number; phase: number }> = [];
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) {
            const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            const r = noise - Math.floor(noise);
            pts.push({
              x: x / w,
              y: y / h,
              size: 1.1 + r * 1.6,
              phase: r * Math.PI * 2,
            });
          }
        }
      }
      setPoints(pts);
    };
    return () => {
      cancelled = true;
    };
  }, [step]);
  return points;
}

// memo — only re-renders when theme changes, not on every animation frame.
const ZenParticleLogo = memo(function ZenParticleLogo({ theme }: { theme: "dark" | "light" }) {
  const points = useZenLogoPoints(11);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const render = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      // Use Math.floor to avoid repeated resize due to fractional pixel mismatch
      const cw = Math.floor(w * dpr);
      const ch = Math.floor(h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const time = t * 0.001;
      const pts = pointsRef.current;
      const dark = themeRef.current === "dark";

      // Set shadow properties once per frame instead of per-particle
      if (dark) {
        ctx.shadowColor = "rgba(99,102,241,0.85)";
        ctx.shadowBlur = 5;
      } else {
        ctx.shadowColor = "rgba(99,102,241,0.6)";
        ctx.shadowBlur = 4;
      }

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const tw = 0.55 + 0.45 * (Math.sin(time * 1.4 + p.phase) * 0.5 + 0.5);
        const px = p.x * w;
        const py = p.y * h + Math.sin(time * 0.8 + p.phase) * 0.6;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        if (dark) {
          ctx.fillStyle = `rgba(220,235,255,${0.55 * tw + 0.25})`;
        } else {
          ctx.fillStyle = `rgba(30,41,80,${0.55 * tw + 0.3})`;
        }
        ctx.fill();
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-[4] -translate-x-1/2 -translate-y-1/2">
      <div className="relative size-[360px]" style={{ animation: "zen-bg-breathe 7s ease-in-out infinite" }}>
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      </div>
    </div>
  );
});

// Refined glyph set — delicate mathematical / code symbols only, no heavy glyphs
const DRIP_GLYPHS = ["✦", "✧", "◇", "△", "○", "◯", "✺", "✶", "⟁", "⟐", "⟡", "∴", "∵", "≋", "≈", "⌬", "Ω", "Ψ", "Φ", "λ", "δ", "Σ", "η", "α", "β", "γ", "ε", "π", "τ", "0", "1", "/", "<", ">", "·", "•", "$", "∞", "∂", "∇", "⊕"];

// Reads scan position from a ref (setInterval-based) so it doesn't re-render on every animation frame.
// DOM is capped at 20 active drops to prevent layout thrash during long sessions.
function LaserDrip({ scanYRef, paneHeight }: { scanYRef: React.MutableRefObject<number>; paneHeight: number }) {
  type Drop = { id: number; x: number; startY: number; glyph: string; hue: number; size: number; duration: number; delay: number; born: number; driftX: number; opacity: number; };
  const [drops, setDrops] = useState<Drop[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const MAX_DROPS = 36;

    const spawn = () => {
      const beamY = scanYRef.current + 68;
      if (beamY < 0 || beamY > paneHeight - 4) return;

      const now = performance.now();
      const batch = 3 + Math.floor(Math.random() * 3);
      const next: Drop[] = [];
      for (let i = 0; i < batch; i++) {
        next.push({
          id: idRef.current++,
          x: 5 + Math.random() * 90,
          startY: beamY,
          glyph: DRIP_GLYPHS[Math.floor(Math.random() * DRIP_GLYPHS.length)],
          hue: Math.random() < 0.55 ? 188 + Math.random() * 28 : 265 + Math.random() * 45,
          size: 3 + Math.random() * 3.5,
          duration: 3800 + Math.random() * 3000,
          delay: Math.random() * 80,
          born: now,
          driftX: (Math.random() - 0.5) * 22,
          opacity: 0.5 + Math.random() * 0.4,
        });
      }
      setDrops((prev) => {
        const alive = prev.filter((d) => now - d.born < d.duration + 600);
        return [...alive, ...next].slice(-MAX_DROPS);
      });
    };

    const id = setInterval(spawn, 45);
    return () => clearInterval(id);
  }, [scanYRef, paneHeight]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[33] overflow-hidden">
      {drops.map((d) => (
        <span
          key={d.id}
          className="laser-drip absolute"
          style={{
            left: `${d.x}%`,
            top: d.startY,
            fontSize: `${d.size}px`,
            fontWeight: 100,
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: "0.02em",
            color: `hsl(${d.hue} 80% 78% / ${d.opacity})`,
            textShadow: `0 0 2px hsl(${d.hue} 100% 85% / 0.6), 0 0 6px hsl(${d.hue} 100% 70% / 0.35), 0 0 14px hsl(${d.hue} 100% 62% / 0.15)`,
            ["--drip-distance" as string]: `${paneHeight - d.startY + 28}px`,
            ["--drift-x" as string]: `${d.driftX}px`,
            animation: `drip-fall ${d.duration}ms ${d.delay}ms cubic-bezier(.22,.61,.36,1) forwards`,
          }}
        >
          {d.glyph}
        </span>
      ))}
    </div>
  );
}

// memo — particles are stable (useMemo inside), no props, renders once.
const ParticleDrift = memo(function ParticleDrift() {
  const particles = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        x: Math.random() * 100,
        delay: Math.random() * 6,
        duration: 6 + Math.random() * 6,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.5,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-full bg-cyan-200"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 4}px rgba(165,243,252,0.8)`,
            animation: `drift ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
});

export function OrbitalScanner({ scanDurationMs = 11000, theme = "dark" }: { scanDurationMs?: number; theme?: "dark" | "light" }) {
  // Single state object — one setState call = one re-render per frame instead of two.
  const [scan, setScan] = useState({ progress: 0.1, cycle: 0 });

  // Stable refs updated imperatively alongside state.
  // FluidScanField and LaserDrip read from these refs, bypassing React's render cycle.
  const scanProgressRef = useRef(0.1);
  const scanYRef = useRef(getScanY(0.1));

  useEffect(() => {
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts - 1000;
      const elapsed = ts - start;
      const loop = scanDurationMs + 1600;
      const lp = elapsed % loop;
      const progress = clamp(lp / scanDurationMs, 0, 1);
      const cycle = Math.floor(elapsed / loop) % chipCycles.length;

      // Update refs first (synchronous, no re-render)
      scanProgressRef.current = progress;
      scanYRef.current = getScanY(progress);

      // Single batched state update drives the React UI
      setScan({ progress, cycle });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scanDurationMs]);

  const { progress, cycle } = scan;
  const chips = chipCycles[cycle];
  const scanY = getScanY(progress);
  const reveals = useMemo(() => CHIP_POSITIONS.map((_, i) => getChipReveal(progress, i)), [progress]);
  const pulses = useMemo(() => CHIP_POSITIONS.map((_, i) => getChipPulse(progress, i)), [progress]);

  return (
    <div className="relative isolate w-full max-w-[680px]" style={{ contain: "layout style" }}>
      <style>{`
        @keyframes float-panel { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes orbital-spin { to { transform: rotate(360deg) } }
        @keyframes orbital-spin-rev { to { transform: rotate(-360deg) } }
        @keyframes core-spin { to { transform: rotate(360deg) } }
        @keyframes core-pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
        @keyframes sigil-breathe { 0%,100%{transform:scale(1);filter:brightness(1)} 50%{transform:scale(1.04);filter:brightness(1.15)} }
        @keyframes zen-bg-breathe { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.025);opacity:1} }
        @keyframes zen-bg-twinkle { 0%,100%{opacity:0.45;transform:translate3d(0,0,0)} 50%{opacity:1;transform:translate3d(0,-1px,0)} }
        .zen-bg-particle { animation: zen-bg-twinkle 4.5s ease-in-out infinite; will-change: opacity, transform; }
        @keyframes drip-fall {
          0%   { transform: translate3d(0, 0, 0) scale(0.3); opacity: 0; filter: blur(1px); }
          4%   { transform: translate3d(calc(var(--drift-x) * 0.05), 4px, 0) scale(0.9); opacity: 0.85; filter: blur(0); }
          15%  { transform: translate3d(calc(var(--drift-x) * 0.15), calc(var(--drip-distance) * 0.08), 0) scale(1.0); opacity: 0.8; }
          40%  { opacity: 0.7; filter: blur(0); }
          70%  { opacity: 0.45; }
          90%  { opacity: 0.2; filter: blur(0.3px); }
          100% { transform: translate3d(var(--drift-x), var(--drip-distance), 0) scale(0.35); opacity: 0; filter: blur(0.8px); }
        }
        .laser-drip { will-change: transform, opacity; line-height: 1; }
        @keyframes drift { 0%{transform:translateY(-20px);opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{transform:translateY(460px);opacity:0} }
        @keyframes shimmer { 0%{transform:translateX(-130%)} 100%{transform:translateX(130%)} }
        @keyframes holo-flow { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes holo-glint { 0%{transform:translateX(-150%) skewX(-20deg);opacity:0} 30%{opacity:0.7} 100%{transform:translateX(160%) skewX(-20deg);opacity:0} }
        @keyframes ambient-shift { 0%,100%{opacity:0.5;transform:translateX(-4%)} 50%{opacity:0.85;transform:translateX(4%)} }
        @keyframes status-flicker { 0%,100%{opacity:0.7} 50%{opacity:1} }
        .holo-chip {
          isolation: isolate;
          min-width: 200px;
          background: linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.7) 50%, rgba(15,23,42,0.85));
          border: 1px solid rgba(var(--g),0.6);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.15),
            inset 0 0 30px rgba(var(--g),0.18),
            0 0 0 1px rgba(0,0,0,0.4),
            0 12px 40px rgba(0,0,0,0.5),
            0 0 30px rgba(var(--g),0.45);
          background-size: 200% 200%;
          animation: holo-flow 6s ease-in-out infinite;
          transition: opacity 100ms linear, transform 100ms linear, filter 100ms linear;
        }
        .holo-chip::before {
          content: ""; position: absolute; inset: -1px; border-radius: inherit; padding: 1px;
          background: linear-gradient(135deg, rgba(var(--g),0.9), rgba(255,255,255,0.4) 50%, rgba(var(--g),0.6));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          pointer-events: none;
        }
        .holo-chip-glint {
          position: absolute; inset: 0; border-radius: inherit; overflow: hidden;
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%);
          mix-blend-mode: screen;
          animation: holo-glint 3.5s cubic-bezier(.16,.84,.22,1) infinite;
        }
      `}</style>

      <div
        className={`relative h-[640px] w-full overflow-hidden rounded-[40px] border p-1 ${
          theme === "dark"
            ? "border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98)_50%,rgba(15,23,42,0.95))]"
            : "border-slate-300/70 bg-[linear-gradient(145deg,rgba(248,250,252,0.98),rgba(226,232,240,0.95)_50%,rgba(241,245,249,0.98))]"
        }`}
        style={{ animation: "float-panel 8s ease-in-out infinite" }}
      >

        <div className={`relative h-full overflow-hidden rounded-[36px] border ${
          theme === "dark"
            ? "border-white/5 bg-[linear-gradient(180deg,rgba(8,12,24,0.98),rgba(2,6,23,0.99))]"
            : "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.98))]"
        }`}>
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />

          <div className={`relative z-10 flex h-12 items-center gap-3 border-b px-5 backdrop-blur-xl ${theme === "dark" ? "border-white/10" : "border-slate-200/80"}`}>
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-400/90 shadow-[0_0_10px_rgba(251,113,133,0.6)]" />
              <span className="size-2.5 rounded-full bg-amber-300/90 shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
              <span className="size-2.5 rounded-full bg-emerald-300/90 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
            </div>
            <div className={`ml-2 flex h-7 flex-1 items-center justify-center gap-2 rounded-lg border text-[10px] font-bold tracking-wider ${
              theme === "dark"
                ? "border-white/10 bg-white/5 text-white/70"
                : "border-slate-200/80 bg-slate-100/70 text-slate-600"
            }`}>
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              app.zenai.co / orbital-agent
            </div>
            <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] ${theme === "dark" ? "text-white/50" : "text-slate-500"}`}>
              <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" style={{ animation: "status-flicker 2s ease-in-out infinite" }} />
              live
            </div>
          </div>

          <div className="relative" style={{ height: PANE_HEIGHT + 100 }}>
            <div
              className={`relative mx-6 mt-6 overflow-hidden rounded-[28px] border ${
                theme === "dark"
                  ? "border-white/10 bg-[linear-gradient(180deg,rgba(8,15,30,0.95),rgba(2,6,18,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_0_60px_rgba(99,102,241,0.08)]"
                  : "border-slate-200/90 bg-[linear-gradient(180deg,rgba(241,245,255,0.95),rgba(226,232,240,0.85))] shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_0_60px_rgba(99,102,241,0.08)]"
              }`}
              style={{ height: PANE_HEIGHT, contain: "layout style" }}
            >
              <FluidScanField progressRef={scanProgressRef} />
              <ParticleDrift />
              <OrbitalRings />
              <ZenParticleLogo theme={theme} />
              <LaserDrip scanYRef={scanYRef} paneHeight={PANE_HEIGHT} />

              <div className={`pointer-events-none absolute inset-0 z-[7] ${
                theme === "dark"
                  ? "bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(2,6,23,0.6)_90%)]"
                  : "bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(226,232,240,0.55)_92%)]"
              }`} />

              {chips.map((chip, i) => (
                <HoloChip key={`${cycle}-${chip.label}`} chip={chip} top={CHIP_POSITIONS[i]} reveal={reveals[i]} />
              ))}

              {CHIP_POSITIONS.map((top, i) => (
                <ScanBurst key={i} top={top} strength={pulses[i]} />
              ))}

              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-[35] h-[140px] will-change-transform"
                style={{ transform: `translate3d(0, ${scanY}px, 0)` }}
              >
                {/* Wide atmospheric diffusion above and below the beam */}
                <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(180deg,transparent,rgba(34,211,238,0.07)_28%,rgba(255,255,255,0.22)_50%,rgba(217,70,239,0.07)_72%,transparent)]" />
                {/* Outer soft halo */}
                <div className="absolute inset-x-4 top-[42px] h-[52px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.12),rgba(34,211,238,0.06)_55%,transparent_80%)] blur-[6px]" />
                {/* Core beam line with chromatic glow */}
                <div className="absolute inset-x-2 top-[68px] h-[2px] rounded-full bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.95)_16%,rgba(180,230,255,1)_38%,rgba(255,255,255,1)_50%,rgba(210,190,255,1)_62%,rgba(217,70,239,0.9)_84%,transparent)] shadow-[0_0_12px_rgba(255,255,255,1),0_0_32px_rgba(34,211,238,0.9),0_0_64px_rgba(99,102,241,0.75),0_0_110px_rgba(217,70,239,0.45)]" />
                {/* Hairline highlight just above core */}
                <div className="absolute inset-x-12 top-[67px] h-px rounded-full bg-gradient-to-r from-transparent via-white/95 to-transparent" />
                {/* Inner bloom */}
                <div className="absolute inset-x-16 top-[66px] h-[6px] rounded-full bg-white/65 blur-[3px]" />
                {/* Scan body ellipse */}
                <div className="absolute inset-x-8 top-[10px] h-[120px] rounded-[100%] border border-cyan-300/18 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.14),rgba(99,102,241,0.05)_52%,transparent_72%)]" />
              </div>
            </div>

            <div className={`relative mx-6 mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl ${
              theme === "dark" ? "border-white/10 bg-white/5" : "border-slate-200/80 bg-white/70"
            }`}>
              <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${theme === "dark" ? "text-cyan-300" : "text-indigo-600"}`}>
                <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" />
                orbital scan
              </span>
              <div className={`relative h-[3px] flex-1 overflow-hidden rounded-full ${theme === "dark" ? "bg-white/10" : "bg-slate-200"}`}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400 shadow-[0_0_14px_rgba(255,255,255,0.6)]"
                  style={{ width: `${Math.round(progress * 100)}%`, transition: "width 80ms linear" }}
                />
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animation: "shimmer 2.4s ease-in-out infinite" }} />
              </div>
              <span className={`font-mono text-[10px] font-black tabular-nums ${theme === "dark" ? "text-white/80" : "text-slate-700"}`}>
                {String(Math.round(progress * 100)).padStart(2, "0")} / 100
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

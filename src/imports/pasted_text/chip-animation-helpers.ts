import React, { useEffect, useMemo, useRef, useState } from "react";

const PANE_HEIGHT = 392;
const SCANNER_HEIGHT = 118;
const SCAN_START_Y = -54;
const SCAN_END_Y = PANE_HEIGHT - 34;
const CHIP_HEIGHT = 34;
const CHIP_POSITIONS = [54, 142, 230, 318];
const CHIP_REVEAL_AT = [9, 31, 54, 77];

const brandIcon = (slug, color = "111827") => `https://cdn.simpleicons.org/${slug}/${color}`;

const chipCycles = [
  [
    { label: "OpenAI", type: "GPT-5.5", mark: "AI", logo: brandIcon("openai"), tone: "zinc", side: "left" },
    { label: "Claude", type: "Opus", mark: "C", logo: brandIcon("claude"), fallbackLogo: brandIcon("anthropic"), tone: "orange", side: "right" },
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
    { label: "NEAR", type: "Proof", mark: "N", logo: brandIcon("near"), fallbackLogo: brandIcon("nearprotocol"), tone: "teal", side: "left" },
    { label: "PII Shield", type: "Safety", mark: "Σ", tone: "orange", side: "right" },
  ],
  [
    { label: "Arsenal", type: "Core", mark: "A", tone: "blue", side: "left" },
    { label: "Memory", type: "Vector", mark: "M", tone: "cyan", side: "right" },
    { label: "Arena", type: "Bench", mark: "AR", tone: "pink", side: "left" },
    { label: "Codex", type: "Patch", mark: "</>", logo: brandIcon("openai"), tone: "zinc", side: "right" },
  ],
];

const toneStyle = {
  cyan: { color: "#164e63", borderColor: "rgba(34,211,238,.86)", "--toneGlow": "rgba(34,211,238,.42)", "--toneCore": "rgba(238,253,255,.82)", "--toneInk": "#083344" },
  rose: { color: "#9f1239", borderColor: "rgba(251,113,133,.86)", "--toneGlow": "rgba(244,63,94,.36)", "--toneCore": "rgba(255,245,246,.82)", "--toneInk": "#4c0519" },
  slate: { color: "#0f172a", borderColor: "rgba(203,213,225,.88)", "--toneGlow": "rgba(148,163,184,.34)", "--toneCore": "rgba(250,252,255,.86)", "--toneInk": "#020617" },
  emerald: { color: "#064e3b", borderColor: "rgba(52,211,153,.86)", "--toneGlow": "rgba(16,185,129,.38)", "--toneCore": "rgba(239,253,246,.84)", "--toneInk": "#022c22" },
  blue: { color: "#1e3a8a", borderColor: "rgba(96,165,250,.86)", "--toneGlow": "rgba(59,130,246,.4)", "--toneCore": "rgba(240,247,255,.84)", "--toneInk": "#172554" },
  violet: { color: "#4c1d95", borderColor: "rgba(167,139,250,.86)", "--toneGlow": "rgba(139,92,246,.4)", "--toneCore": "rgba(247,244,255,.84)", "--toneInk": "#2e1065" },
  lime: { color: "#365314", borderColor: "rgba(163,230,53,.86)", "--toneGlow": "rgba(132,204,22,.34)", "--toneCore": "rgba(249,255,236,.84)", "--toneInk": "#1a2e05" },
  fuchsia: { color: "#86198f", borderColor: "rgba(232,121,249,.86)", "--toneGlow": "rgba(217,70,239,.38)", "--toneCore": "rgba(254,244,255,.84)", "--toneInk": "#4a044e" },
  indigo: { color: "#312e81", borderColor: "rgba(129,140,248,.86)", "--toneGlow": "rgba(99,102,241,.42)", "--toneCore": "rgba(243,245,255,.84)", "--toneInk": "#1e1b4b" },
  teal: { color: "#115e59", borderColor: "rgba(45,212,191,.86)", "--toneGlow": "rgba(20,184,166,.38)", "--toneCore": "rgba(239,254,252,.84)", "--toneInk": "#042f2e" },
  orange: { color: "#9a3412", borderColor: "rgba(251,146,60,.86)", "--toneGlow": "rgba(249,115,22,.36)", "--toneCore": "rgba(255,247,237,.84)", "--toneInk": "#431407" },
  purple: { color: "#581c87", borderColor: "rgba(192,132,252,.86)", "--toneGlow": "rgba(168,85,247,.4)", "--toneCore": "rgba(250,245,255,.84)", "--toneInk": "#3b0764" },
  pink: { color: "#9d174d", borderColor: "rgba(244,114,182,.86)", "--toneGlow": "rgba(236,72,153,.36)", "--toneCore": "rgba(255,245,250,.84)", "--toneInk": "#500724" },
  zinc: { color: "#18181b", borderColor: "rgba(212,212,216,.88)", "--toneGlow": "rgba(113,113,122,.3)", "--toneCore": "rgba(252,252,253,.86)", "--toneInk": "#09090b" },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smootherstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function getScanY(progress) {
  return SCAN_START_Y + clamp(progress, 0, 1) * (SCAN_END_Y - SCAN_START_Y);
}

function getChipReveal(progress, index) {
  const p = clamp(progress * 100, 0, 100);
  const revealStart = CHIP_REVEAL_AT[index];
  const fadeIn = smootherstep(revealStart, revealStart + 4, p);
  const clearAtBottom = 1 - smootherstep(96, 100, p);
  const strength = clamp(fadeIn * clearAtBottom, 0, 1);

  return {
    strength,
    opacity: strength,
    scale: 0.88 + strength * 0.12,
    blur: (1 - strength) * 3.2,
    y: (1 - strength) * 10,
  };
}

function getChipPulse(progress, index) {
  const p = clamp(progress * 100, 0, 100);
  const revealStart = CHIP_REVEAL_AT[index];
  const fadeIn = smootherstep(revealStart, revealStart + 2, p);
  const fadeOut = 1 - smootherstep(revealStart + 7, revealStart + 14, p);
  return clamp(fadeIn * fadeOut, 0, 1);
}

function runSelfTests() {
  const flat = chipCycles.flat();
  console.assert(chipCycles.length === 4, "There should be 4 rotating chip cycles.");
  console.assert(chipCycles.every((sequence) => sequence.length === 4), "Every cycle should contain exactly 4 chips.");
  console.assert(CHIP_POSITIONS.length === 4, "There should be 4 vertical chip positions.");
  console.assert(CHIP_REVEAL_AT.length === 4, "There should be 4 chip reveal thresholds.");
  console.assert(CHIP_POSITIONS.every((position, index, list) => index === 0 || position > list[index - 1]), "Chip positions must be top-to-bottom.");
  console.assert(CHIP_POSITIONS.every((position) => position >= 0 && position + CHIP_HEIGHT <= PANE_HEIGHT), "Chips must fit inside the scanner pane.");
  console.assert(getScanY(0) === SCAN_START_Y, "Scanner should start above the pane.");
  console.assert(getScanY(1) === SCAN_END_Y, "Scanner should end near the pane bottom.");
  console.assert(getChipReveal(0.15, 0).strength > 0.9, "First chip should be revealed near the top.");
  console.assert(getChipReveal(0.38, 1).strength > 0.9, "Second chip should be revealed in the upper-middle lane.");
  console.assert(getChipReveal(0.62, 2).strength > 0.9, "Third chip should be revealed in the lower-middle lane.");
  console.assert(getChipReveal(0.84, 3).strength > 0.9, "Fourth chip should be revealed near the bottom.");
  console.assert(getChipReveal(0.9, 0).strength > 0.9, "Earlier chips should stay visible after reveal.");
  console.assert(getChipReveal(1, 0).strength === 0, "All chips should clear when the scan resets.");
  console.assert(getChipPulse(0.15, 0) > 0, "First chip should have a reveal pulse.");
  console.assert(getChipPulse(0.9, 0) === 0, "Reveal pulse should fade after latch.");
  console.assert(flat.every((chip) => chip.label && chip.type && chip.mark && toneStyle[chip.tone]), "Every chip needs valid metadata and tone.");
  console.assert(flat.filter((chip) => chip.logo).length >= 9, "Most external company chips should include real logo sources.");
  console.assert(ZEN_LOGO_POLYGONS.length === 1, "Particle ZEN logo should use the full positive black body of the uploaded mark.");
  const zenParticleCount = buildZenParticlePoints().length;
  console.assert(zenParticleCount >= 1800, "Particle ZEN logo should densely fill the actual black logo body with fine particles.");
  console.assert(insideZenLogoShape(30, 30) === true, "Particle mask should include the top-left black body of the mark.");
  console.assert(insideZenLogoShape(150, 120) === true, "Particle mask should include the central black diagonal body of the mark.");
  console.assert(insideZenLogoShape(220, 110) === false, "Particle mask should exclude the white interior cutout spaces.");
}

function WebGLLaserField({ progress }) {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const rafRef = useRef(null);
  const programRef = useRef(null);
  const uniformRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true });
    if (!gl) return undefined;

    const vertexSource = `
      attribute vec2 a_position;
      varying vec2 v_uv;
      void main() {
        v_uv = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fragmentSource = `
      precision highp float;
      varying vec2 v_uv;
      uniform float u_time;
      uniform float u_scan;
      uniform vec2 u_resolution;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        vec2 uv = v_uv;
        float y = 1.0 - uv.y;
        float scan = u_scan;
        float distanceToLine = abs(y - scan);
        float core = exp(-distanceToLine * distanceToLine * 42000.0);
        float bloom = exp(-distanceToLine * distanceToLine * 980.0);
        float haze = exp(-distanceToLine * distanceToLine * 90.0);
        float horizontalFalloff = smoothstep(0.0, 0.22, uv.x) * smoothstep(1.0, 0.78, uv.x);
        float wave = sin((uv.x * 34.0) + u_time * 4.2) * 0.5 + 0.5;
        float caustic = noise(vec2(uv.x * 14.0 + u_time * 0.85, y * 18.0 - u_time * 0.7));
        float rib = smoothstep(0.72, 1.0, sin((uv.x + caustic * 0.04) * 52.0 + u_time * 2.8) * 0.5 + 0.5);
        float chroma = bloom * (0.22 + 0.45 * caustic + 0.2 * rib);
        vec3 cyan = vec3(0.08, 0.86, 1.0);
        vec3 blue = vec3(0.34, 0.42, 1.0);
        vec3 white = vec3(1.0);
        vec3 redEdge = vec3(1.0, 0.18, 0.55);
        vec3 color = white * core * 1.9;
        color += mix(cyan, blue, uv.x) * bloom * 1.15;
        color += mix(redEdge, cyan, wave) * chroma * 0.62;
        color += vec3(0.6, 0.8, 1.0) * haze * 0.1;
        float alpha = horizontalFalloff * clamp(core * 1.0 + bloom * 0.58 + haze * 0.08, 0.0, 0.96);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return undefined;

    const program = gl.createProgram();
    if (!program) return undefined;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const scanLocation = gl.getUniformLocation(program, "u_scan");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

    glRef.current = gl;
    programRef.current = program;
    uniformRef.current = { timeLocation, scanLocation, resolutionLocation, positionLocation };

    const render = (time) => {
      const width = Math.floor(canvas.clientWidth * window.devicePixelRatio);
      const height = Math.floor(canvas.clientHeight * window.devicePixelRatio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.enableVertexAttribArray(positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(timeLocation, time * 0.001);
      gl.uniform1f(scanLocation, clamp(progress, 0, 1));
      gl.uniform2f(resolutionLocation, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = window.requestAnimationFrame(render);
    };

    rafRef.current = window.requestAnimationFrame(render);

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(buffer);
    };
  }, [progress]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-40 h-full w-full mix-blend-screen" />;
}

function BrandLogo({ chip }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const sources = [chip.logo, chip.fallbackLogo].filter(Boolean);
  const src = sources[srcIndex];

  return (
    <span className="brand-logo relative z-10 grid size-[28px] place-items-center overflow-hidden rounded-[11px] border border-black/70 bg-[linear-gradient(145deg,rgba(255,255,255,.98),rgba(226,232,240,.84))] text-[8px] font-black tracking-[-0.04em] text-[var(--toneInk)] shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-3px_8px_rgba(15,23,42,.16),0_0_18px_var(--toneGlow)]">
      {src ? (
        <img
          src={src}
          alt={`${chip.label} logo`}
          className="relative z-10 size-[17px] object-contain opacity-[.94]"
          loading="lazy"
          onError={() => setSrcIndex((current) => (current + 1 < sources.length ? current + 1 : current))}
        />
      ) : (
        <span className="relative z-10">{chip.mark}</span>
      )}
      {src && <span className="sr-only">{chip.mark}</span>}
    </span>
  );
}

function HologramChip({ chip, top, reveal }) {
  const sideClass = chip.side === "right" ? "right-[34px]" : "left-[34px]";

  return (
    <div
      className={`holo-chip pointer-events-none absolute ${sideClass} z-30 flex items-center gap-2.5 rounded-[18px] border px-3 py-2 text-[10px] font-black backdrop-blur-xl`}
      style={{
        top,
        opacity: reveal.opacity,
        transform: `translate3d(0, ${reveal.y}px, 0) scale(${reveal.scale})`,
        filter: `blur(${reveal.blur}px) saturate(${1 + reveal.strength * 0.65})`,
        ...toneStyle[chip.tone],
      }}
    >
      <BrandLogo chip={chip} />
      <span className="relative z-10 flex flex-col leading-none">
        <span className="whitespace-nowrap text-[10.5px] tracking-[-0.02em] text-[var(--toneInk)] drop-shadow-[0_1px_0_rgba(255,255,255,.9)]">{chip.label}</span>
        <span className="mt-1 w-fit rounded-full border border-black/50 bg-white/68 px-1.5 py-[2px] text-[7px] font-black uppercase tracking-[0.14em] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,.9)]">{chip.type}</span>
      </span>
    </div>
  );
}

function ScanBurst({ top, strength }) {
  return (
    <div
      className="pointer-events-none absolute left-5 right-5 z-20 h-[74px] rounded-[30px]"
      style={{
        top: top - 21,
        opacity: strength,
        transform: `scaleX(${0.7 + strength * 0.35}) scaleY(${0.7 + strength * 0.32})`,
        filter: `blur(${18 - strength * 12}px)`,
      }}
    >
      <span className="absolute left-6 top-1/2 h-[2px] w-[88%] -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_28px_rgba(255,255,255,1),0_0_76px_rgba(34,211,238,.62)]" />
      <span className="absolute left-0 top-1/2 h-16 w-40 -translate-y-1/2 rounded-full bg-cyan-200/24 blur-2xl" />
      <span className="absolute right-0 top-1/2 h-16 w-44 -translate-y-1/2 rounded-full bg-indigo-300/22 blur-2xl" />
    </div>
  );
}

const ZEN_LOGO_POLYGONS = [
  // Full positive black body of the uploaded ZEN logo — not the white gaps, not only the edge.
  // This contour was traced from the actual logo silhouette so particles fill the exact black mark.
  [
    [24.0, 0.3],
    [24.0, 85.0],
    [56.1, 85.0],
    [81.4, 59.6],
    [48.2, 58.8],
    [48.2, 28.9],
    [139.4, 29.1],
    [24.0, 145.7],
    [24.0, 199.3],
    [47.4, 175.9],
    [47.9, 161.2],
    [179.7, 28.9],
    [221.3, 29.7],
    [0.0, 252.5],
    [273.6, 252.7],
    [273.3, 168.8],
    [242.3, 168.8],
    [214.8, 195.5],
    [248.3, 196.9],
    [248.3, 226.3],
    [156.8, 225.8],
    [273.6, 108.4],
    [273.9, 54.5],
    [249.1, 78.7],
    [248.3, 95.9],
    [118.7, 226.0],
    [76.5, 226.0],
    [299.7, 0.5],
  ],
];

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00001) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function insideZenLogoShape(x, y) {
  return ZEN_LOGO_POLYGONS.some((polygon) => pointInPolygon(x, y, polygon));
}

function buildZenParticlePoints() {
  const points = [];
  const sourceWidth = 300;
  const sourceHeight = 253;
  const renderWidth = 454;
  const renderHeight = 383;
  const scaleX = renderWidth / sourceWidth;
  const scaleY = renderHeight / sourceHeight;

  // Fine-grain fill across the terminal while preserving the actual black positive ZEN mark.
  // We sample the uploaded-logo silhouette and scale it up to dominate the scanner terminal.
  for (let y = 0; y <= sourceHeight; y += 2.65) {
    for (let x = 0; x <= sourceWidth; x += 2.65) {
      const seed = Math.sin((x + 17.13) * 12.9898 + (y + 31.91) * 78.233) * 43758.5453;
      const noise = seed - Math.floor(seed);
      const jitterX = (noise - 0.5) * 1.55;
      const jitterY = (Math.sin(seed * 1.7) - 0.5) * 1.55;
      const px = x + jitterX;
      const py = y + jitterY;

      if (!insideZenLogoShape(px, py)) continue;

      const centerX = sourceWidth / 2;
      const centerY = sourceHeight / 2;
      const angleFromCenter = Math.atan2(py - centerY, px - centerX);
      const randomAngle = noise * Math.PI * 2;
      const angle = angleFromCenter * 0.68 + randomAngle * 0.32;
      const distance = 72 + noise * 160;

      points.push({
        x: px * scaleX,
        y: py * scaleY,
        size: 0.72 + noise * 1.16,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        delay: noise * 46,
        opacity: 0.64 + noise * 0.28,
      });
    }
  }

  return points;
}

function ParticleZenLogo() {
  const [isDispersed, setIsDispersed] = useState(false);
  const particles = useMemo(() => buildZenParticlePoints(), []);

  return (
    <div
      className="particle-logo-zone absolute inset-[6px] z-[12] cursor-crosshair rounded-[28px]"
      onMouseEnter={() => setIsDispersed(true)}
      onMouseLeave={() => setIsDispersed(false)}
      aria-label="Interactive ZEN particle logo"
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,.2),transparent_62%)]" />
      <svg className="pointer-events-none absolute left-1/2 top-1/2 h-[383px] w-[454px] -translate-x-1/2 -translate-y-1/2 opacity-[.1]" viewBox="0 0 300 253" fill="none" aria-hidden="true">
        <defs>
          <filter id="zenGhostBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        {ZEN_LOGO_POLYGONS.map((polygon, index) => (
          <polygon key={`zen-ghost-${index}`} points={polygon.map((point) => point.join(",")).join(" ")} fill="rgba(2,6,23,.38)" stroke="rgba(2,6,23,.18)" strokeWidth="1" filter="url(#zenGhostBlur)" />
        ))}
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[383px] w-[454px] -translate-x-1/2 -translate-y-1/2">
        {particles.map((particle, index) => (
          <span
            key={`zen-particle-${index}`}
            className="zen-particle absolute rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              "--dx": `${particle.dx}px`,
              "--dy": `${particle.dy}px`,
              "--delay": `${particle.delay}ms`,
              transform: isDispersed
                ? `translate3d(${particle.dx}px, ${particle.dy}px, 0) scale(${0.72 + (particle.opacity - 0.55) * 0.9})`
                : "translate3d(0, 0, 0) scale(1)",
            }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[383px] w-[454px] -translate-x-1/2 -translate-y-1/2 rounded-[36px] opacity-35 mix-blend-multiply [background:linear-gradient(115deg,transparent_0%,rgba(2,6,23,.14)_45%,transparent_58%)]" />
    </div>
  );
}

export default function ZenAgentScannerWidget({ className = "", scanDurationMs = 10800 }) {
  const [cycle, setCycle] = useState(0);
  const [progress, setProgress] = useState(0.12);

  useEffect(() => {
    runSelfTests();
  }, []);

  useEffect(() => {
    let frameId;
    let startTime;

    const tick = (timestamp) => {
      if (!startTime) startTime = timestamp - 1200;
      const elapsed = timestamp - startTime;
      const loopDuration = scanDurationMs + 1450;
      const loopElapsed = elapsed % loopDuration;
      const activeProgress = clamp(loopElapsed / scanDurationMs, 0, 1);
      const nextCycle = Math.floor(elapsed / loopDuration) % chipCycles.length;

      setProgress(activeProgress);
      setCycle(nextCycle);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [scanDurationMs]);

  const chips = chipCycles[cycle];
  const scanY = getScanY(progress);
  const reveals = useMemo(() => CHIP_POSITIONS.map((_, index) => getChipReveal(progress, index)), [progress]);
  const pulses = useMemo(() => CHIP_POSITIONS.map((_, index) => getChipPulse(progress, index)), [progress]);
  const dataStreams = [0, 1, 2, 3, 4, 5, 6];
  const railNodes = [0, 1, 2, 3];
  const miniCards = [0, 1, 2];

  return (
    <div className={`relative isolate w-full max-w-[640px] bg-transparent ${className}`} aria-label="ZEN AI orbital scanner preview">
      <style>{`
        @keyframes floatPanel { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(130%); } }
        @keyframes textFlicker { 0%,100% { opacity: .62; } 50% { opacity: 1; } }
        @keyframes logoChipShimmer { 0%,100% { transform: translateX(-115%) skewX(-18deg); opacity: .16; } 52% { transform: translateX(115%) skewX(-18deg); opacity: .75; } }
        @keyframes chassisAurora { 0%,100% { opacity: .22; transform: translateX(-8%) rotate(-1deg); } 50% { opacity: .5; transform: translateX(8%) rotate(1deg); } }
        @keyframes glassSweep { 0%,100% { transform: translateX(-125%) skewX(-16deg); opacity: .08; } 52% { transform: translateX(125%) skewX(-16deg); opacity: .32; } }
        @keyframes microDataDrift { 0% { transform: translateY(-18px); opacity: 0; } 18% { opacity: .65; } 100% { transform: translateY(410px); opacity: 0; } }
        @keyframes orbitalSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orbitDash { from { stroke-dashoffset: 360; } to { stroke-dashoffset: 0; } }
        @keyframes holoFlow { 0% { background-position: 0% 50%, 0 0; } 50% { background-position: 100% 50%, 52px 18px; } 100% { background-position: 0% 50%, 0 0; } }
        @keyframes holoSpin { from { transform: rotate(0deg) scale(1.18); } to { transform: rotate(360deg) scale(1.18); } }
        @keyframes holoGlint { 0% { transform: translateX(-145%) skewX(-18deg); opacity: 0; } 24% { opacity: .48; } 100% { transform: translateX(154%) skewX(-18deg); opacity: 0; } }
        @keyframes chipCharge { 0%,100% { box-shadow: inset 0 1px 0 rgba(255,255,255,.96), inset 0 -10px 22px rgba(15,23,42,.1), 0 0 0 1px rgba(2,6,23,.72), 0 0 0 2px rgba(255,255,255,.38), 0 14px 28px rgba(2,6,23,.24), 0 0 18px var(--toneGlow); } 50% { box-shadow: inset 0 1px 0 rgba(255,255,255,1), inset 0 -10px 22px rgba(15,23,42,.08), 0 0 0 1px rgba(2,6,23,.78), 0 0 0 2px rgba(255,255,255,.5), 0 18px 34px rgba(2,6,23,.28), 0 0 26px var(--toneGlow); } }
        .zen-particle { background: radial-gradient(circle at 35% 28%, rgba(70,78,92,1), rgba(15,23,42,.98) 38%, rgba(2,6,23,.96) 76%, rgba(0,0,0,.98) 100%); box-shadow: 0 .5px 1px rgba(255,255,255,.18), 0 0 1px rgba(2,6,23,.92), 0 0 5px rgba(15,23,42,.18); transition: transform 780ms cubic-bezier(.16,1,.3,1), opacity 420ms ease, box-shadow 720ms ease, background 720ms ease; transition-delay: var(--delay); will-change: transform; }
        .particle-logo-zone:hover .zen-particle { box-shadow: 0 .5px 1px rgba(255,255,255,.16), 0 0 7px rgba(2,6,23,.52), 0 0 14px rgba(15,23,42,.28); }
        .holo-chip { overflow: hidden; isolation: isolate; min-width: 184px; background: linear-gradient(135deg, rgba(255,255,255,.92), var(--toneCore) 26%, rgba(255,255,255,.58) 46%, rgba(15,23,42,.08) 78%, rgba(255,255,255,.86)), linear-gradient(112deg, rgba(255,0,122,.18), rgba(255,214,10,.16), rgba(34,211,238,.22), rgba(99,102,241,.18), rgba(255,255,255,.32), rgba(255,0,122,.14)); background-size: 100% 100%, 260% 260%; border-width: 1.5px; animation: holoFlow 5.6s linear infinite, chipCharge 4.8s ease-in-out infinite; transition: opacity 80ms linear, transform 80ms linear, filter 80ms linear; }
        .holo-chip::before { content: ""; position: absolute; inset: -72%; z-index: 0; background: conic-gradient(from 80deg, rgba(255,255,255,.08), rgba(255,0,153,.18), rgba(255,230,0,.16), rgba(0,255,255,.22), rgba(99,102,241,.18), rgba(255,255,255,.34), rgba(255,0,153,.14)); filter: blur(8px) saturate(1.45); mix-blend-mode: screen; animation: holoSpin 6.2s linear infinite; }
        .holo-chip::after { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: inherit; background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,.08) 24%, rgba(255,255,255,.56) 42%, rgba(153,246,228,.28) 49%, rgba(216,180,254,.22) 57%, transparent 76%), repeating-linear-gradient(0deg, rgba(255,255,255,.18) 0 1px, transparent 1px 5px); mix-blend-mode: screen; animation: holoGlint 3.2s cubic-bezier(.16,.84,.22,1) infinite; }
      `}</style>

      <div className="relative h-[610px] w-full rounded-[48px] border border-slate-950/90 bg-[linear-gradient(145deg,rgba(27,35,50,.99),rgba(3,7,18,.96)_48%,rgba(19,27,41,.99))] p-6 pt-9 shadow-[inset_0_1px_0_rgba(255,255,255,.22),inset_0_-34px_64px_rgba(0,0,0,.54),0_40px_100px_rgba(2,6,23,.36),0_0_0_1px_rgba(255,255,255,.16),0_0_0_3px_rgba(2,6,23,.76)] backdrop-blur-xl" style={{ animation: "floatPanel 7s ease-in-out infinite" }}>
        <div className="pointer-events-none absolute -inset-[4px] rounded-[52px] bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,.16),transparent_30%),radial-gradient(circle_at_88%_28%,rgba(129,140,248,.14),transparent_34%)] blur-xl" style={{ animation: "chassisAurora 6.4s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute inset-[1px] rounded-[47px] bg-[linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.02)_35%,rgba(59,130,246,.1)_72%,rgba(34,211,238,.06))]" />
        <div className="pointer-events-none absolute -inset-px rounded-[48px] border border-black/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,.18),inset_0_0_0_2px_rgba(2,6,23,.84)]" />

        <div className="relative h-full overflow-hidden rounded-[34px] border border-black/80 bg-[linear-gradient(180deg,rgba(248,250,252,.97),rgba(226,232,240,.91))] shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_0_0_1px_rgba(255,255,255,.36),inset_0_-28px_64px_rgba(15,23,42,.15),0_0_0_2px_rgba(2,6,23,.78),0_20px_34px_rgba(0,0,0,.2)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 opacity-[.58] [background-image:linear-gradient(rgba(15,23,42,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.052)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="absolute inset-x-0 top-0 z-20 h-[54px] border-b border-black/70 bg-[linear-gradient(180deg,rgba(17,24,39,.94),rgba(2,6,23,.88))] backdrop-blur-xl">
            <div className="flex h-[54px] items-center gap-3 px-4 py-3">
              <div className="flex gap-2">
                <span className="size-2.5 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,.4)]" />
                <span className="size-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,.4)]" />
                <span className="size-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.4)]" />
              </div>
              <div className="ml-1 flex h-8 flex-1 items-center justify-center rounded-xl border border-black/70 bg-[rgba(255,255,255,.92)] text-[10px] font-black text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_5px_rgba(15,23,42,.12),0_8px_22px_rgba(0,0,0,.18)]">
                <span className="mr-1.5 grid size-3.5 place-items-center rounded-full bg-emerald-50 text-emerald-500">✓</span>
                app.zenai.co/orbital-agent
              </div>
              <span className="grid size-8 place-items-center rounded-xl border border-black/70 bg-white/92 text-[13px] font-black text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_8px_18px_rgba(0,0,0,.16)]">⌁</span>
            </div>
          </div>

          <div className="relative z-10 pt-[54px]">
            <div className="flex h-11 items-end border-b border-black/65 bg-[linear-gradient(180deg,rgba(15,23,42,.94),rgba(15,23,42,.82))] px-4">
              <div className="flex h-9 items-center gap-2 rounded-t-2xl border-x border-t border-black/80 bg-[linear-gradient(180deg,rgba(255,255,255,.98),rgba(226,232,240,.92))] px-4 text-[11px] font-black text-slate-950 shadow-[0_-6px_18px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_4px_rgba(15,23,42,.08)]">
                <span className="size-2.5 rounded bg-[linear-gradient(135deg,#06b6d4,#818cf8)] shadow-[0_0_18px_rgba(99,102,241,.55)]" />
                Orbital Agent Preview
              </div>
              <div className="ml-3 flex h-9 items-center text-[11px] font-bold text-slate-300/80">+ Neural tab</div>
            </div>

            <div className="relative h-[492px] px-5 py-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-slate-300/95 shadow-[inset_0_1px_2px_rgba(15,23,42,.12)]" />
                <div className="h-2.5 w-14 rounded-full bg-slate-300/80" />
                <div className="h-2.5 w-20 rounded-full bg-slate-300/72" />
                <div className="h-2.5 w-24 rounded-full bg-slate-300/68" />
                <div className="ml-auto h-8 w-28 rounded-2xl border border-slate-200/80 bg-white/95 shadow-[inset_0_1px_1px_rgba(255,255,255,1),inset_0_-2px_6px_rgba(15,23,42,.05),0_8px_22px_rgba(15,23,42,.06)]" />
              </div>

              <div className="relative h-[392px] overflow-hidden rounded-[30px] border border-slate-950/85 bg-[linear-gradient(180deg,rgba(248,250,252,.97),rgba(226,232,240,.87))] shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_0_0_1px_rgba(255,255,255,.44),inset_0_-20px_48px_rgba(15,23,42,.18),0_0_0_2px_rgba(2,6,23,.78),0_14px_30px_rgba(0,0,0,.18)]">
                <WebGLLaserField progress={progress} />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,.66),transparent_18%),radial-gradient(circle_at_18%_18%,rgba(99,102,241,.18),transparent_22%),radial-gradient(circle_at_82%_55%,rgba(34,211,238,.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,.76),rgba(203,213,225,.38))]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,.05)_1px,transparent_1px),linear-gradient(rgba(15,23,42,.04)_1px,transparent_1px)] [background-size:22px_22px] opacity-65" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,.18)_42%,transparent_55%)]" style={{ animation: "glassSweep 7.6s ease-in-out infinite" }} />

                <ParticleZenLogo />

                {dataStreams.map((line) => (
                  <span
                    key={`data-stream-${line}`}
                    className="pointer-events-none absolute top-0 z-10 h-9 w-px rounded-full bg-gradient-to-b from-transparent via-cyan-300/60 to-transparent blur-[.4px]"
                    style={{ left: `${10 + line * 13}%`, animation: `microDataDrift ${4.4 + line * 0.32}s ${line * 0.28}s linear infinite` }}
                  />
                ))}

                {railNodes.map((node) => (
                  <span
                    key={`rail-node-${node}`}
                    className="pointer-events-none absolute left-1/2 z-10 size-2 -translate-x-1/2 rounded-full border border-black/50 bg-white shadow-[0_0_18px_rgba(34,211,238,.38)]"
                    style={{ top: CHIP_POSITIONS[node] + 12 }}
                  />
                ))}

                <div key={`chips-${cycle}`} className="absolute inset-0 z-30">
                  {chips.map((chip, index) => (
                    <HologramChip key={`${cycle}-${chip.label}`} chip={chip} top={CHIP_POSITIONS[index]} reveal={reveals[index]} />
                  ))}
                </div>

                <div className="absolute inset-0 z-20">
                  {CHIP_POSITIONS.map((top, index) => (
                    <ScanBurst key={`burst-${index}`} top={top} strength={pulses[index]} />
                  ))}
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-[118px] will-change-transform" style={{ transform: `translate3d(0, ${scanY}px, 0)` }}>
                  <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(180deg,transparent_0%,rgba(14,165,233,.08)_18%,rgba(255,255,255,.3)_48%,rgba(99,102,241,.08)_72%,transparent_100%)]" />
                  <div className="absolute left-2 right-2 top-[58px] h-[2px] rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(56,189,248,.72)_15%,rgba(255,255,255,.94)_45%,rgba(129,140,248,.82)_64%,transparent_100%)] shadow-[0_0_8px_rgba(255,255,255,.9),0_0_22px_rgba(56,189,248,.82),0_0_52px_rgba(99,102,241,.72),0_0_88px_rgba(34,211,238,.48)]" />
                  <div className="absolute left-16 right-16 top-[56px] h-[6px] rounded-full bg-white/72 blur-[2px] shadow-[0_0_20px_rgba(255,255,255,.82),0_0_44px_rgba(34,211,238,.56)]" />
                  <div className="absolute left-10 right-10 top-[10px] h-[98px] rounded-[100%] border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(255,255,255,.24),rgba(129,140,248,.06),rgba(255,255,255,0))] shadow-[inset_0_0_24px_rgba(255,255,255,.1)]" />
                  <div className="absolute left-5 right-5 top-[82px] h-px bg-[linear-gradient(90deg,transparent,rgba(15,23,42,.18),transparent)]" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {miniCards.map((card) => (
                  <div key={card} className="relative h-[62px] overflow-hidden rounded-2xl border border-black/70 bg-[linear-gradient(180deg,rgba(255,255,255,.94),rgba(226,232,240,.86))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_8px_rgba(15,23,42,.08),0_10px_20px_rgba(0,0,0,.12)] backdrop-blur-xl">
                    <div className="size-5 rounded-lg bg-slate-300/70 shadow-[inset_0_1px_0_rgba(255,255,255,.8)]" />
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-300/70 shadow-[inset_0_1px_1px_rgba(15,23,42,.08)]">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-300/30 via-indigo-400/65 to-cyan-300/75" style={{ animation: `shimmer 2.8s ${card * 0.3}s ease-in-out infinite` }} />
                    </div>
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-20 flex h-[48px] items-center gap-3 border-t border-black/70 bg-[linear-gradient(180deg,rgba(255,255,255,.94),rgba(226,232,240,.9))] px-5 text-[10px] font-black text-slate-700 backdrop-blur-xl">
              <span className="flex items-center gap-1 text-indigo-600">✦ ZEN orbital scan</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-indigo-100/95 shadow-[inset_0_1px_2px_rgba(79,70,229,.12)]">
                <div className="h-full w-[83%] rounded-full bg-gradient-to-r from-indigo-400 via-cyan-300 to-white shadow-[0_0_28px_rgba(99,102,241,.5)]" />
              </div>
              <span className="tabular-nums text-slate-500" style={{ animation: "textFlicker 1.9s ease-in-out infinite" }}>83 / 85</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

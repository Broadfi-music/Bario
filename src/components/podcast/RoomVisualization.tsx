import { useEffect, useRef, memo } from 'react';

export type VisualTheme = 
  | 'neural-network' 
  | 'heartbeat-waves' 
  | 'crypto-charts' 
  | 'confetti-burst' 
  | 'aurora-ripple' 
  | 'bollywood-sparkle' 
  | 'cricket-energy' 
  | 'mandala-breath' 
  | 'dual-orbs' 
  | 'geometric-mosaic';

export type EnergyLevel = 'calm' | 'moderate' | 'heated' | 'intense';

interface RoomVisualizationProps {
  theme: VisualTheme;
  energy: EnergyLevel;
  className?: string;
}

const PALETTES: Record<VisualTheme, string[]> = {
  'neural-network': ['#00d4ff', '#0066ff', '#7c3aed', '#06b6d4'],
  'heartbeat-waves': ['#f43f5e', '#ec4899', '#f97316', '#fb7185'],
  'crypto-charts': ['#facc15', '#22c55e', '#f59e0b', '#84cc16'],
  'confetti-burst': ['#facc15', '#f97316', '#ef4444', '#a855f7', '#3b82f6'],
  'aurora-ripple': ['#818cf8', '#6366f1', '#a78bfa', '#c084fc'],
  'bollywood-sparkle': ['#f97316', '#facc15', '#ef4444', '#fb923c'],
  'cricket-energy': ['#3b82f6', '#f97316', '#06b6d4', '#ef4444'],
  'mandala-breath': ['#f59e0b', '#d97706', '#fbbf24', '#92400e'],
  'dual-orbs': ['#22c55e', '#ffffff', '#16a34a', '#86efac'],
  'geometric-mosaic': ['#14b8a6', '#facc15', '#0d9488', '#fbbf24'],
};

const SPEED: Record<EnergyLevel, number> = {
  calm: 0.3,
  moderate: 0.7,
  heated: 1.2,
  intense: 1.8,
};

const RoomVisualization = memo(({ theme, energy, className = '' }: RoomVisualizationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const colors = PALETTES[theme];
    const speed = SPEED[energy];
    const w = () => canvas.width / 2;
    const h = () => canvas.height / 2;

    // Particle pool for themes that need it
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; life: number; maxLife: number;
    }
    const particles: Particle[] = [];

    const initParticles = (count: number) => {
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * 600, y: Math.random() * 400,
          vx: (Math.random() - 0.5) * 2 * speed,
          vy: (Math.random() - 0.5) * 2 * speed,
          size: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: Math.random() * 100, maxLife: 100 + Math.random() * 200,
        });
      }
    };

    if (['neural-network', 'confetti-burst', 'bollywood-sparkle', 'cricket-energy'].includes(theme)) {
      initParticles(theme === 'neural-network' ? 30 : theme === 'confetti-burst' ? 50 : 35);
    }

    const draw = () => {
      const W = w(), H = h();
      timeRef.current += 0.016 * speed;
      const t = timeRef.current;

      ctx.clearRect(0, 0, W, H);

      // Dark gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0a0a0a');
      bgGrad.addColorStop(1, '#111118');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      switch (theme) {
        case 'neural-network': {
          // Pulsing nodes with connecting lines
          particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
            p.x = Math.max(0, Math.min(W, p.x));
            p.y = Math.max(0, Math.min(H, p.y));

            // Draw connections
            for (let j = i + 1; j < particles.length; j++) {
              const dx = p.x - particles[j].x;
              const dy = p.y - particles[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 120) {
                ctx.beginPath();
                ctx.strokeStyle = `${p.color}${Math.floor((1 - dist / 120) * 60).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = 0.5;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
              }
            }
            // Draw node
            const pulse = Math.sin(t * 2 + i) * 0.5 + 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * pulse * 2, 0, Math.PI * 2);
            ctx.fillStyle = p.color + '80';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          });
          break;
        }

        case 'heartbeat-waves': {
          // Floating gradient waves with heart-like pulses
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            const yBase = H * 0.3 + i * H * 0.12;
            for (let x = 0; x <= W; x += 2) {
              const wave = Math.sin(x * 0.015 + t * (1 + i * 0.3)) * 20 * (1 + Math.sin(t * 3) * 0.3);
              const y = yBase + wave + Math.sin(x * 0.008 - t) * 10;
              if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = colors[i % colors.length] + '60';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          // Floating hearts
          for (let i = 0; i < 8; i++) {
            const x = (W * 0.1 + i * W * 0.11 + Math.sin(t + i * 2) * 20) % W;
            const y = (H - ((t * 30 + i * 80) % (H + 40)));
            const s = 6 + Math.sin(t * 2 + i) * 2;
            ctx.fillStyle = colors[i % colors.length] + '50';
            ctx.beginPath();
            ctx.moveTo(x, y - s * 0.3);
            ctx.bezierCurveTo(x + s, y - s, x + s, y + s * 0.3, x, y + s);
            ctx.bezierCurveTo(x - s, y + s * 0.3, x - s, y - s, x, y - s * 0.3);
            ctx.fill();
          }
          break;
        }

        case 'crypto-charts': {
          // Rising/falling chart lines
          for (let line = 0; line < 3; line++) {
            ctx.beginPath();
            const baseY = H * (0.3 + line * 0.15);
            for (let x = 0; x <= W; x += 3) {
              const noise = Math.sin(x * 0.02 + t * (0.5 + line * 0.2)) * 30
                + Math.sin(x * 0.05 + t * 1.5) * 15
                + Math.cos(x * 0.01 - t * 0.3) * 20;
              const y = baseY + noise;
              if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            const grad = ctx.createLinearGradient(0, 0, W, 0);
            grad.addColorStop(0, colors[line] + 'cc');
            grad.addColorStop(1, colors[(line + 1) % colors.length] + 'cc');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Glow area under line
            ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
            const fillGrad = ctx.createLinearGradient(0, baseY - 30, 0, H);
            fillGrad.addColorStop(0, colors[line] + '20');
            fillGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = fillGrad;
            ctx.fill();
          }
          // Floating price indicators
          for (let i = 0; i < 4; i++) {
            const x = W * 0.2 + i * W * 0.2 + Math.sin(t + i) * 10;
            const y = H * 0.2 + Math.sin(t * 0.5 + i * 1.5) * 30;
            ctx.fillStyle = colors[i % colors.length] + '40';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        case 'confetti-burst': {
          particles.forEach(p => {
            p.life++;
            if (p.life > p.maxLife) {
              p.x = W / 2 + (Math.random() - 0.5) * 100;
              p.y = H / 2;
              p.vx = (Math.random() - 0.5) * 6 * speed;
              p.vy = (Math.random() - 0.5) * 6 * speed - 2;
              p.life = 0;
              p.color = colors[Math.floor(Math.random() * colors.length)];
            }
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.02; // gravity
            const alpha = Math.max(0, 1 - p.life / p.maxLife);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.life * 0.05);
            ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, '0');
            ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            ctx.restore();
          });
          // Central burst glow
          const burstAlpha = (Math.sin(t * 3) * 0.3 + 0.3);
          const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.3);
          glow.addColorStop(0, `rgba(250, 204, 21, ${burstAlpha})`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, W, H);
          break;
        }

        case 'aurora-ripple': {
          // Gentle ripple waves — calming
          for (let i = 0; i < 6; i++) {
            const radius = 30 + i * 25 + Math.sin(t * 0.5 + i) * 15;
            ctx.beginPath();
            ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2);
            ctx.strokeStyle = colors[i % colors.length] + '30';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          // Soft aurora gradient
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            for (let x = 0; x <= W; x += 3) {
              const y = H * 0.5 + Math.sin(x * 0.01 + t * 0.3 + i * 2) * H * 0.2;
              if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
            ctx.fillStyle = colors[i] + '15';
            ctx.fill();
          }
          break;
        }

        case 'bollywood-sparkle': {
          // Rotating sparkle shapes
          particles.forEach((p, i) => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W) p.vx *= -1;
            if (p.y < 0 || p.y > H) p.vy *= -1;
            const sparkleSize = p.size * (Math.sin(t * 3 + i) * 0.5 + 1.5);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(t * 2 + i);
            // Star shape
            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              const angle = (s * Math.PI * 2) / 5 - Math.PI / 2;
              const r = s % 2 === 0 ? sparkleSize * 2 : sparkleSize;
              ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fillStyle = p.color + '70';
            ctx.fill();
            ctx.restore();
          });
          // Central glow
          const bGlow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.4);
          bGlow.addColorStop(0, 'rgba(249, 115, 22, 0.15)');
          bGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = bGlow;
          ctx.fillRect(0, 0, W, H);
          break;
        }

        case 'cricket-energy': {
          // Energetic ball trajectories
          particles.forEach((p, i) => {
            p.x += p.vx * 1.5; p.y += p.vy * 1.5;
            p.vy += 0.03;
            if (p.y > H) { p.y = H * 0.3; p.x = Math.random() * W; p.vy = -Math.random() * 3; p.vx = (Math.random() - 0.5) * 4; }
            if (p.x < 0 || p.x > W) p.vx *= -1;
            // Trail
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color + '90';
            ctx.fill();
            // Trail line
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
            ctx.strokeStyle = p.color + '40';
            ctx.lineWidth = 1;
            ctx.stroke();
          });
          // Stumps
          const stumpX = W * 0.5;
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#fbbf2440';
            ctx.fillRect(stumpX - 8 + i * 6, H * 0.6, 2, H * 0.25);
          }
          break;
        }

        case 'mandala-breath': {
          // Breathing mandala circle
          const breathScale = Math.sin(t * 0.5) * 0.3 + 1;
          const cx = W / 2, cy = H / 2;
          for (let ring = 0; ring < 4; ring++) {
            const r = (40 + ring * 25) * breathScale;
            const petals = 6 + ring * 2;
            for (let p = 0; p < petals; p++) {
              const angle = (p / petals) * Math.PI * 2 + t * 0.2 * (ring % 2 === 0 ? 1 : -1);
              const px = cx + Math.cos(angle) * r;
              const py = cy + Math.sin(angle) * r;
              ctx.beginPath();
              ctx.arc(px, py, 4 + ring, 0, Math.PI * 2);
              ctx.fillStyle = colors[ring % colors.length] + '50';
              ctx.fill();
            }
            // Ring circle
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = colors[ring % colors.length] + '20';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          // Central glow
          const mGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * breathScale);
          mGlow.addColorStop(0, 'rgba(245, 158, 11, 0.3)');
          mGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = mGlow;
          ctx.fillRect(0, 0, W, H);
          break;
        }

        case 'dual-orbs': {
          // Two opposing energy orbs
          const orb1x = W * 0.35 + Math.sin(t) * 30;
          const orb1y = H / 2 + Math.cos(t * 0.7) * 20;
          const orb2x = W * 0.65 - Math.sin(t) * 30;
          const orb2y = H / 2 - Math.cos(t * 0.7) * 20;
          // Orb 1
          const g1 = ctx.createRadialGradient(orb1x, orb1y, 0, orb1x, orb1y, 60);
          g1.addColorStop(0, colors[0] + 'aa');
          g1.addColorStop(0.5, colors[0] + '40');
          g1.addColorStop(1, 'transparent');
          ctx.fillStyle = g1;
          ctx.fillRect(0, 0, W, H);
          // Orb 2
          const g2 = ctx.createRadialGradient(orb2x, orb2y, 0, orb2x, orb2y, 60);
          g2.addColorStop(0, '#ffffffaa');
          g2.addColorStop(0.5, '#ffffff40');
          g2.addColorStop(1, 'transparent');
          ctx.fillStyle = g2;
          ctx.fillRect(0, 0, W, H);
          // Collision sparks
          const midX = (orb1x + orb2x) / 2;
          const midY = (orb1y + orb2y) / 2;
          const collisionIntensity = Math.max(0, 1 - Math.hypot(orb1x - orb2x, orb1y - orb2y) / 200);
          for (let i = 0; i < 8; i++) {
            const angle = t * 3 + i * Math.PI / 4;
            const dist = 10 + Math.sin(t * 5 + i) * 15 * collisionIntensity;
            ctx.beginPath();
            ctx.arc(midX + Math.cos(angle) * dist, midY + Math.sin(angle) * dist, 2, 0, Math.PI * 2);
            ctx.fillStyle = colors[2] + '80';
            ctx.fill();
          }
          break;
        }

        case 'geometric-mosaic': {
          // Morphing geometric Islamic patterns
          const cx2 = W / 2, cy2 = H / 2;
          for (let ring = 0; ring < 5; ring++) {
            const sides = 6 + ring;
            const r = 30 + ring * 22 + Math.sin(t * 0.3 + ring) * 8;
            ctx.beginPath();
            for (let i = 0; i <= sides; i++) {
              const angle = (i / sides) * Math.PI * 2 + t * 0.15 * (ring % 2 === 0 ? 1 : -1);
              const px = cx2 + Math.cos(angle) * r;
              const py = cy2 + Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.strokeStyle = colors[ring % colors.length] + '50';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Inner lines
            for (let i = 0; i < sides; i++) {
              const angle = (i / sides) * Math.PI * 2 + t * 0.15 * (ring % 2 === 0 ? 1 : -1);
              ctx.beginPath();
              ctx.moveTo(cx2, cy2);
              ctx.lineTo(cx2 + Math.cos(angle) * r, cy2 + Math.sin(angle) * r);
              ctx.strokeStyle = colors[ring % colors.length] + '15';
              ctx.stroke();
            }
          }
          break;
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [theme, energy]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
});

RoomVisualization.displayName = 'RoomVisualization';

export default RoomVisualization;

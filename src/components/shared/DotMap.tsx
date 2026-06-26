'use client';

import { useEffect, useRef, useMemo } from 'react';

export default function DotMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const centers = useMemo(
    () => [
      [50, 48], [48, 46], [38, 55], [52, 30], [53, 28], [53, 27],
      [86, 28], [82, 35], [83, 32], [78, 38], [76, 33], [55, 32],
      [90, 42], [48, 40], [85, 19], [42, 32], [20, 32], [68, 15],
      [72, 50], [60, 55],
    ],
    []
  );

  const connections = useMemo(
    () => [
      [0, 2], [0, 3], [0, 4], [1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 6],
      [5, 6], [5, 7], [6, 8], [7, 8], [7, 9], [3, 11], [8, 10], [9, 12],
      [10, 14], [11, 15], [12, 16], [13, 17], [14, 15], [15, 18], [16, 18],
      [0, 1], [4, 13], [6, 14], [3, 10],
    ],
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let w: number, h: number, animId: number;
    let isVisible = true;

    // IntersectionObserver — pause when off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    // Generate dots
    const dots: { x: number; y: number; r: number; baseAlpha: number; speed: number; phase: number }[] = [];
    centers.forEach((c) => {
      const cx = (c[0] / 100) * (w || 1000);
      const cy = (c[1] / 100) * (h || 1000);
      const count = 18 + Math.floor(Math.random() * 22);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 2 + Math.random() * 25;
        dots.push({
          x: cx + Math.cos(angle) * dist,
          y: cy + Math.sin(angle) * dist,
          r: 0.8 + Math.random() * 1.8,
          baseAlpha: 0.25 + Math.random() * 0.5,
          speed: 0.3 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
        });
      }
    });

    function resize() {
      const hero = canvas!.parentElement!;
      w = canvas!.width = hero.offsetWidth;
      h = canvas!.height = hero.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    function draw() {
      if (!isVisible) {
        animId = requestAnimationFrame(draw);
        return;
      }
      time += 0.006;
      ctx!.clearRect(0, 0, w, h);
      connections.forEach((conn) => {
        const c1 = centers[conn[0]];
        const c2 = centers[conn[1]];
        const x1 = (c1[0] / 100) * w;
        const y1 = (c1[1] / 100) * h;
        const x2 = (c2[0] / 100) * w;
        const y2 = (c2[1] / 100) * h;
        const pulse = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(time * 0.5 + conn[0]));
        ctx!.beginPath();
        ctx!.moveTo(x1, y1);
        ctx!.lineTo(x2, y2);
        ctx!.strokeStyle = `rgba(79,110,247,${pulse})`;
        ctx!.lineWidth = 0.6;
        ctx!.stroke();
      });
      dots.forEach((d) => {
        const alpha = d.baseAlpha * (0.5 + 0.5 * Math.sin(time * d.speed + d.phase));
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(79,110,247,${alpha})`;
        ctx!.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [centers, connections]);

  return <canvas ref={canvasRef} id="hero-map" className="hero-map-canvas" />;
}

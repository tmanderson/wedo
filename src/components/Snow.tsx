"use client";

import { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  animationDelay: number;
  size: number;
  opacity: number;
}

export default function Snow() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // Generate 50 snowflakes with random properties
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 50; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100, // Random horizontal position (0-100%)
        animationDuration: 10 + Math.random() * 20, // Fall duration 10-30s
        animationDelay: Math.random() * 10, // Random start delay 0-10s
        size: 2 + Math.random() * 4, // Size 2-6px
        opacity: 0.3 + Math.random() * 0.4, // Opacity 0.3-0.7
      });
    }
    setSnowflakes(flakes);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 10, userSelect: "none" }}
      aria-hidden="true"
    >
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake absolute rounded-full bg-white"
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animation: `fall ${flake.animationDuration}s linear ${flake.animationDelay}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10px) translateX(0);
          }
          25% {
            transform: translateY(25vh) translateX(10px);
          }
          50% {
            transform: translateY(50vh) translateX(-5px);
          }
          75% {
            transform: translateY(75vh) translateX(15px);
          }
          100% {
            transform: translateY(100vh) translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

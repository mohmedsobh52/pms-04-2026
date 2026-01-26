import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface BackgroundImageProps {
  activePhase?: number;
}

const phaseColors: Record<number, string> = {
  1: "186 100% 50%", // Cyan
  2: "217 91% 60%",  // Blue
  3: "142 71% 45%",  // Green
  4: "25 95% 53%",   // Orange
  5: "262 83% 58%",  // Purple
  6: "350 89% 60%",  // Rose
};

const BackgroundImage = ({ activePhase = 1 }: BackgroundImageProps) => {
  const currentPhaseColor = phaseColors[activePhase] || phaseColors[1];
  
  // Generate floating particles
  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 10,
    }));
  }, []);

  return (
    <>
      {/* Multi-layer Dynamic Background */}
      <div className="fixed inset-0 -z-30 bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-950 dark:from-slate-950 dark:via-blue-950/30 dark:to-slate-950" />
      
      {/* Phase-based gradient overlay */}
      <div 
        className="fixed inset-0 -z-28 transition-all duration-1000"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, hsl(${currentPhaseColor} / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, hsl(224 76% 48% / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, hsl(262 83% 58% / 0.05) 0%, transparent 60%)
          `
        }}
      />
      
      {/* Grid Pattern */}
      <div 
        className="fixed inset-0 -z-26 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Floating Orbs - Primary (Phase-aware) */}
      <div 
        className="fixed top-1/4 left-1/4 w-64 md:w-96 h-64 md:h-96 rounded-full blur-[100px] animate-float -z-24 transition-colors duration-1000"
        style={{ 
          backgroundColor: `hsl(${currentPhaseColor} / 0.08)`,
          boxShadow: `0 0 100px hsl(${currentPhaseColor} / 0.1)`
        }}
      />
      
      {/* Floating Orbs - Accent */}
      <div 
        className="fixed bottom-1/4 right-1/4 w-56 md:w-80 h-56 md:h-80 bg-accent/5 rounded-full blur-[100px] -z-24"
        style={{ animation: 'float 8s ease-in-out infinite', animationDelay: '2s' }}
      />
      
      {/* Floating Orbs - Purple */}
      <div 
        className="fixed top-1/2 right-1/3 w-48 md:w-64 h-48 md:h-64 bg-purple-500/5 rounded-full blur-[80px] -z-24"
        style={{ animation: 'float 10s ease-in-out infinite', animationDelay: '4s' }}
      />
      
      {/* Floating Orbs - Cyan */}
      <div 
        className="fixed bottom-1/3 left-1/3 w-40 md:w-56 h-40 md:h-56 bg-cyan-500/5 rounded-full blur-[70px] -z-24"
        style={{ animation: 'float 7s ease-in-out infinite', animationDelay: '1s' }}
      />
      
      {/* Floating Particles */}
      <div className="fixed inset-0 -z-23 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full animate-float-particle"
            style={{
              width: particle.size,
              height: particle.size,
              left: particle.left,
              top: particle.top,
              backgroundColor: `hsl(${currentPhaseColor} / 0.3)`,
              boxShadow: `0 0 ${particle.size * 2}px hsl(${currentPhaseColor} / 0.2)`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>
      
      {/* Subtle diagonal lines pattern */}
      <div 
        className="fixed inset-0 -z-22 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            hsl(224 76% 48% / 0.3) 100px,
            hsl(224 76% 48% / 0.3) 101px
          )`
        }}
      />
      
      {/* Light/Dark Mode Overlay for readability */}
      <div className="fixed inset-0 -z-10 bg-background/88 dark:bg-background/85 backdrop-blur-[1px]" />
    </>
  );
};

export default BackgroundImage;

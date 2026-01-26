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
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: Math.random() * 5,
      duration: 5 + Math.random() * 10,
    }));
  }, []);

  // Generate aurora blobs
  const auroraBlobs = useMemo(() => [
    { x: '20%', y: '15%', size: 'w-[500px] h-[400px]', color: currentPhaseColor, delay: 0 },
    { x: '70%', y: '60%', size: 'w-[400px] h-[500px]', color: '217 91% 60%', delay: 3 },
    { x: '40%', y: '80%', size: 'w-[350px] h-[350px]', color: '262 83% 58%', delay: 6 },
  ], [currentPhaseColor]);

  return (
    <>
      {/* Base Dark Gradient */}
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Aurora Effect Layer */}
      <div className="fixed inset-0 -z-45 overflow-hidden">
        {auroraBlobs.map((blob, i) => (
          <div
            key={i}
            className={`absolute ${blob.size} rounded-full blur-[120px] transition-all duration-[3000ms]`}
            style={{
              left: blob.x,
              top: blob.y,
              backgroundColor: `hsl(${blob.color} / 0.15)`,
              animation: `aurora ${15 + i * 2}s ease-in-out infinite`,
              animationDelay: `${blob.delay}s`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </div>

      {/* Mesh Gradient Overlay */}
      <div 
        className="fixed inset-0 -z-40 opacity-70"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 20%, hsl(${currentPhaseColor} / 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 60% 80% at 80% 70%, hsl(217 91% 60% / 0.10) 0%, transparent 45%),
            radial-gradient(ellipse 70% 50% at 50% 50%, hsl(262 83% 58% / 0.08) 0%, transparent 55%),
            radial-gradient(ellipse 50% 70% at 70% 30%, hsl(142 71% 45% / 0.06) 0%, transparent 40%)
          `,
          animation: 'meshGradient 20s ease-in-out infinite',
          backgroundSize: '200% 200%'
        }}
      />
      
      {/* Subtle Noise Texture */}
      <div 
        className="fixed inset-0 -z-35 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px'
        }}
      />
      
      {/* Grid Pattern - Enhanced */}
      <div 
        className="fixed inset-0 -z-32 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Radial Glow at Center */}
      <div 
        className="fixed inset-0 -z-30 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse 100% 100% at 50% 30%, hsl(${currentPhaseColor} / 0.06) 0%, transparent 70%)`
        }}
      />
      
      {/* Floating Orbs - Enhanced with more variety */}
      <div 
        className="fixed w-72 h-72 md:w-[400px] md:h-[400px] rounded-full blur-[100px] -z-28 transition-colors duration-1000"
        style={{ 
          top: '15%',
          left: '10%',
          backgroundColor: `hsl(${currentPhaseColor} / 0.1)`,
          animation: 'float 8s ease-in-out infinite'
        }}
      />
      
      <div 
        className="fixed w-64 h-64 md:w-[350px] md:h-[350px] rounded-full blur-[100px] -z-28"
        style={{ 
          bottom: '20%',
          right: '15%',
          backgroundColor: 'hsl(217 91% 60% / 0.08)',
          animation: 'float 10s ease-in-out infinite',
          animationDelay: '2s'
        }}
      />
      
      <div 
        className="fixed w-56 h-56 md:w-[300px] md:h-[300px] rounded-full blur-[90px] -z-28"
        style={{ 
          top: '50%',
          right: '25%',
          backgroundColor: 'hsl(262 83% 58% / 0.07)',
          animation: 'float 12s ease-in-out infinite',
          animationDelay: '4s'
        }}
      />
      
      <div 
        className="fixed w-48 h-48 md:w-[250px] md:h-[250px] rounded-full blur-[80px] -z-28"
        style={{ 
          bottom: '30%',
          left: '30%',
          backgroundColor: 'hsl(186 100% 50% / 0.06)',
          animation: 'float 9s ease-in-out infinite',
          animationDelay: '1s'
        }}
      />

      <div 
        className="fixed w-40 h-40 md:w-[200px] md:h-[200px] rounded-full blur-[70px] -z-28"
        style={{ 
          top: '70%',
          left: '60%',
          backgroundColor: 'hsl(142 71% 45% / 0.06)',
          animation: 'float 11s ease-in-out infinite',
          animationDelay: '3s'
        }}
      />

      <div 
        className="fixed w-36 h-36 md:w-[180px] md:h-[180px] rounded-full blur-[60px] -z-28"
        style={{ 
          top: '25%',
          right: '10%',
          backgroundColor: 'hsl(350 89% 60% / 0.05)',
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '5s'
        }}
      />
      
      {/* Floating Particles */}
      <div className="fixed inset-0 -z-25 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full animate-float-particle"
            style={{
              width: particle.size,
              height: particle.size,
              left: particle.left,
              top: particle.top,
              backgroundColor: `hsl(${currentPhaseColor} / 0.4)`,
              boxShadow: `0 0 ${particle.size * 3}px hsl(${currentPhaseColor} / 0.3)`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>
      
      {/* Diagonal Lines Pattern */}
      <div 
        className="fixed inset-0 -z-22 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 80px,
            hsl(${currentPhaseColor} / 0.3) 80px,
            hsl(${currentPhaseColor} / 0.3) 81px
          )`
        }}
      />
      
      {/* Light/Dark Mode Overlay - Reduced opacity for more vibrant background */}
      <div className="fixed inset-0 -z-10 bg-background/75 dark:bg-background/70 backdrop-blur-[1px]" />
    </>
  );
};

export default BackgroundImage;

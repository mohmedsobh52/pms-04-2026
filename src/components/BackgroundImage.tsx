interface BackgroundImageProps {
  activePhase?: number;
}

const phaseColors: Record<number, string> = {
  1: "186 100% 50%",
  2: "217 91% 60%",
  3: "142 71% 45%",
  4: "25 95% 53%",
  5: "262 83% 58%",
  6: "350 89% 60%",
};

const BackgroundImage = ({ activePhase = 1 }: BackgroundImageProps) => {
  const currentPhaseColor = phaseColors[activePhase] || phaseColors[1];

  return (
    <>
      {/* Base Gradient */}
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      
      {/* Single Aurora Blob */}
      <div
        className="fixed -z-45 w-[500px] h-[400px] rounded-full blur-[120px] transition-colors duration-[2000ms]"
        style={{
          left: '30%',
          top: '25%',
          backgroundColor: `hsl(${currentPhaseColor} / 0.12)`,
          transform: 'translate(-50%, -50%)'
        }}
      />

      {/* Subtle Grid */}
      <div 
        className="fixed inset-0 -z-40 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Single Floating Orb */}
      <div 
        className="fixed w-72 h-72 md:w-[350px] md:h-[350px] rounded-full blur-[100px] -z-35 transition-colors duration-[2000ms]"
        style={{ 
          bottom: '20%',
          right: '15%',
          backgroundColor: `hsl(217 91% 60% / 0.08)`,
          animation: 'float 12s ease-in-out infinite'
        }}
      />
      
      {/* Light/Dark Mode Overlay */}
      <div className="fixed inset-0 -z-10 bg-background/75 dark:bg-background/70 pointer-events-none" />
    </>
  );
};

export default BackgroundImage;

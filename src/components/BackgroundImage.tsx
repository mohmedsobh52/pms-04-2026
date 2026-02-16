interface BackgroundImageProps {
  activePhase?: number;
}

const BackgroundImage = ({ activePhase = 1 }: BackgroundImageProps) => {
  return (
    <>
      {/* Circuit Board Background Image */}
      <div
        className="fixed inset-0 -z-50"
        style={{
          backgroundImage: 'url(/images/pms-dashboard-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Dark Overlay for readability */}
      <div className="fixed inset-0 -z-40 bg-black/60 dark:bg-black/70" />

      {/* Light/Dark Mode Overlay */}
      <div className="fixed inset-0 -z-10 bg-background/50 dark:bg-background/40 pointer-events-none" />
    </>
  );
};

export default BackgroundImage;

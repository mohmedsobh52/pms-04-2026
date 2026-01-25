const BackgroundImage = () => {
  return (
    <>
      {/* AI-Generated Background Image */}
      <div 
        className="fixed inset-0 -z-20"
        style={{
          backgroundImage: 'url(/images/ai-construction-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      />
      {/* Overlay for readability - optimized for the new image */}
      <div className="fixed inset-0 -z-10 bg-background/85 backdrop-blur-[2px] dark:bg-background/90" />
    </>
  );
};

export default BackgroundImage;

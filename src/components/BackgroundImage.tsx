const BackgroundImage = () => {
  return (
    <>
      {/* Background Image */}
      <div 
        className="fixed inset-0 -z-20"
        style={{
          backgroundImage: 'url(/images/construction-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      />
      {/* Overlay for readability */}
      <div className="fixed inset-0 -z-10 bg-background/88 backdrop-blur-[1px] dark:bg-background/92" />
    </>
  );
};

export default BackgroundImage;

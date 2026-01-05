import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export function PageLoadingProgress() {
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Start loading animation
    setIsLoading(true);
    setProgress(0);

    // Simulate loading progress
    const timer1 = setTimeout(() => setProgress(30), 50);
    const timer2 = setTimeout(() => setProgress(60), 150);
    const timer3 = setTimeout(() => setProgress(90), 250);
    const timer4 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => setIsLoading(false), 200);
    }, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [location.pathname]);

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100]">
      <Progress 
        value={progress} 
        className="h-1 rounded-none bg-transparent"
      />
    </div>
  );
}

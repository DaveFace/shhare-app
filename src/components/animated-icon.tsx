import { useRef, useState } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { cn } from "@/lib/utils";

import defaultAnimationData from "@/assets/icon_animated.json";

interface AnimatedIconProps {
  className?: string;
  size?: number;
  animationData?: any;
}

export function AnimatedIcon({ className, size = 32, animationData }: AnimatedIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Use provided animation data or fall back to default
  const animation = animationData || defaultAnimationData;

  const handleMouseEnter = () => {
    if (!isHovered && lottieRef.current) {
      setIsHovered(true);
      lottieRef.current.stop();
      lottieRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleComplete = () => {
    setIsHovered(false);
    if (lottieRef.current) {
      lottieRef.current.stop();
      lottieRef.current.goToAndStop(0, true);
    }
  };

  return (
    <div
      className={cn("", className)}
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animation}
        loop={false}
        autoplay={false}
        onComplete={handleComplete}
        style={{ width: size, height: size }}
      />
    </div>
  );
}

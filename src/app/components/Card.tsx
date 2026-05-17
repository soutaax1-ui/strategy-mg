import React from "react";
import { cn } from "../../lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: "cyan" | "pink" | "gold" | "lime" | "none";
}

export function Card({ glowColor = "none", className, children, ...props }: CardProps) {
  const baseStyles = "bg-mg-surface border-2 border-mg-border p-4 shadow-[4px_4px_0px_#000000]";
  
  const glowStyles = {
    cyan: "border-mg-cyan shadow-[0_0_15px_rgba(0,217,255,0.3),4px_4px_0px_#000000]",
    pink: "border-mg-pink shadow-[0_0_15px_rgba(255,77,141,0.3),4px_4px_0px_#000000]",
    gold: "border-mg-gold shadow-[0_0_15px_rgba(255,186,8,0.3),4px_4px_0px_#000000]",
    lime: "border-mg-lime shadow-[0_0_15px_rgba(128,237,153,0.3),4px_4px_0px_#000000]",
    none: "",
  };

  return (
    <div className={cn(baseStyles, glowStyles[glowColor], className)} {...props}>
      {children}
    </div>
  );
}

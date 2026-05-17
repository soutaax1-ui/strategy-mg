import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-dot transition-all active:translate-y-1 active:translate-x-1 border-2 border-mg-border disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Retro hard shadow
  const shadowStyle = "shadow-[4px_4px_0px_#000000] active:shadow-[0px_0px_0px_#000000]";
  
  const variants = {
    primary: "bg-mg-gold text-[#000] border-[#000] hover:bg-[#ffc933]",
    secondary: "bg-mg-surface text-mg-text-primary hover:bg-mg-elevated",
    danger: "bg-mg-danger text-white border-[#000] hover:bg-[#ff4d79]",
    success: "bg-mg-success text-[#000] border-[#000] hover:bg-[#08e8ad]",
    outline: "bg-transparent text-mg-gold border-mg-gold hover:bg-mg-gold/10",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
  };

  return (
    <button
      className={cn(baseStyles, shadowStyle, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

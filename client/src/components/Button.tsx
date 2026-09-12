import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "sm";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  variant = "primary", 
  size = "md", 
  className = "", 
  ...props 
}, ref) => {
  const baseClasses = "inline-flex items-center justify-center rounded-[6px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeClasses = {
    md: "h-[40px] px-4 text-[0.9375rem]",
    sm: "h-[32px] px-3 text-[0.8125rem]"
  };
  
  const variantClasses = {
    primary: "bg-accent text-bg hover:bg-accent-hover",
    secondary: "bg-transparent border border-border text-text-muted hover:border-border-strong hover:text-text",
    danger: "bg-transparent border border-danger text-danger hover:bg-danger hover:text-bg",
    ghost: "bg-transparent text-text-muted hover:text-text hover:bg-surface-raised"
  };

  return (
    <button 
      ref={ref}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
});

Button.displayName = "Button";

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

const variantClasses = {
  primary: "bg-gold-600 text-dark-900 hover:bg-gold-500 font-semibold",
  secondary: "bg-dark-700 text-white hover:bg-dark-600 border border-gray-700",
  outline: "bg-transparent text-gold-500 border border-gold-600 hover:bg-gold-600/10",
  ghost: "bg-transparent text-gray-300 hover:text-gold-400 hover:bg-white/5",
};

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className = "",
  onClick,
  disabled,
  type,
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded transition-all duration-200 tracking-wide ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Link href={href} className={classes}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      type={type as "button" | "submit" | "reset" | undefined}
    >
      {children}
    </motion.button>
  );
}

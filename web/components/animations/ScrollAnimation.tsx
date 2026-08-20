"use client";

import { motion, useReducedMotion, HTMLMotionProps, Variants } from "framer-motion";
import { ReactNode } from "react";

interface Props extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  delay?: number;
  type?: "fade-up" | "fade-in" | "slide-up";
  staggerChildren?: boolean;
}

export function ScrollAnimation({ children, className, delay = 0, type = "fade-up", staggerChildren = false, ...rest }: Props) {
  const shouldReduceMotion = useReducedMotion();

  const baseVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : type === "fade-up" ? 30 : type === "slide-up" ? 50 : 0 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: "easeOut", 
        delay,
        ...(staggerChildren && { staggerChildren: 0.1, delayChildren: delay })
      } 
    }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={baseVariants}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function ScrollAnimationChild({ children, className, type = "fade-up", ...rest }: Props) {
  const shouldReduceMotion = useReducedMotion();

  const childVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : type === "fade-up" ? 30 : type === "slide-up" ? 50 : 0 
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: "easeOut" 
      } 
    }
  };

  return (
    <motion.div className={className} variants={childVariants} {...rest}>
      {children}
    </motion.div>
  );
}

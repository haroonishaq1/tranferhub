import React, { useEffect, useRef, useState } from 'react';

// Simple, reliable animation implementation using CSS classes
const SimpleAnimateOnScroll = ({ 
  children, 
  animation = 'fadeInUp', 
  duration = '1s', 
  delay = '0s', 
  threshold = 0.1,
  once = true,
  className = '',
  style = {}
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            setHasAnimated(true);
            // Once animation is done, we can unobserve
            observer.unobserve(entry.target);
          }
        } else if (!once && !hasAnimated) {
          setIsVisible(false);
        }
      },
      {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold
      }
    );
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [threshold, once, hasAnimated]);
  
  const animationClass = `fade-${animation}`;
  const visibilityClass = isVisible || hasAnimated ? 'is-visible' : 'is-hidden';
    const inlineStyle = {
    ...style,
    animationDuration: duration,
    animationDelay: delay,
    opacity: (isVisible || hasAnimated) ? null : 0, // Start with opacity 0, let animation handle it when visible
    visibility: (isVisible || hasAnimated) ? 'visible' : 'hidden' // Hide completely until visible
  };
  
  return (
    <div
      ref={elementRef}
      className={`${className} ${animationClass} ${visibilityClass}`}
      style={inlineStyle}
    >
      {children}
    </div>
  );
};

export default SimpleAnimateOnScroll;

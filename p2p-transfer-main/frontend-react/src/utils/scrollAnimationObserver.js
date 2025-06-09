import { useEffect, useRef, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Define animation keyframes
const fadeInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const fadeInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeInDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// This hook creates an intersection observer that watches for elements to scroll into view
export const useIntersectionObserver = (options = {}) => {
  const [elements, setElements] = useState([]);
  const [entries, setEntries] = useState([]);
  const observer = useRef(null);

  const threshold = options.threshold || 0.1;
  const rootMargin = options.rootMargin || '0px';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.IntersectionObserver) {
      observer.current = new IntersectionObserver((observedEntries) => {
        setEntries(observedEntries);
      }, {
        threshold,
        rootMargin
      });
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [threshold, rootMargin]);
  useEffect(() => {
    const currentObserver = observer.current;
    
    if (currentObserver && elements.length > 0) {
      elements.forEach(element => currentObserver.observe(element));
    }
    
    return () => {
      if (currentObserver && elements.length > 0) {
        elements.forEach(element => currentObserver.unobserve(element));
      }
    };
  }, [elements]);

  const addElement = (element) => {
    if (element && !elements.includes(element)) {
      setElements(prevElements => [...prevElements, element]);
    }
  };

  return { addElement, entries };
};

// Define styled components for each animation type
const FadeInLeftDiv = styled.div`
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  animation: ${props => props.isVisible ? css`${fadeInLeft} ${props.duration} ease-out ${props.delay} forwards` : 'none'};
`;

const FadeInRightDiv = styled.div`
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  animation: ${props => props.isVisible ? css`${fadeInRight} ${props.duration} ease-out ${props.delay} forwards` : 'none'};
`;

const FadeInUpDiv = styled.div`
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  animation: ${props => props.isVisible ? css`${fadeInUp} ${props.duration} ease-out ${props.delay} forwards` : 'none'};
`;

const FadeInDownDiv = styled.div`
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  animation: ${props => props.isVisible ? css`${fadeInDown} ${props.duration} ease-out ${props.delay} forwards` : 'none'};
`;

// Create a component that can be used to wrap elements to animate on scroll
export const AnimateOnScroll = ({ 
  children, 
  animation = 'fadeInUp', 
  duration = '1s', 
  delay = '0s', 
  threshold = 0.1,
  once = true, // Default is true, animations will only run once
  className = '',
  style = {}
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);
  const { addElement, entries } = useIntersectionObserver({
    threshold,
    rootMargin: '0px 0px -10% 0px' // Slightly before element is in view
  });

  useEffect(() => {
    if (ref.current) {
      addElement(ref.current);
    }
  }, [addElement]);

  useEffect(() => {
    entries.forEach(entry => {
      if (entry.target === ref.current) {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            setHasAnimated(true);
          }
        } else if (!once && !hasAnimated) {
          setIsVisible(false);
        }
      }
    });
  }, [entries, hasAnimated, once]);

  const visibilityState = isVisible || hasAnimated;
  const combinedStyle = {
    ...style,
    opacity: 0 // Start with opacity 0
  };

  // Select the right component based on the animation type
  switch (animation) {
    case 'fadeInLeft':
      return <FadeInLeftDiv ref={ref} className={`${className} animate-on-scroll`} style={combinedStyle} isVisible={visibilityState} duration={duration} delay={delay}>{children}</FadeInLeftDiv>;
    case 'fadeInRight':
      return <FadeInRightDiv ref={ref} className={`${className} animate-on-scroll`} style={combinedStyle} isVisible={visibilityState} duration={duration} delay={delay}>{children}</FadeInRightDiv>;
    case 'fadeInDown':
      return <FadeInDownDiv ref={ref} className={`${className} animate-on-scroll`} style={combinedStyle} isVisible={visibilityState} duration={duration} delay={delay}>{children}</FadeInDownDiv>;
    case 'fadeInUp':
    default:
      return <FadeInUpDiv ref={ref} className={`${className} animate-on-scroll`} style={combinedStyle} isVisible={visibilityState} duration={duration} delay={delay}>{children}</FadeInUpDiv>;
  }
};

export default AnimateOnScroll;

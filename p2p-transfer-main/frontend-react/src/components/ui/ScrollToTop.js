import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiArrowUp } from 'react-icons/fi';

const ScrollButton = styled.button`
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  z-index: 999;
  opacity: ${props => props.visible ? 1 : 0};
  transform: ${props => props.visible ? 'translateY(0)' : 'translateY(20px)'};
  transition: all 0.3s ease;
  
  &:hover {
    background: var(--secondary-color);
    transform: ${props => props.visible ? 'translateY(-5px)' : 'translateY(20px)'};
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  svg {
    font-size: 1.5rem;
  }
`;

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);
  
  return (
    <ScrollButton 
      visible={isVisible} 
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <FiArrowUp />
    </ScrollButton>
  );
};

export default ScrollToTop;

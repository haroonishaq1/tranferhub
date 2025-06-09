import React from 'react';
import styled from 'styled-components';

const ScrollToTopButton = styled.button`
  position: fixed;
  right: 30px;
  bottom: 30px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  z-index: 100;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 25px rgba(37, 99, 235, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ScrollButtons = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  return (
    <ScrollToTopButton onClick={scrollToTop}>
      ↑
    </ScrollToTopButton>
  );
};

export default ScrollButtons;

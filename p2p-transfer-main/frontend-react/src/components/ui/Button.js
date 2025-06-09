import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const ripple = keyframes`
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`;

const waveEffect = keyframes`
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const ButtonWrapper = styled.button`  background: ${props => props.variant === 'primary' 
    ? 'linear-gradient(90deg, var(--primary-color), var(--accent-color))' 
    : props.variant === 'secondary' 
      ? 'transparent'
      : props.variant === 'accent'
        ? 'var(--accent-color)'
        : 'var(--primary-color)'};  background-size: ${props => props.variant === 'primary' ? '200% 100%' : 'auto'};
  animation: ${props => props.variant === 'primary' ? css`${waveEffect} 5s ease infinite` : 'none'};
  color: ${props => props.variant === 'secondary' ? 'var(--primary-color)' : 'white'};
  font-weight: 600;
  padding: ${props => props.size === 'large' 
    ? '1.2rem 3.5rem' 
    : props.size === 'small' 
      ? '0.6rem 1.2rem'
      : '0.8rem 2rem'};
  font-size: ${props => props.size === 'large' 
    ? '1.1rem' 
    : props.size === 'small' 
      ? '0.85rem'
      : '1rem'};
  border-radius: 50px;
  transition: all 0.3s ease;    box-shadow: ${props => props.variant === 'primary' 
    ? '0 5px 15px rgba(2, 56, 80, 0.3)' 
    : props.variant === 'secondary' 
      ? 'none'
      : '0 5px 15px rgba(0, 0, 0, 0.1)'};
  border: ${props => props.variant === 'secondary' ? '2px solid var(--primary-color)' : 'none'};
  position: relative;
  overflow: hidden;
  z-index: 1;
  cursor: pointer;
  outline: none;
  
  /* Video-like interaction effect */
  background-size: 200% 100%;
  
  &:hover {
    transform: ${props => props.noTransform ? 'none' : 'translateY(-3px)'};    box-shadow: ${props => props.variant === 'primary' 
      ? '0 7px 20px rgba(2, 56, 80, 0.4)' 
      : props.variant === 'secondary' 
        ? '0 2px 5px rgba(0, 0, 0, 0.1)'
        : '0 7px 20px rgba(0, 0, 0, 0.15)'};
    background-size: 200% 100%;
    animation: ${css`${shimmer} 3s infinite linear`};
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg, 
      transparent, 
      rgba(255, 255, 255, 0.2), 
      transparent
    );
    transition: all 0.6s ease;
    z-index: -1;
  }
    &:hover::before {
    left: 100%;
    box-shadow: 0 0 20px rgba(43, 127, 142, 0.8);
  }
  
  /* Ripple effect on click */
  .ripple {
    position: absolute;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    transform: scale(0);
    animation: ${ripple} 0.8s linear;
    pointer-events: none;
  }
  
  &:disabled {
    background: #cccccc;
    color: #666666;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
  
  &:disabled::before {
    display: none;
  }
`;

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  noTransform = false,
  ...props 
}) => {
  // Handle ripple effect
  const handleClick = (e) => {
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      button.removeChild(ripple);
    }, 800);
    
    // Call the original onClick if it exists
    if (props.onClick) {
      props.onClick(e);
    }
  };
  
  return (
    <ButtonWrapper 
      variant={variant} 
      size={size} 
      noTransform={noTransform}
      onClick={handleClick}
      {...props}
    >
      {children}
    </ButtonWrapper>
  );
};

export default Button;

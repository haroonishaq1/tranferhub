import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: ${props => props.fullScreen ? '0' : '2rem'};
  height: ${props => props.fullScreen ? '100vh' : 'auto'};
`;

const Spinner = styled.div`
  width: ${props => props.size === 'small' ? '30px' : props.size === 'large' ? '60px' : '40px'};
  height: ${props => props.size === 'small' ? '30px' : props.size === 'large' ? '60px' : '40px'};  border: ${props => props.size === 'small' ? '3px' : props.size === 'large' ? '5px' : '4px'} solid rgba(0, 0, 0, 0.1);
  border-top: ${props => props.size === 'small' ? '3px' : props.size === 'large' ? '5px' : '4px'} solid #000000;
  border-radius: 50%;
  animation: ${css`${spin} 1s linear infinite`};
  margin-bottom: ${props => props.text ? '1rem' : '0'};
`;

const ProgressDots = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Dot = styled.div`  width: ${props => props.size === 'small' ? '8px' : props.size === 'large' ? '15px' : '10px'};
  height: ${props => props.size === 'small' ? '8px' : props.size === 'large' ? '15px' : '10px'};
  background-color: #000000;
  border-radius: 50%;
  animation: ${css`${pulse} 1.5s infinite ease-in-out`};
  animation-delay: ${props => props.delay || '0s'};
`;

const LoadingText = styled.p`
  color: #4B5563;
  font-size: ${props => props.size === 'small' ? '0.9rem' : props.size === 'large' ? '1.2rem' : '1rem'};
  margin-top: ${props => props.type === 'dots' ? '1rem' : '0'};
`;

/**
 * Loading component with different variants
 * @param {Object} props Component props
 * @param {string} props.type Type of loader ('spinner' or 'dots')
 * @param {string} props.size Size of loader ('small', 'medium', or 'large')
 * @param {string} props.text Text to display below the loader
 * @param {boolean} props.fullScreen Whether to make the loader take up the full screen
 */
const Loading = ({ type = 'spinner', size = 'medium', text = '', fullScreen = false }) => {
  return (
    <LoadingContainer fullScreen={fullScreen}>
      {type === 'spinner' ? (
        <Spinner size={size} text={text} />
      ) : (
        <ProgressDots>
          <Dot size={size} delay="0s" />
          <Dot size={size} delay="0.2s" />
          <Dot size={size} delay="0.4s" />
        </ProgressDots>
      )}
      
      {text && <LoadingText size={size} type={type}>{text}</LoadingText>}
    </LoadingContainer>
  );
};

export default Loading;

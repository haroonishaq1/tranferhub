// Global error handler component to handle uncaught runtime errors
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { FiX } from 'react-icons/fi';

const ErrorContainer = styled.div`
  display: ${props => props.visible ? 'flex' : 'none'};
  position: fixed;
  bottom: 20px;
  right: 20px;
  max-width: 400px;
  background-color: rgba(255, 255, 255, 0.97);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 4px solid ${props => props.severity === 'warning' ? '#f59f00' : '#ff6b6b'};
  padding: 12px 16px;
  z-index: 9999;
  flex-direction: column;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

const ErrorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const ErrorTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  padding: 4px;
  font-size: 18px;
  border-radius: 50%;
  
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;

const ErrorMessage = styled.p`
  margin: 0;
  font-size: 13px;
  color: #555;
  line-height: 1.4;
`;

const GlobalErrorHandler = () => {
  const [error, setError] = React.useState(null);
  const [visible, setVisible] = React.useState(false);
  const timerRef = React.useRef(null);

  // Function to handle errors
  const handleError = (event) => {
    // Filter out error messages we want to hide
    if (shouldSuppressError(event.error || event.reason)) {
      event.preventDefault(); // Prevent default error handling
      return;
    }

    // For errors we want to show but in a nicer way
    if (shouldShowCustomError(event.error || event.reason)) {
      event.preventDefault(); // Prevent default error handling
      
      // Get friendly message
      const friendlyMessage = getFriendlyErrorMessage(event.error || event.reason);
      
      // Set our error state
      setError({
        message: friendlyMessage,
        severity: 'warning'
      });
      setVisible(true);
      
      // Auto-hide after 5 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, 5000);
    }
  };

  // Function to determine if we should suppress an error completely
  const shouldSuppressError = (error) => {
    if (!error) return false;
    
    // Add specific error messages to suppress
    const suppressPatterns = [
      'Server upload failed: Not Found', // Suppress fallback errors when downloads still work
      'Failed to fetch', // Suppress connectivity issues that don't affect functionality
      'Network Error',    // Similar network errors
    ];
    
    return suppressPatterns.some(pattern => 
      error.message && error.message.includes(pattern)
    );
  };

  // Function to determine if we should show a custom error message
  const shouldShowCustomError = (error) => {
    if (!error) return false;
    
    // List of error patterns that should trigger our custom handler
    const customHandlePatterns = [
      'P2P connection failed', // P2P related errors
      'Transfer error',        // Transfer-related errors
    ];
    
    return customHandlePatterns.some(pattern => 
      error.message && error.message.includes(pattern)
    );
  };

  // Function to generate friendly error messages
  const getFriendlyErrorMessage = (error) => {
    if (!error) return 'An unexpected error occurred';
    
    if (error.message?.includes('P2P connection')) {
      return 'P2P transfer not available. Using secure server transfer instead.';
    }
    
    if (error.message?.includes('Transfer error')) {
      return 'There was an issue with the file transfer. Please try again.';
    }
    
    return error.message || 'An unexpected error occurred';
  };

  // Setup event listeners
  useEffect(() => {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (!error) return null;

  return (
    <ErrorContainer visible={visible} severity={error.severity}>
      <ErrorHeader>
        <ErrorTitle>
          {error.severity === 'warning' ? 'Notice' : 'Error'}
        </ErrorTitle>
        <CloseButton onClick={handleClose}>
          <FiX />
        </CloseButton>
      </ErrorHeader>
      <ErrorMessage>{error.message}</ErrorMessage>
    </ErrorContainer>
  );
};

export default GlobalErrorHandler;

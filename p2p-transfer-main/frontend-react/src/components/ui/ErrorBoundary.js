import React from 'react';
import styled from 'styled-components';
import { FiAlertTriangle } from 'react-icons/fi';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  border: 2px dashed #ff6b6b;
  border-radius: 10px;
  background: rgba(255, 107, 107, 0.05);
  margin: 1rem 0;
`;

const ErrorIcon = styled.div`
  font-size: 3rem;
  color: #ff6b6b;
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h3`
  color: #ff6b6b;
  margin-bottom: 0.5rem;
`;

const ErrorMessage = styled.p`
  color: #666;
  margin-bottom: 1rem;
`;

const RetryButton = styled.button`
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  
  &:hover {
    background: #ff5252;
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorIcon>
            <FiAlertTriangle />
          </ErrorIcon>
          <ErrorTitle>Something went wrong</ErrorTitle>
          <ErrorMessage>
            {this.state.error?.message?.includes('sendWithPromise') 
              ? 'PDF viewer encountered an error. Please try refreshing the page or download the file instead.'
              : 'An unexpected error occurred. Please try again.'}
          </ErrorMessage>
          <RetryButton onClick={this.handleRetry}>
            Try Again
          </RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React, { useState } from 'react';
import styled from 'styled-components';
import { FiLink, FiCopy, FiCheckCircle } from 'react-icons/fi';

const TransferStatusSection = styled.section`
  background: #FFFFFF;
  padding: 100px 0;
  
  @media (max-width: 768px) {
    padding: 70px 0;
  }
  
  @media (max-width: 480px) {
    padding: 50px 0;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  
  @media (max-width: 480px) {
    padding: 0 15px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 1.5rem;
  color: #000000;
  
  @media (max-width: 768px) {
    font-size: 2.2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.8rem;
    margin-bottom: 1rem;
  }
`;

const SectionSubtitle = styled.p`
  font-size: 1.1rem;
  text-align: center;
  max-width: 700px;
  margin: 0 auto 4rem;
  color: #4B5563;
  opacity: 0.8;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin: 0 auto 3rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
    margin: 0 auto 2rem;
  }
`;

const StatusContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 20px;
  padding: 3rem;
  box-shadow: var(--shadow-medium);
  
  @media (max-width: 768px) {
    padding: 2rem;
  }
  
  @media (max-width: 480px) {
    padding: 1.5rem;
    border-radius: 15px;
  }
`;

const TransferComplete = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2.5rem;
  
  @media (max-width: 768px) {
    margin-bottom: 2rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 1.5rem;
  }
`;

const SuccessIcon = styled.div`  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(17, 17, 17, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    width: 70px;
    height: 70px;
    margin-bottom: 1.2rem;
  }
  
  @media (max-width: 480px) {
    width: 60px;
    height: 60px;
    margin-bottom: 1rem;
  }
    svg {
    font-size: 2.5rem;
    color: var(--accent-color, #111111);
    
    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
    
    @media (max-width: 480px) {
      font-size: 1.8rem;
    }
  }
`;

const SuccessTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: var(--primary-color, #000000);
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.4rem;
    margin-bottom: 0.4rem;
  }
`;

const SuccessMessage = styled.p`
  font-size: 1.1rem;
  color: #4B5563;
  opacity: 0.8;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    text-align: center;
  }
`;

const LinkContainer = styled.div`
  background: #F9FAFB;
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.2rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    margin-bottom: 1.2rem;
    border-radius: 8px;
  }
`;

const LinkTitle = styled.h4`
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #4B5563;
  display: flex;
  align-items: center;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 0.8rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 0.7rem;
  }
  
  svg {
    margin-right: 0.5rem;
    color: var(--primary-color);
    
    @media (max-width: 480px) {
      margin-right: 0.4rem;
    }
  }
`;

const LinkBox = styled.div`
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0.8rem 1rem;
  box-shadow: var(--shadow-light);
  
  @media (max-width: 768px) {
    padding: 0.7rem 0.9rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.6rem 0.8rem;
    border-radius: 6px;
    flex-wrap: wrap;
  }
`;

const LinkText = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.5rem;
  color: #4B5563;
  font-size: 1rem;
  opacity: 0.9;
  
  @media (max-width: 768px) {
    padding: 0.4rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.3rem;
    font-size: 0.9rem;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  &:focus {
    outline: none;
  }
`;

const CopyButton = styled.button`
  background: transparent;
  display: flex;
  align-items: center;
  padding: 0.5rem;
  color: ${props => props.copied ? 'var(--accent-color, #111111)' : 'var(--primary-color, #000000)'};
  transition: color 0.3s ease;
  
  @media (max-width: 480px) {
    padding: 0.4rem;
    margin-left: auto;
  }
  
  svg {
    font-size: 1.2rem;
    
    @media (max-width: 480px) {
      font-size: 1.1rem;
    }
  }
`;

const ExpiryInfo = styled.div`
  background: rgba(17, 17, 17, 0.05);
  border-radius: 10px;
  padding: 1.5rem;
  border-left: 4px solid var(--accent-color, #111111);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
`;

const ExpiryTitle = styled.h4`
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #000000;
`;

const ExpiryDescription = styled.p`
  font-size: 1rem;
  color: #4B5563;
  opacity: 0.8;
`;

const TransferStatus = () => {
  const [copied, setCopied] = useState(false);
  const downloadLink = "https://transferhub.com/d/file123456789";
  
  const handleCopy = () => {
    navigator.clipboard.writeText(downloadLink);
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  return (
    <TransferStatusSection>
      <Container>
        <SectionTitle>Transfer Status</SectionTitle>
        <SectionSubtitle>
          Your files have been uploaded securely. Share the link below with your recipient to allow them to download the files.
        </SectionSubtitle>
        
        <StatusContainer className="glassmorphic">
          <TransferComplete>
            <SuccessIcon>
              <FiCheckCircle />
            </SuccessIcon>
            <SuccessTitle>Transfer Complete!</SuccessTitle>
            <SuccessMessage>Your files have been successfully uploaded</SuccessMessage>
          </TransferComplete>
          
          <LinkContainer>
            <LinkTitle>
              <FiLink />
              Download Link
            </LinkTitle>
            <LinkBox>
              <LinkText type="text" value={downloadLink} readOnly />
              <CopyButton onClick={handleCopy} copied={copied}>
                {copied ? <FiCheckCircle /> : <FiCopy />}
              </CopyButton>
            </LinkBox>
          </LinkContainer>
          
          <ExpiryInfo>
            <ExpiryTitle>Link Expiry</ExpiryTitle>
            <ExpiryDescription>
              This link will expire in 7 days or after the first download, whichever comes first.
            </ExpiryDescription>
          </ExpiryInfo>
        </StatusContainer>
      </Container>
    </TransferStatusSection>
  );
};

export default TransferStatus;

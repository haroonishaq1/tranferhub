import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FiLock, FiShield, FiServer, FiAlertCircle } from 'react-icons/fi';
import Button from '../ui/Button';
import AnimateOnScroll from '../../utils/scrollAnimationObserver';

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

const SecuritySection = styled.section`
  background: #FFFFFF; /* Updated to match theme */
  padding: 100px 0;
  width: 100%;
  overflow-x: hidden;
  
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
    margin: 0 auto 2.5rem;
  }
`;

const SecurityContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const TextContent = styled.div`
  padding-right: 2rem;
  
  @media (max-width: 992px) {
    padding-right: 0;
    text-align: center;
  }
`;

const SecurityTitle = styled.h3`
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: #000000;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-bottom: 1.2rem;
  }
`;

const SecurityDescription = styled.p`
  font-size: 1.1rem;
  margin-bottom: 2rem;
  color: #4B5563;
  opacity: 0.8;
  line-height: 1.7;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
    line-height: 1.6;
  }
`;

const SecurityFeatures = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
  
  @media (max-width: 992px) {
    justify-items: center;
  }
`;

const SecurityFeature = styled.div`
  display: flex;
  align-items: flex-start;
  
  @media (max-width: 992px) {
    text-align: left;
  }
`;

const IconBox = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background: ${props => props.color || 'rgba(0, 0, 0, 0.1)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  flex-shrink: 0;
  
  @media (max-width: 480px) {
    width: 42px;
    height: 42px;
  }
  
  svg {
    font-size: 1.5rem;
    color: ${props => props.iconColor || '#000000'};
    
    @media (max-width: 480px) {
      font-size: 1.3rem;
    }
  }
`;

const FeatureTextBox = styled.div`
  @media (max-width: 480px) {
    flex: 1;
  }
`;

const FeatureTitle = styled.h4`
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  color: #000000;
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 0.3rem;
  }
`;

const FeatureDescription = styled.p`
  font-size: 0.95rem;
  color: #4B5563;
  opacity: 0.8;
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    line-height: 1.4;
  }
`;

const VisualContent = styled.div`
  position: relative;
  
  @media (max-width: 992px) {
    display: none;
  }
`;

const MobileSecurityVisual = styled.div`
  display: none;
  
  @media (max-width: 992px) {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 2rem 0;
  }
  
  @media (max-width: 480px) {
    margin: 1.5rem 0;
  }
`;

const SecurityImage = styled.div`
  width: 100%;
  height: 450px;
  background-color: #f0f0f0;
  border-radius: 20px;
  background-image: linear-gradient(135deg, #E5E7EB 0%, #4B5563 100%);
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  
  &::after {
    content: '';
    position: absolute;
    width: 150%;
    height: 150%;
    top: -25%;
    left: -25%;
    background: radial-gradient(rgba(17, 17, 17, 0.1) 8%, transparent 8%);
    background-position: 0 0;
    background-size: 30px 30px;
    opacity: 0.5;
  }
`;

const SecuredBadge = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: #111111;
  color: #FFFFFF;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.5rem 1rem;
  border-radius: 50px;
  display: flex;
  align-items: center;
  z-index: 1;
  
  svg {
    margin-right: 0.5rem;
  }
`;

const LockIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  z-index: 1;
  
  svg {
    font-size: 3.5rem;
    color: #000000;
  }
`;

const CircleBg = styled.div`
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 0;
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

const OuterCircleBg = styled.div`
  position: absolute;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  border: 1px dashed rgba(17, 17, 17, 0.3);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 0;
`;

const ButtonsWrapper = styled.div`
  display: flex;
  gap: 1rem;
  
  @media (max-width: 992px) {
    justify-content: center;
  }
  
  @media (max-width: 576px) {
    flex-direction: column;
    width: 100%;
    
    button {
      width: 100%;
      margin-bottom: 0.5rem;
    }
  }
`;

const MobileLockIcon = styled.div`
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  animation: ${pulse} 2.5s ease-in-out infinite;
  
  svg {
    font-size: 3rem;
    color: #000000;
    
    @media (max-width: 480px) {
      font-size: 2.5rem;
    }
  }
`;

const Security = () => {
  return (
    <SecuritySection id="security">
      <Container>
        <AnimateOnScroll animation="fadeInDown" duration="0.8s">
          <SectionTitle>Enterprise-Grade Security</SectionTitle>
        </AnimateOnScroll>
        <AnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.2s">
          <SectionSubtitle>
            We've built TransferHub with security as a top priority, ensuring your files are protected at every step of the transfer process.
          </SectionSubtitle>
        </AnimateOnScroll>
        
        <SecurityContent>
          <AnimateOnScroll animation="fadeInLeft" duration="0.8s" delay="0.3s">
            <TextContent>
              <SecurityTitle>Your Data, Protected</SecurityTitle>
              <SecurityDescription>
                TransferHub uses cutting-edge security technologies to ensure your files remain private and secure from end to end. We implement multiple layers of protection to safeguard your sensitive information.
              </SecurityDescription>
                <SecurityFeatures>
                <SecurityFeature>
                  <IconBox color="rgba(0, 0, 0, 0.1)" iconColor="#000000">
                    <FiLock />
                  </IconBox>
                  <FeatureTextBox>
                    <FeatureTitle>End-to-End Encryption</FeatureTitle>
                    <FeatureDescription>
                      Files are encrypted before leaving your device and can only be decrypted by the recipient.
                    </FeatureDescription>
                  </FeatureTextBox>
                </SecurityFeature>
                
                <SecurityFeature>
                  <IconBox color="rgba(17, 17, 17, 0.1)" iconColor="#111111">
                    <FiShield />
                  </IconBox>
                  <FeatureTextBox>
                    <FeatureTitle>Zero-Knowledge Privacy</FeatureTitle>
                    <FeatureDescription>
                      We cannot access or view the contents of your files at any time.
                    </FeatureDescription>
                  </FeatureTextBox>
                </SecurityFeature>
                  <SecurityFeature>
                  <IconBox color="rgba(75, 85, 99, 0.1)" iconColor="#4B5563">
                    <FiServer />
                  </IconBox>
                  <FeatureTextBox>
                    <FeatureTitle>Secure Infrastructure</FeatureTitle>
                    <FeatureDescription>
                      Files are stored in ISO 27001 certified data centers with 24/7 security.
                    </FeatureDescription>
                  </FeatureTextBox>
                </SecurityFeature>
                
                <SecurityFeature>
                  <IconBox color="rgba(229, 231, 235, 0.3)" iconColor="#111111">
                    <FiAlertCircle />
                  </IconBox>
                  <FeatureTextBox>
                    <FeatureTitle>Automatic Deletion</FeatureTitle>
                    <FeatureDescription>
                      Files are automatically deleted once downloaded or expired.
                    </FeatureDescription>
                  </FeatureTextBox>
                </SecurityFeature>
              </SecurityFeatures>
              
              {/* Add mobile visualization for security */}
              <MobileSecurityVisual>
                <MobileLockIcon>
                  <FiLock />
                </MobileLockIcon>
              </MobileSecurityVisual>
              
              <ButtonsWrapper>
                <Button variant="primary" size="large">
                  Learn More
                </Button>
                <Button variant="secondary">
                  Security Whitepaper
                </Button>
              </ButtonsWrapper>
            </TextContent>
          </AnimateOnScroll>
          
          <AnimateOnScroll animation="fadeInRight" duration="0.8s" delay="0.5s">
            <VisualContent>
              <SecurityImage>
                <SecuredBadge>
                  <FiShield /> Secured
                </SecuredBadge>
                <OuterCircleBg />
                <CircleBg />
                <LockIcon>
                  <FiLock />
                </LockIcon>
              </SecurityImage>
            </VisualContent>
          </AnimateOnScroll>
        </SecurityContent>
      </Container>
    </SecuritySection>
  );
};

export default Security;

import React from 'react';
import styled from 'styled-components';
import { FiShield, FiMaximize2, FiClock, FiLayers } from 'react-icons/fi';
import SimpleAnimateOnScroll from '../../utils/simpleAnimateOnScroll';

const FeaturesSection = styled.section`
  background: #FFFFFF;
  padding: 100px 0;
  position: relative;
  overflow: hidden;
  width: 100%;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100px;
    width: 200px;
    height: 100%;
    background: linear-gradient(90deg, rgba(17, 17, 17, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
    z-index: 0;
  }
  
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
  opacity: 0.9;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    margin: 0 auto 3rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
    margin: 0 auto 2rem;
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 2rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const FeatureCard = styled.div`
  padding: 2.5rem 2rem;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background-color: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 1;
  border: 1px solid #E5E7EB;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 5px;
    height: 0;
    background: linear-gradient(to bottom, #000000, #111111);
    border-top-left-radius: 15px;
    border-bottom-left-radius: 15px;
    transition: height 0.3s ease-out;
    z-index: -1;
  }
  
  &:hover {
    transform: translateY(-10px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
    
    &::before {
      height: 100%;
    }
  }
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    
    &:hover {
      transform: translateY(-5px);
    }
  }
  
  @media (max-width: 480px) {
    padding: 1.8rem 1.2rem;
  }
`;

const IconContainer = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #000000 0%, #111111 100%);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  
  svg {
    font-size: 2rem;
    color: white;
  }
  
  @media (max-width: 768px) {
    width: 70px;
    height: 70px;
    margin-bottom: 1.2rem;
    
    svg {
      font-size: 1.8rem;
    }
  }
  
  @media (max-width: 480px) {
    width: 60px;
    height: 60px;
    
    svg {
      font-size: 1.6rem;
    }
  }
`;

const FeatureTitle = styled.h3`
  font-size: 1.4rem;
  margin-bottom: 1rem;
  color: #000000;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-bottom: 0.8rem;
  }
`;

const FeatureDescription = styled.p`
  font-size: 1rem;
  color: #4B5563;
  opacity: 0.9;
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
  }
`;

const Features = () => {
  const features = [
    {
      icon: <FiShield />,
      title: 'End-to-End Encryption',
      description: 'Your files are encrypted before they leave your device and can only be decrypted by the recipient.'
    },
    {
      icon: <FiMaximize2 />,
      title: 'No File Size Limit',
      description: 'Transfer files of any size, from small documents to large video files, all with the same ease.'
    },
    {
      icon: <FiClock />,
      title: 'Auto Expiry',
      description: 'Files are automatically deleted after download or after a time period that you specify.'
    },
    {
      icon: <FiLayers />,
      title: 'Cross-Platform Support',
      description: 'Works on all devices and browsers, ensuring a seamless experience for you and your recipients.'
    }
  ];
  return (
    <FeaturesSection id="features">
      <Container>
        <SimpleAnimateOnScroll animation="fadeInDown" duration="0.8s">
          <SectionTitle>Why Choose TransferHub</SectionTitle>
        </SimpleAnimateOnScroll>
        <SimpleAnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.2s">
          <SectionSubtitle>
            Our platform offers a combination of security, ease of use, and powerful features that make file sharing simple and secure.
          </SectionSubtitle>
        </SimpleAnimateOnScroll>
        
        <FeaturesGrid>
          {features.map((feature, index) => (
            <SimpleAnimateOnScroll 
              key={index} 
              animation="fadeInLeft"
              duration="1s" 
              delay={`${0.3 + index * 0.4}s`}
              threshold={0.05}
              once={true}
            >
              <FeatureCard className="neumorphic">
                <IconContainer>
                  {feature.icon}
                </IconContainer>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </FeatureCard>
            </SimpleAnimateOnScroll>
          ))}
        </FeaturesGrid>
      </Container>
    </FeaturesSection>
  );
};

export default Features;

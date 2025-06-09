import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import Button from '../ui/Button';
import { FiCheck, FiX } from 'react-icons/fi';
import AnimateOnScroll from '../../utils/scrollAnimationObserver';

const PricingSection = styled.section`
  background: #FFFFFF;
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

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 3rem;
  
  @media (max-width: 768px) {
    margin-bottom: 2.5rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 2rem;
    flex-direction: column;
    gap: 1rem;
  }
`;

const ToggleText = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: ${props => props.active ? '#000000' : '#4B5563'};
  opacity: ${props => props.active ? 1 : 0.7};
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
  }
`;

const ToggleSwitch = styled.div`
  width: 60px;
  height: 30px;
  background: ${props => props.monthly ? '#000000' : '#111111'};
  margin: 0 1rem;
  border-radius: 15px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  &::after {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    top: 3px;
    left: ${props => props.monthly ? '3px' : '33px'};
    transition: all 0.3s ease;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
`;

const PricingCardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1100px;
  margin: 0 auto;
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  
  @media (max-width: 768px) {
    gap: 1.5rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const PricingCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  box-shadow: ${props => props.popular ? '0 8px 30px rgba(0, 0, 0, 0.1)' : '0 5px 15px rgba(0, 0, 0, 0.05)'};
  transform: ${props => props.popular ? 'scale(1.05)' : 'scale(1)'};
  border: ${props => props.popular ? '2px solid #111111' : 'none'};
  z-index: ${props => props.popular ? 1 : 0};
  
  &:hover {
    transform: ${props => props.popular ? 'scale(1.08)' : 'scale(1.03)'};
    box-shadow: var(--shadow-medium);
  }
  
  @media (max-width: 992px) {
    transform: ${props => props.popular ? 'scale(1.03)' : 'scale(1)'};
    
    &:hover {
      transform: ${props => props.popular ? 'scale(1.05)' : 'scale(1.02)'};
    }
  }
  
  @media (max-width: 768px) {
    transform: scale(1);
    padding: 2.5rem 1.5rem;
    
    &:hover {
      transform: scale(1.02);
    }
  }
  
  @media (max-width: 480px) {
    padding: 2rem 1.2rem;
  }
`;

const PopularBadge = styled.div`
  position: absolute;
  top: 20px;
  right: -35px;
  background: #111111;
  color: #FFFFFF;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.5rem 3rem;
  transform: rotate(45deg);
`;

const PlanIcon = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: ${props => props.popular ? 'rgba(17, 17, 17, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    font-size: 2rem;
    color: ${props => props.popular ? '#111111' : '#000000'};
  }
  
  @media (max-width: 768px) {
    width: 60px;
    height: 60px;
    margin: 0 auto 1.2rem;
    
    svg {
      font-size: 1.75rem;
    }
  }
  
  @media (max-width: 480px) {
    width: 55px;
    height: 55px;
    margin: 0 auto 1rem;
  }
`;

const PlanName = styled.h3`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #000000;
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
    margin-bottom: 0.8rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.2rem;
  }
`;

const PlanPrice = styled.div`
  margin-bottom: 2rem;
`;

const Price = styled.h4`
  font-size: 3rem;
  font-weight: 700;
  color: #000000;
  
  span {
    font-size: 1.2rem;
    font-weight: 500;
    opacity: 0.8;
  }
`;

const BillingCycle = styled.p`
  font-size: 0.9rem;
  color: #4B5563;
  opacity: 0.7;
`;

const FeaturesList = styled.ul`
  list-style: none;
  padding: 0;
  margin-bottom: 2.5rem;
`;

const Feature = styled.li`
  display: flex;
  align-items: center;
  padding: 0.8rem 0;
  font-size: 0.95rem;
  color: #4B5563;
  border-bottom: 1px solid #E5E7EB;
  
  &:last-child {
    border-bottom: none;
  }
  
  svg {
    margin-right: 0.8rem;
    font-size: 1.2rem;
    color: ${props => props.available ? '#111111' : '#e74c3c'};
    flex-shrink: 0;
  }
`;

const Pricing = () => {
  const [monthly, setMonthly] = useState(true);
  
  const plans = [
    {
      name: 'Free',
      icon: '🔄',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        { text: 'Up to 2GB per transfer', available: true },
        { text: 'Files available for 7 days', available: true },
        { text: 'Basic encryption', available: true },
        { text: 'Email support', available: true },
        { text: 'Password protection', available: false },
        { text: 'Delivery confirmation', available: false },
      ],
      popular: false,
    },
    {
      name: 'Pro',
      icon: '⚡',
      monthlyPrice: 9.99,
      yearlyPrice: 7.99,
      features: [
        { text: 'Up to 20GB per transfer', available: true },
        { text: 'Files available for 30 days', available: true },
        { text: 'End-to-end encryption', available: true },
        { text: 'Priority email support', available: true },
        { text: 'Password protection', available: true },
        { text: 'Delivery confirmation', available: true },
      ],
      popular: true,
    },
    {
      name: 'Business',
      icon: '🏢',
      monthlyPrice: 29.99,
      yearlyPrice: 24.99,
      features: [
        { text: 'Unlimited transfer size', available: true },
        { text: 'Files available for 90 days', available: true },
        { text: 'Advanced encryption options', available: true },
        { text: '24/7 priority support', available: true },
        { text: 'Custom branding', available: true },
        { text: 'Team management', available: true },
      ],
      popular: false,
    },
  ];
    return (
    <PricingSection id="pricing">
      <Container>
        <AnimateOnScroll animation="fadeInDown" duration="0.8s">
          <SectionTitle>Simple, Transparent Pricing</SectionTitle>
        </AnimateOnScroll>
        <AnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.2s">
          <SectionSubtitle>
            Choose the plan that fits your needs. No hidden fees or complicated pricing structures.
          </SectionSubtitle>
        </AnimateOnScroll>
        
        <AnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.3s">
          <ToggleContainer>
            <ToggleText active={monthly}>Monthly</ToggleText>
            <ToggleSwitch 
              monthly={monthly} 
              onClick={() => setMonthly(!monthly)}
            />
            <ToggleText active={!monthly}>Yearly</ToggleText>
          </ToggleContainer>
        </AnimateOnScroll>
        
        <PricingCardsContainer>
          {plans.map((plan, index) => (
            <AnimateOnScroll 
              key={index} 
              animation={index === 0 ? "fadeInLeft" : (index === plans.length - 1 ? "fadeInRight" : "fadeInUp")}
              duration="0.8s" 
              delay={`${0.4 + index * 0.2}s`}
            >
              <PricingCard popular={plan.popular}>
                {plan.popular && <PopularBadge>Most Popular</PopularBadge>}
              
              <PlanIcon popular={plan.popular}>
                <span role="img" aria-label={plan.name}>{plan.icon}</span>
              </PlanIcon>
              <PlanName>{plan.name}</PlanName>
              
              <PlanPrice>
                <Price>
                  ${monthly ? plan.monthlyPrice : plan.yearlyPrice}
                  <span>/mo</span>
                </Price>
                {!monthly && plan.monthlyPrice > 0 && (
                  <BillingCycle>Billed annually (save {Math.round(((plan.monthlyPrice - plan.yearlyPrice) / plan.monthlyPrice) * 100)}%)</BillingCycle>
                )}
              </PlanPrice>
              
              <FeaturesList>
                {plan.features.map((feature, featIndex) => (
                  <Feature key={featIndex} available={feature.available}>
                    {feature.available ? <FiCheck /> : <FiX />}
                    {feature.text}
                  </Feature>
                ))}
              </FeaturesList>
              
              <Button 
                variant={plan.popular ? 'accent' : 'primary'}
                size={plan.popular ? 'large' : 'medium'}
              >                {plan.monthlyPrice === 0 ? 'Get Started' : 'Choose Plan'}
              </Button>
            </PricingCard>
            </AnimateOnScroll>
          ))}
        </PricingCardsContainer>
      </Container>
    </PricingSection>
  );
};

export default Pricing;

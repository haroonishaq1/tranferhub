import React from 'react';
import styled from 'styled-components';
import { FiMail, FiPhone, FiMapPin, FiGithub, FiTwitter, FiLinkedin, FiFacebook } from 'react-icons/fi';
import AnimateOnScroll from '../../utils/scrollAnimationObserver';

const FooterContainer = styled.footer`
  background: #000000; /* Changed to black background */
  color: #FFFFFF;
  padding: 80px 0 30px;
  width: 100%;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    padding: 60px 0 30px;
  }
  
  @media (max-width: 480px) {
    padding: 50px 0 25px;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 3rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 2.5rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;
    gap: 2rem 1.5rem;
    padding: 0 15px;
  }
  
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
  
  @media (max-width: 400px) {
    margin-bottom: 2rem;
    align-items: center;
  }
`;

const FooterLogo = styled.div`
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
    margin-bottom: 1.2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  
  span {
    background: linear-gradient(90deg, #ffffff, var(--accent-color));
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const FooterDescription = styled.p`
  font-size: 0.95rem;
  line-height: 1.7;
  opacity: 0.8;
  margin-bottom: 1.5rem;
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 1.2rem;
  }
`;

const FooterTitle = styled.h4`
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  position: relative;
  color: #FFFFFF;
  font-weight: 600;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 1.3rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 1.2rem;
  }
  
  @media (max-width: 400px) {
    &::after {
      left: 50%;
      transform: translateX(-50%);
    }
  }
    &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -10px;
    width: 30px;
    height: 2px;
    background: #111111; /* Updated accent color */
  }
`;

const FooterLinks = styled.ul`
  list-style: none;
  padding: 0;
  
  @media (max-width: 400px) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;

const FooterLink = styled.li`
  margin-bottom: 0.8rem;
  
  @media (max-width: 480px) {
    margin-bottom: 0.7rem;
  }    a {
    color: #FFFFFF;
    opacity: 0.8;
    transition: all 0.3s ease;
    font-size: 0.95rem;
    
    @media (max-width: 480px) {
      font-size: 0.9rem;
    }
    
    &:hover {
      opacity: 1;
      color: #E5E7EB;
      padding-left: 5px;
    }
  }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  
  @media (max-width: 480px) {
    margin-bottom: 0.8rem;
  }
  
  @media (max-width: 400px) {
    justify-content: center;
  }
    svg {
    font-size: 1.2rem;
    margin-right: 1rem;
    color: #E5E7EB;
    
    @media (max-width: 480px) {
      font-size: 1.1rem;
      margin-right: 0.8rem;
    }
  }
  
  span {
    font-size: 0.95rem;
    opacity: 0.8;
    color: #FFFFFF;
    
    @media (max-width: 480px) {
      font-size: 0.9rem;
    }
  }
`;

const SocialIcons = styled.div`
  display: flex;
  margin-top: 1.5rem;
  
  @media (max-width: 400px) {
    justify-content: center;
  }
`;

const SocialIcon = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #E5E7EB; /* Updated to border/lines color */
  margin-right: 0.8rem;
  transition: all 0.3s ease;
  color: #FFFFFF; /* Updated for dark background */
  border: 1px solid #333333;
  
  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
    margin-right: 0.6rem;
  }
    &:hover {
    background: #E5E7EB; /* Light background on hover */
    color: #000000; /* Black text on light background for contrast */
    transform: translateY(-5px);
  }
  
  svg {
    font-size: 1.2rem;
    
    @media (max-width: 480px) {
      font-size: 1.1rem;
    }
  }
`;

const Copyright = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 25px 20px 0;
  border-top: 1px solid #E5E7EB; /* Updated to border/lines color */
  margin-top: 50px;
  text-align: center;
  
  @media (max-width: 768px) {
    margin-top: 40px;
    padding: 20px 20px 0;
  }
  
  @media (max-width: 480px) {
    margin-top: 30px;
    padding: 15px 15px 0;
  }
  
  p {
    font-size: 0.9rem;
    opacity: 0.7;
    
    @media (max-width: 480px) {
      font-size: 0.85rem;
    }
  }
`;

const Footer = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <AnimateOnScroll animation="fadeInLeft" duration="0.8s">
          <FooterColumn>
            <FooterLogo>
              <span>TransferHub</span>
            </FooterLogo>
            <FooterDescription>
              TransferHub provides secure, fast, and reliable file transfer solutions for individuals and businesses worldwide.
            </FooterDescription>
            <SocialIcons>
              <SocialIcon href="#" aria-label="Twitter">
                <FiTwitter />
              </SocialIcon>
              <SocialIcon href="#" aria-label="Facebook">
                <FiFacebook />
              </SocialIcon>
              <SocialIcon href="#" aria-label="LinkedIn">
                <FiLinkedin />
              </SocialIcon>
              <SocialIcon href="#" aria-label="Github">
                <FiGithub />
              </SocialIcon>
            </SocialIcons>
          </FooterColumn>
        </AnimateOnScroll>
        
        <AnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.2s">
          <FooterColumn>
            <FooterTitle>Quick Links</FooterTitle>
            <FooterLinks>
              <FooterLink><a href="#home">Home</a></FooterLink>
              <FooterLink><a href="#features">Features</a></FooterLink>
              <FooterLink><a href="#pricing">Pricing</a></FooterLink>
              <FooterLink><a href="#security">Security</a></FooterLink>
              <FooterLink><a href="#faq">FAQ</a></FooterLink>
            </FooterLinks>
          </FooterColumn>
        </AnimateOnScroll>

        <AnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.4s">
          <FooterColumn>
            <FooterTitle>Legal</FooterTitle>
            <FooterLinks>
              <FooterLink><a href="/privacy">Privacy Policy</a></FooterLink>
              <FooterLink><a href="/terms">Terms of Service</a></FooterLink>
              <FooterLink><a href="/cookies">Cookie Policy</a></FooterLink>
              <FooterLink><a href="/gdpr">GDPR Compliance</a></FooterLink>
              <FooterLink><a href="/security">Security Policy</a></FooterLink>
            </FooterLinks>
          </FooterColumn>
        </AnimateOnScroll>
        
        <AnimateOnScroll animation="fadeInRight" duration="0.8s" delay="0.6s">
          <FooterColumn>
            <FooterTitle>Contact Us</FooterTitle>
            <ContactItem>
              <FiMapPin />
              <span>123 Innovation Drive, Tech City, TC 10101</span>
            </ContactItem>
            <ContactItem>
              <FiPhone />
              <span>+1 (555) 123-4567</span>
            </ContactItem>
            <ContactItem>
              <FiMail />
              <span>support@transferhub.com</span>
            </ContactItem>
          </FooterColumn>
        </AnimateOnScroll>
      </FooterContent>
      
      <AnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.8s">
        <Copyright>
          <p>&copy; {new Date().getFullYear()} TransferHub. All rights reserved.</p>
        </Copyright>
      </AnimateOnScroll>
    </FooterContainer>
  );
};

export default Footer;

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import FileTransfer from './FileTransfer';

// Keyframes for animations
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const moveRandomly = keyframes`
  0% { transform: translate(-50%, -50%); }
  20% { transform: translate(calc(-50% + 30px), calc(-50% - 20px)); }
  40% { transform: translate(calc(-50% - 20px), calc(-50% - 40px)); }
  60% { transform: translate(calc(-50% - 30px), calc(-50% + 10px)); }
  80% { transform: translate(calc(-50% + 20px), calc(-50% + 30px)); }
  100% { transform: translate(-50%, -50%); }
`;

const AnimatedCircle = styled.div`
  position: absolute;
  border-radius: 50%;
  background: ${props => props.color || 'rgba(17, 17, 17, 0.04)'};
  width: ${props => props.size || '200px'};
  height: ${props => props.size || '200px'};
  top: ${props => props.top || '20%'};
  left: ${props => props.left || '10%'};
  z-index: 0;
  animation: ${float} ${props => props.duration || '15s'} ease-in-out infinite;
  opacity: ${props => props.opacity || '0.5'};
  filter: blur(${props => props.blur || '8px'});
`;

const Particle = styled.div`
  position: absolute;
  background-color: ${props => props.color || 'rgba(17, 17, 17, 0.1)'};
  border-radius: 50%;
  width: ${props => props.size || '10px'};
  height: ${props => props.size || '10px'};
  top: ${props => props.top || '50%'};
  left: ${props => props.left || '50%'};
  animation: ${moveRandomly} ${props => props.duration || '8s'} ease-in-out infinite;
  animation-delay: ${props => props.delay || '0s'};
  opacity: ${props => props.opacity || '0.7'};
  will-change: transform;
  transform: translate(-50%, -50%);
`;

const Container = styled.div`
  position: relative;
  width: 100vw;
  min-height: 100vh;
  background: #FFFFFF;
  overflow: hidden;
`;

const HeroContent = styled.div`
  position: relative;
  padding-top: 100px;
  padding-bottom: 50px;
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  z-index: 1;
`;

const HeroTitle = styled.h1`
  font-size: 3rem;
  color: #000000;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.2rem;
  max-width: 700px;
  margin: 0 auto 3rem;
  color: #4B5563;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 2.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    margin-bottom: 2rem;
  }
`;

const Hero = () => {
  const [particles, setParticles] = useState([]);

  const generateParticles = (count) => {
    const p = [];
    for (let i = 0; i < count; i++) {
      p.push({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 15 + 6}px`,
        duration: `${Math.random() * 8 + 5}s`,
        delay: `${Math.random() * 4}s`,
        opacity: Math.random() * 0.6 + 0.4,
        color: Math.random() > 0.6 ? 'rgba(17, 17, 17, 0.1)' : 'rgba(0, 0, 0, 0.07)'
      });
    }
    return p;
  };

  useEffect(() => {
    setParticles(generateParticles(40));
  }, []);
  
  return (
    <Container>
      {/* Background animations */}
      <AnimatedCircle size="300px" top="10%" left="10%" duration="20s" blur="40px" />
      <AnimatedCircle size="400px" top="60%" left="70%" duration="25s" blur="50px" />
      <AnimatedCircle size="250px" top="30%" left="80%" duration="18s" blur="35px" />
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          top={particle.top}
          left={particle.left}
          size={particle.size}
          duration={particle.duration}
          delay={particle.delay}
          opacity={particle.opacity}
          color={particle.color}
        />
      ))}
      
      {/* Hero content */}
      <HeroContent>
        <HeroTitle>Secure File Transfer Made Simple</HeroTitle>
        <HeroSubtitle>
          Share files of any size with end-to-end encryption, no registration required.
          Fast, secure, and hassle-free.
        </HeroSubtitle>
        
        {/* File Transfer Component */}
        <FileTransfer />
      </HeroContent>
    </Container>
  );
};

export default Hero;

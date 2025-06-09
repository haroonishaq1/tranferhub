// A simple carousel component for the testimonials
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const CarouselWrapper = styled.div`
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 50px;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 0 40px;
    max-width: 100%;
  }
  
  @media (max-width: 480px) {
    padding: 0 30px;
  }
`;

const CarouselContainer = styled.div`
  overflow: hidden;
  width: 100%;
  border-radius: 20px;
  
  @media (max-width: 480px) {
    border-radius: 15px;
  }
`;

const CarouselSlider = styled.div`
  display: flex;
  transform: translateX(-${props => props.currentSlide * 100}%);
  transition: transform 0.5s ease-in-out;
`;

const Slide = styled.div`
  flex: 0 0 100%;
  width: 100%;
  padding: 3rem;
  background: linear-gradient(135deg, #D1D6D5 0%, rgba(43, 127, 142, 0.1) 100%);
  box-shadow: 8px 8px 16px rgba(43, 127, 142, 0.05), -8px -8px 16px rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-break: break-word;
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const NavButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: white;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
  
  &:hover {
    background: var(--primary-color);
    color: white;
    transform: translateY(-50%) scale(1.05);
  }
  
  &:active {
    transform: translateY(-50%) scale(0.95);
  }
  
  &.prev {
    left: 0px;
  }
  
  &.next {
    right: 0px;
  }
  
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }
  
  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
    font-size: 0.9rem;
    
    &.prev {
      left: 5px;
    }
    
    &.next {
      right: 5px;
    }
  }
`;

const IndicatorsContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
  
  @media (max-width: 480px) {
    margin-top: 15px;
  }
`;

const Indicator = styled.button`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.active ? '#000000' : '#ddd'};
  margin: 0 5px;
  border: none;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: ${props => props.active ? 'var(--primary-color)' : 'var(--primary-color)'};
    opacity: ${props => props.active ? 1 : 0.7};
  }
  
  @media (max-width: 480px) {
    width: 10px;
    height: 10px;
    margin: 0 4px;
  }
`;

const SimpleCarousel = ({ slides, autoPlayTime = 5000 }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  const totalSlides = slides.length;
  
  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;
  
  const nextSlide = () => {
    setCurrentSlide(current => (current === totalSlides - 1 ? 0 : current + 1));
    resetAutoPlay();
  };
  
  const prevSlide = () => {
    setCurrentSlide(current => (current === 0 ? totalSlides - 1 : current - 1));
    resetAutoPlay();
  };
  
  const goToSlide = (index) => {
    setCurrentSlide(index);
    resetAutoPlay();
  };
  
  // Touch event handlers
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };
    useEffect(() => {
    let timer;
    
    if (autoPlay) {
      timer = setInterval(() => {
        nextSlide();
      }, autoPlayTime);
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [autoPlay, autoPlayTime, currentSlide]);
  
  // Reset autoplay when the currentSlide changes
  const resetAutoPlay = () => {
    // Only reset if autoPlay is true
    if (autoPlay) {
      setAutoPlay(false);
      setTimeout(() => setAutoPlay(true), 100);
    }
  };
  return (
    <CarouselWrapper
      onMouseEnter={() => setAutoPlay(false)}
      onMouseLeave={() => setAutoPlay(true)}
      onFocus={() => setAutoPlay(false)}
      onBlur={() => setAutoPlay(true)}
      role="region"
      aria-label="Testimonial Carousel"
    >
      <CarouselContainer
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <CarouselSlider currentSlide={currentSlide}>
          {slides.map((slide, index) => (
            <Slide key={index} aria-hidden={currentSlide !== index}>{slide}</Slide>
          ))}
        </CarouselSlider>
      </CarouselContainer>
      
      <NavButton 
        className="prev" 
        onClick={prevSlide} 
        aria-label="Previous slide"
        aria-controls="carousel-slider"
      >
        <FiChevronLeft size={24} />
      </NavButton>
      
      <NavButton 
        className="next" 
        onClick={nextSlide} 
        aria-label="Next slide"
        aria-controls="carousel-slider"
      >
        <FiChevronRight size={24} />
      </NavButton>
      
      <IndicatorsContainer>
        {Array.from({ length: totalSlides }).map((_, index) => (
          <Indicator 
            key={index} 
            active={currentSlide === index} 
            onClick={() => goToSlide(index)} 
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </IndicatorsContainer>
    </CarouselWrapper>
  );
};

export default SimpleCarousel;

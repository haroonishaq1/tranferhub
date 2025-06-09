import React from 'react';
import styled from 'styled-components';
import AnimateOnScroll from '../../utils/scrollAnimationObserver';
import SimpleCarousel from '../ui/SimpleCarousel';

const TestimonialsSection = styled.section`
  background-color: #FFFFFF;
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

const TestimonialText = styled.p`
  font-size: 1.2rem;
  line-height: 1.8;
  color: #000000;
  margin-bottom: 2rem;
  font-style: italic;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    line-height: 1.5;
    margin-bottom: 1.2rem;
  }
`;

const TestimonialAuthor = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AuthorAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #E5E7EB;
  margin-right: 1rem;
  background-image: url(${props => props.image});
  background-size: cover;
  background-position: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 480px) {
    width: 45px;
    height: 45px;
    margin-right: 0.8rem;
  }
`;

const AuthorInfo = styled.div`
  text-align: left;
`;

const AuthorName = styled.h4`
  font-size: 1.1rem;
  color: #000000;
  margin-bottom: 0.2rem;
  
  @media (max-width: 480px) {
    font-size: 0.95rem;
    margin-bottom: 0.1rem;
  }
`;

const AuthorRole = styled.p`
  font-size: 0.9rem;
  color: #4B5563;
  opacity: 0.7;
  
  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

const testimonials = [
  {
    text: "TransferHub has completely transformed how our team shares large files. The combination of speed, security, and ease of use makes it our go-to solution for all file transfers.",
    name: "Sarah Johnson",
    role: "Creative Director, Design Studio",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    text: "I needed to send high-resolution video files to clients securely, and TransferHub made it incredibly simple. The interface is intuitive, and the encryption gives my clients peace of mind.",
    name: "Michael Chen",
    role: "Videographer, Visual Media",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    text: "As someone who frequently shares sensitive documents, security is my top priority. TransferHub's end-to-end encryption and auto-expiry features are exactly what I was looking for.",
    name: "Emma Rodriguez",
    role: "Legal Consultant, Rodriguez & Associates",
    avatar: "https://randomuser.me/api/portraits/women/63.jpg"
  }
];

const Testimonials = () => {
  // Create the testimonial content for each slide
  const testimonialSlides = testimonials.map(testimonial => (
    <div key={testimonial.name}>
      <TestimonialText>"{testimonial.text}"</TestimonialText>
      <TestimonialAuthor>
        <AuthorAvatar image={testimonial.avatar} />
        <AuthorInfo>
          <AuthorName>{testimonial.name}</AuthorName>
          <AuthorRole>{testimonial.role}</AuthorRole>
        </AuthorInfo>
      </TestimonialAuthor>
    </div>
  ));

  return (
    <TestimonialsSection>
      <Container>
        <AnimateOnScroll animation="fadeInDown" duration="0.8s">
          <SectionTitle>What Our Users Say</SectionTitle>
        </AnimateOnScroll>
        <AnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.2s">
          <SectionSubtitle>
            Don't just take our word for it - here's what our users have to say about TransferHub.
          </SectionSubtitle>
        </AnimateOnScroll>
        
        <AnimateOnScroll animation="fadeInUp" duration="0.8s" delay="0.4s">
          <SimpleCarousel slides={testimonialSlides} autoPlayTime={5000} />
        </AnimateOnScroll>
      </Container>
    </TestimonialsSection>
  );
};

export default Testimonials;

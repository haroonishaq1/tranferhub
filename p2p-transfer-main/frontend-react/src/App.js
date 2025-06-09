import React, { useEffect } from 'react';
import GlobalStyles from './GlobalStyles';
import AnimationStyles from './utils/animationStyles';
import Header from './components/layout/Header';
import Hero from './components/layout/Hero';
import Features from './components/layout/Features';
import Pricing from './components/layout/Pricing';
import Security from './components/layout/Security';
import Testimonials from './components/layout/Testimonials';
import Footer from './components/layout/Footer';
import ScrollButtons from './components/ui/ScrollButtons';
import GlobalErrorHandler from './components/ui/GlobalErrorHandler';
import { setupInitialAnimationDelay } from './utils/animationUtils';
import healthMonitor from './utils/healthMonitor';

function App() {
  useEffect(() => {
    // Setup animation delay to ensure elements load hidden first
    setupInitialAnimationDelay();
    
    // Start health monitoring for API connectivity
    healthMonitor.startMonitoring();
    
    return () => {
      // Clean up the health monitor when component unmounts
      healthMonitor.stopMonitoring();
    };
  }, []);
  
  return (
    <>
      <GlobalStyles />
      <AnimationStyles />
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Security />
        <Testimonials />
      </main>
      <Footer />
      <ScrollButtons />
      <GlobalErrorHandler />
    </>
  );
}

export default App;

import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`  :root {
    --primary-color: #000000;
    --secondary-color: #4B5563;
    --accent-color: #111111;
    --light-accent: #E5E7EB;
    --background-color: #FFFFFF;
    --text-color: #000000;
    --muted-text: #4B5563;
    --card-bg: #FFFFFF;
    --border-color: #E5E7EB;
    --button-hover: #1F2937;
    --gradient-primary: linear-gradient(135deg, #000000 0%, #4B5563 100%);
    --gradient-secondary: linear-gradient(135deg, #4B5563 0%, #111111 100%);
    --gradient-watery: linear-gradient(135deg, #E5E7EB 0%, #4B5563 50%, #111111 100%);
    --gradient-ocean: linear-gradient(45deg, #000000 0%, #4B5563 25%, #111111 75%, #E5E7EB 100%);
    --light-gray: #F9FAFB;
    --dark-gray: #4B5563;
    --white: #FFFFFF;    --shadow-light: 0 5px 15px rgba(0, 0, 0, 0.05);
    --shadow-medium: 0 8px 30px rgba(0, 0, 0, 0.1);
    --shadow-dark: 0 10px 50px rgba(0, 0, 0, 0.15);
    --shadow-watery: 0 8px 32px rgba(17, 17, 17, 0.15);
    
    /* Standardized RGBA Color Variables */    /* Primary Color Variations */
    --primary-rgba-05: rgba(0, 0, 0, 0.05);
    --primary-rgba-10: rgba(0, 0, 0, 0.1);
    --primary-rgba-15: rgba(0, 0, 0, 0.15);
    --primary-rgba-20: rgba(0, 0, 0, 0.2);
    --primary-rgba-25: rgba(0, 0, 0, 0.25);
    --primary-rgba-30: rgba(0, 0, 0, 0.3);
    --primary-rgba-40: rgba(0, 0, 0, 0.4);
    --primary-rgba-50: rgba(0, 0, 0, 0.5);
    
    /* Secondary Color Variations */
    --secondary-rgba-05: rgba(75, 85, 99, 0.05);
    --secondary-rgba-10: rgba(75, 85, 99, 0.1);
    --secondary-rgba-15: rgba(75, 85, 99, 0.15);
    --secondary-rgba-20: rgba(75, 85, 99, 0.2);
    --secondary-rgba-25: rgba(75, 85, 99, 0.25);
    --secondary-rgba-30: rgba(75, 85, 99, 0.3);
    
    /* Accent Color Variations */
    --accent-rgba-05: rgba(17, 17, 17, 0.05);
    --accent-rgba-10: rgba(17, 17, 17, 0.1);
    --accent-rgba-15: rgba(17, 17, 17, 0.15);
    --accent-rgba-20: rgba(17, 17, 17, 0.2);
    --accent-rgba-25: rgba(17, 17, 17, 0.25);
    --accent-rgba-30: rgba(17, 17, 17, 0.3);
    --accent-rgba-40: rgba(17, 17, 17, 0.4);
    --accent-rgba-50: rgba(17, 17, 17, 0.5);
    --accent-rgba-70: rgba(17, 17, 17, 0.7);
    --accent-rgba-80: rgba(17, 17, 17, 0.8);
    
    /* White Color Variations */
    --white-rgba-05: rgba(255, 255, 255, 0.05);
    --white-rgba-10: rgba(255, 255, 255, 0.1);
    --white-rgba-15: rgba(255, 255, 255, 0.15);
    --white-rgba-18: rgba(255, 255, 255, 0.18);
    --white-rgba-20: rgba(255, 255, 255, 0.2);
    --white-rgba-30: rgba(255, 255, 255, 0.3);
    --white-rgba-50: rgba(255, 255, 255, 0.5);
    --white-rgba-80: rgba(255, 255, 255, 0.8);
    
    /* Black Color Variations */
    --black-rgba-05: rgba(0, 0, 0, 0.05);
    --black-rgba-06: rgba(0, 0, 0, 0.06);
    --black-rgba-08: rgba(0, 0, 0, 0.08);
    --black-rgba-10: rgba(0, 0, 0, 0.1);
    --black-rgba-15: rgba(0, 0, 0, 0.15);
    --black-rgba-50: rgba(0, 0, 0, 0.5);
    
    /* Light Accent Color Variations */
    --light-accent-rgba-15: rgba(209, 214, 213, 0.15);
    --light-accent-rgba-18: rgba(209, 214, 213, 0.18);
    
    --font-main: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    overflow-x: hidden;
    max-width: 100%;
    position: relative; /* Ensure proper stacking context for fixed elements */
  }

  #root {
    width: 100%;
    overflow-x: hidden;
    max-width: 100%;
  }
    body {
    font-family: var(--font-main);
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Ensure fixed elements stay in their correct stacking order */
  .menu-active main, .menu-active section {
    position: relative;
    z-index: 1;
  }
  
  a {
    text-decoration: none;
    color: var(--primary-color);
    transition: color 0.3s ease;
  }

  a:hover {
    color: var(--secondary-color);
  }

  button {
    font-family: var(--font-main);
    cursor: pointer;
    border: none;
    outline: none;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.3;
  }

  .container {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  section {
    padding: 80px 0;
  }
  /* Neumorphism style for elements */
  .neumorphic {
    border-radius: 15px;
    background: var(--light-gray);
    box-shadow: 
      8px 8px 16px var(--black-rgba-05), 
      -8px -8px 16px var(--white-rgba-80);
  }/* Glassmorphism style for elements */
  .glassmorphic {
    background: var(--white-rgba-15);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--white-rgba-18);
    border-radius: 15px;
    box-shadow: 0 8px 32px var(--black-rgba-10);
  }
  
  /* Watery glassmorphism style */
  .water-glass {
    background: var(--light-accent-rgba-15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid var(--accent-rgba-18);
    border-radius: 15px;
    box-shadow: 0 8px 32px var(--primary-rgba-10);
  }  /* Watery Animation */
  @keyframes waterWave {
    0% {
      background-position: 0% 50%;
      box-shadow: 0 5px 15px var(--accent-rgba-20);
    }
    50% {
      background-position: 100% 50%;
      box-shadow: 0 5px 20px var(--accent-rgba-40);
    }
    100% {
      background-position: 0% 50%;
      box-shadow: 0 5px 15px var(--accent-rgba-20);
    }
  }

  .water-effect {
    background: var(--gradient-ocean);
    background-size: 200% 200%;
    animation: waterWave 10s ease infinite;
    transition: all 0.3s ease;
  }

  /* Animation Keyframes */
  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(50px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-50px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }  /* Animation base styles */
  .animate-on-scroll {
    will-change: opacity, transform;
    opacity: 0; /* Start with opacity 0 */
  }
  
  /* Ensure animations run correctly */
  .fade-in-left {
    animation: fadeInLeft 1s forwards;
  }
  
  .fade-in-right {
    animation: fadeInRight 1s forwards;
  }
  
  .fade-in-up {
    animation: fadeInUp 1s forwards;
  }
  
  .fade-in-down {
    animation: fadeInDown 1s forwards;
  }
  
  /* Helper class to hide content initially */
  .hide-until-animated {
    visibility: hidden;
  }

  /* Additional helper classes to prevent overflow */
  .container, .section, .row, .col, div, section {
    max-width: 100%;
    box-sizing: border-box;
  }

  /* Setting a max-width on images, videos, and other media to prevent overflow */
  img, video, iframe, embed, object, canvas, svg, figure {
    max-width: 100%;
    height: auto;
  }
  
  /* Ensure all sections have proper width constraints */
  section {
    width: 100%;
    overflow-x: hidden;
    padding: 80px 0;
  }

  /* Firefox specific fix for horizontal scroll issues */
  @-moz-document url-prefix() {
    html, body {
      scrollbar-width: thin;
    }
  }

  /* Mobile optimization classes */
  @media (max-width: 768px) {
    .hide-on-mobile {
      display: none !important;
    }
    
    .full-width-on-mobile {
      width: 100% !important;
      max-width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
  }
`;

export default GlobalStyles;

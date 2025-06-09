import { createGlobalStyle } from 'styled-components';

const AnimationStyles = createGlobalStyle`
  /* Animation keyframes */
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
  }
    /* Animation classes */
  .fade-fadeInLeft {
    opacity: 0;
  }
  .fade-fadeInLeft.is-visible {
    animation-name: fadeInLeft;
    animation-fill-mode: forwards;
    animation-timing-function: ease-out;
  }
  
  .fade-fadeInRight {
    opacity: 0;
  }
  .fade-fadeInRight.is-visible {
    animation-name: fadeInRight;
    animation-fill-mode: forwards;
    animation-timing-function: ease-out;
  }
  
  .fade-fadeInUp {
    opacity: 0;
  }
  .fade-fadeInUp.is-visible {
    animation-name: fadeInUp;
    animation-fill-mode: forwards;
    animation-timing-function: ease-out;
  }
  
  .fade-fadeInDown {
    opacity: 0;
  }
  .fade-fadeInDown.is-visible {
    animation-name: fadeInDown;
    animation-fill-mode: forwards;
    animation-timing-function: ease-out;
  }
    /* Hide elements until they're visible */
  .is-hidden {
    opacity: 0 !important;
    visibility: hidden !important;
  }
  
  /* Optimization */
  .is-visible {
    will-change: opacity, transform;
  }
  
  /* Disable animations initially on page load */
  .animations-disabled .fade-fadeInLeft,
  .animations-disabled .fade-fadeInRight,
  .animations-disabled .fade-fadeInUp,
  .animations-disabled .fade-fadeInDown {
    opacity: 0 !important;
    visibility: hidden !important;
    animation: none !important;
  }
`;

export default AnimationStyles;

// Helper function to prevent animations from firing too early on page load
export const setupInitialAnimationDelay = () => {
  // On page load, add a class to the body to prevent animations from firing immediately
  document.body.classList.add('animations-disabled');
  
  // After a short delay, remove the class to allow animations to work
  setTimeout(() => {
    document.body.classList.remove('animations-disabled');
    
    // Force a check of all intersection observers
    window.dispatchEvent(new Event('scroll'));
  }, 200);
};

export default { 
  setupInitialAnimationDelay
};

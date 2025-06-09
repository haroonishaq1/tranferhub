// Helper component to initialize AdSense ads globally
import React, { useEffect } from 'react';

const AdSenseInitializer = () => {
  useEffect(() => {
    try {
      // Add an event listener to reinitialize ads when the Google AdSense script has loaded
      const handleAdSenseLoad = () => {
        if (window.adsbygoogle) {
          // Find all uninitialized ads and push them to AdSense
          const uninitializedAds = document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])');
          uninitializedAds.forEach(() => {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (error) {
              console.error('Error initializing ad:', error);
            }
          });
        }
      };

      // Try to initialize ads when component mounts
      handleAdSenseLoad();

      // Listen for AdSense script load event
      window.addEventListener('load', handleAdSenseLoad);

      return () => {
        window.removeEventListener('load', handleAdSenseLoad);
      };
    } catch (error) {
      console.error('Error setting up AdSense initialization:', error);
    }
  }, []);

  // This component doesn't render anything
  return null;
};

export default AdSenseInitializer;

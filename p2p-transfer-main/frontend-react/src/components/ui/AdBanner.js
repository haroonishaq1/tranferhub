import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const AdContainer = styled.div`
  width: 100%;
  max-width: ${props => props.width || '100%'};
  margin: ${props => props.margin || '1rem auto'};
  overflow: hidden;
  min-height: ${props => props.height || 'auto'};
  background-color: ${props => props.backgroundColor || 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  
  @media (max-width: 768px) {
    margin: ${props => props.mobileMargin || props.margin || '1rem auto'};
    min-height: ${props => props.mobileHeight || props.height || 'auto'};
  }
`;

const AdBanner = ({ 
  adClient = 'ca-pub-3339450543737230',
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  width = '100%',
  height = 'auto',
  margin = '1rem auto',
  mobileMargin = '1rem auto',
  mobileHeight = 'auto',
  backgroundColor = 'transparent',
  className = ''
}) => {
  const adRef = useRef(null);
  
  useEffect(() => {
    try {
      // Check if window and 'adsbygoogle' object exist
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        // Push the ad to Google's ad service
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        console.log('AdSense ad pushed');
      } else {
        console.log('AdSense not available');
      }
    } catch (error) {
      console.error('Error loading AdSense ad:', error);
    }
  }, []);

  // Only render ad if adSlot is provided
  if (!adSlot) {
    return null;
  }

  return (
    <AdContainer
      className={`ad-container ${className}`}
      width={width}
      height={height}
      margin={margin}
      mobileMargin={mobileMargin}
      mobileHeight={mobileHeight}
      backgroundColor={backgroundColor}
      ref={adRef}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </AdContainer>
  );
};

export default AdBanner;

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiMenu, FiX } from 'react-icons/fi';

const StyledHeader = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  padding: 1.2rem 0;  
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow-x: hidden;
  box-sizing: border-box;
  transition: all 0.3s ease;
  
  @media (max-width: 768px) {
    padding: 1rem 0;
    /* Ensure header maintains its position in the stacking context */
    z-index: 10000;
  }
    &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0s linear 0.3s;
    z-index: 9998; /* Increased to be just below the menu but above content */
    pointer-events: none;
  }
  
  &.menu-active::before {
    opacity: 1;
    visibility: visible;
    transition: opacity 0.3s ease, visibility 0s linear;
    pointer-events: auto;
  }
`;

const Nav = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  position: relative;
  z-index: 10; /* Added z-index for stacking context */
  
  @media (max-width: 768px) {
    padding: 0 1.5rem;
  }
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #000000;
  
  span {
    background: linear-gradient(135deg, #000000 0%, #111111 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const MenuItems = styled.div`
  display: flex;
  gap: 2.5rem;
  align-items: center;

  a {
    color: #000000;
    font-weight: 500;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -5px;
      width: 0;
      height: 2px;
      background: linear-gradient(90deg, #000000, #111111);
      transition: width 0.3s ease;
    }
    
    &:hover {
      color: #111111;
      
      &::after {
        width: 100%;
      }
    }
  }
  
  .mobile-menu-login {
    display: none;
  }
    @media (max-width: 768px) {
    position: fixed; /* Changed from absolute to fixed for better positioning */
    top: 0;
    left: 0;
    right: 0;
    /* Start from the top of the viewport plus header height */
    margin-top: 60px; /* Approximate height of header - adjust as needed */
    flex-direction: column;
    gap: 0;
    height: calc(100vh - 60px); /* Take remaining viewport height */    
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.05);
    padding: 1rem 0;
    width: 100%;
    align-items: center;
    transform: translateY(-100%); /* Changed to slide from top */
    transform-origin: top center;
    opacity: 0;
    visibility: hidden;
    transition: transform 0.3s ease, opacity 0.3s ease, visibility 0s linear 0.3s;
    z-index: 99999; /* Higher z-index to ensure it's above everything */
    overflow-y: auto; /* Allow scrolling if menu is long */
    
    &.active {
      transform: translateY(0);
      opacity: 1;
      visibility: visible;
      transition: transform 0.3s ease, opacity 0.3s ease, visibility 0s linear;
    }      
    
    a {
      font-size: 1rem;
      padding: 1rem 0;
      width: 100%;
      text-align: center;
      border-bottom: 1px solid #E5E7EB;
      
      &:last-of-type {
        border-bottom: none;
      }      
      
      &:hover {
        background-color: rgba(17, 17, 17, 0.03);
      }
      
      &::after {
        bottom: 0;
      }
    }
    
    .mobile-menu-login {
      display: block;
      width: 100%;
      padding: 1.5rem 0 0.5rem;
      text-align: center;
      
      button {
        width: 80%;
        max-width: 200px;
      }
    }
  }
`;

const LoginButton = styled.button`
  background: transparent;
  border: 2px solid #111111;
  color: #000000;
  padding: 0.6rem 1.5rem;
  border-radius: 50px;
  font-weight: 600; 
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    background: #111111;
    color: white;
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 1rem;
    font-size: 0.85rem;
    
    &.desktop-login {
      display: none;
    }
  }
`;

const MenuToggle = styled.button`
  display: none;
  background: transparent;
  border: none;
  color: #000000;
  font-size: 1.8rem;
  cursor: pointer;
  transition: transform 0.3s ease;
  position: relative; /* Added position */
  z-index: 100000; /* Higher z-index to ensure it stays above the menu */
  
  &:hover {
    transform: scale(1.1);
    color: #111111;
  }
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const MobileWrapper = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-left: auto;
    position: relative;
    z-index: 100000; /* Higher z-index to stay above the menu */
  }
`;

const Header = () => {
  const [menuActive, setMenuActive] = useState(false);
  
  useEffect(() => {
    const closeMenuOnScroll = () => {
      if (menuActive) {
        setMenuActive(false);
      }
    };

    const closeMenuOnOutsideClick = (e) => {
      // Close when clicking outside the menu and toggle button
      if (menuActive && !e.target.closest('.nav-menu') && !e.target.closest('.menu-toggle')) {
        setMenuActive(false);
      }
    };
    
    // Optional: Prevent scrolling when menu is open on mobile
    if (menuActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    window.addEventListener('scroll', closeMenuOnScroll);
    document.addEventListener('click', closeMenuOnOutsideClick);

    return () => {
      window.removeEventListener('scroll', closeMenuOnScroll);
      document.removeEventListener('click', closeMenuOnOutsideClick);
      document.body.style.overflow = '';
    };
  }, [menuActive]);

  const toggleMenu = (e) => {
    e.stopPropagation(); // Prevent event bubbling
    setMenuActive((prev) => !prev);
  };
  
  return (
    <StyledHeader className={menuActive ? 'menu-active' : ''}>
      <Nav>
        <Logo>
          <span>TransferHub</span>
        </Logo>        
        <MenuItems 
          className={`nav-menu ${menuActive ? 'active' : ''}`}
          role="navigation"
          aria-label="Main menu"
          aria-hidden={!menuActive}
          aria-expanded={menuActive}
        >
          <a href="#home" onClick={() => setMenuActive(false)}>Home</a>
          <a href="#features" onClick={() => setMenuActive(false)}>Features</a>
          <a href="#pricing" onClick={() => setMenuActive(false)}>Pricing</a>
          <a href="#security" onClick={() => setMenuActive(false)}>Security</a>
          
          {/* Login button inside mobile menu */}
          <div className="mobile-menu-login">
            <LoginButton onClick={() => setMenuActive(false)}>Login</LoginButton>
          </div>
        </MenuItems>
        
        <MobileWrapper>
          {/* Menu toggle button (visible only on mobile devices) */}
          <MenuToggle 
            className="menu-toggle" 
            onClick={toggleMenu} 
            aria-label="Toggle navigation"
            aria-expanded={menuActive}
            aria-controls="nav-menu"
          >
            {menuActive ? <FiX /> : <FiMenu />}
          </MenuToggle>
        </MobileWrapper>
        
        {/* Login button (visible only on desktop) */}
        <LoginButton className="desktop-login">Login</LoginButton>
      </Nav>
    </StyledHeader>
  );
};

export default Header;

// Modern Header JavaScript - Mobile menu functionality and scroll effects

class ModernHeader {
    constructor() {
        this.header = null;
        this.menuToggle = null;
        this.menu = null;
        this.isMenuOpen = false;
        this.init();
    }    init() {
        this.setupExistingHeader();
        this.addEventListeners();
        this.handleScrollEffects();
        console.log('Modern header initialized');
    }

    setupExistingHeader() {
        // Use existing header elements
        this.header = document.getElementById('modern-header');
        this.menuToggle = document.getElementById('mobile-menu-toggle');
        this.menu = document.getElementById('nav-menu');
        
        if (!this.header || !this.menuToggle || !this.menu) {
            console.error('Header elements not found');
            return;
        }
          // Add padding to body to account for fixed header
        document.body.style.paddingTop = '80px';
    }

    addEventListeners() {
        // Mobile menu toggle
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu();
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isMenuOpen && !this.header.contains(e.target)) {
                this.closeMobileMenu();
            }
        });

        // Close menu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });

        // Handle menu link clicks
        if (this.menu) {
            this.menu.addEventListener('click', (e) => {
                if (e.target.matches('a[href^="#"]')) {
                    this.handleSmoothScroll(e);
                    if (window.innerWidth <= 768) {
                        this.closeMobileMenu();
                    }
                }
            });
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isMenuOpen) {
                this.closeMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        if (this.isMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }    openMobileMenu() {
        this.isMenuOpen = true;
        this.header.classList.add('menu-active');
        this.menu.classList.add('active');
        
        // Add hamburger animation class
        this.menuToggle.classList.add('active');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus management
        this.menuToggle.setAttribute('aria-expanded', 'true');
    }

    closeMobileMenu() {
        this.isMenuOpen = false;
        this.header.classList.remove('menu-active');
        this.menu.classList.remove('active');
        
        // Remove hamburger animation class
        this.menuToggle.classList.remove('active');
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Focus management
        this.menuToggle.setAttribute('aria-expanded', 'false');
    }

    handleScrollEffects() {
        let lastScrollY = window.scrollY;
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            // Add scrolled class for styling
            if (currentScrollY > 50) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
            
            // Hide/show header on scroll (optional)
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down
                this.header.style.transform = 'translateY(-100%)';
            } else {
                // Scrolling up
                this.header.style.transform = 'translateY(0)';
            }
            
            lastScrollY = currentScrollY;
        });
    }

    handleSmoothScroll(e) {
        const href = e.target.getAttribute('href');
        
        if (href && href.startsWith('#')) {
            e.preventDefault();
            
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = this.header.offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    }

    // Method to update active menu item based on scroll position
    updateActiveMenuItem() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + this.header.offsetHeight + 50;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active class from all menu items
                this.menu.querySelectorAll('a').forEach(link => {
                    link.classList.remove('active');
                });
                
                // Add active class to current section's menu item
                const activeLink = this.menu.querySelector(`a[href="#${sectionId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }

    // Public method to manually close menu
    closeMenu() {
        this.closeMobileMenu();
    }

    // Destroy method for cleanup
    destroy() {
        if (this.header && this.header.parentNode) {
            this.header.parentNode.removeChild(this.header);
        }
        document.body.style.paddingTop = '';
        document.body.style.overflow = '';
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.modernHeader = new ModernHeader();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernHeader;
}

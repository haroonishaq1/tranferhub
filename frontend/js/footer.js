// Modern Footer JavaScript - Newsletter functionality and animations

class ModernFooter {
    constructor() {
        this.footer = null;
        this.init();
    }    init() {
        this.setupExistingFooter();
        this.addEventListeners();
        this.setupAnimations();
        console.log('Modern footer initialized');
    }

    setupExistingFooter() {
        // Use existing footer element
        this.footer = document.getElementById('modern-footer');
        
        if (!this.footer) {
            console.error('Footer element not found');
            return;
        }    }    addEventListeners() {
        // Newsletter form submission
        const newsletterForm = this.footer.querySelector('#newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewsletterSignup(e);
            });
        }

        // Social media link tracking
        const socialLinks = this.footer.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSocialClick(e);
            });
        });

        // Footer links smooth scrolling
        const footerLinks = this.footer.querySelectorAll('.footer-links a[href^="#"]');
        footerLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                this.handleFooterLinkClick(e);
            });
        });
    }

    setupAnimations() {
        // Intersection Observer for footer animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);        // Observe footer sections instead of columns
        const footerSections = this.footer.querySelectorAll('.footer-section');
        footerSections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = `all 0.6s ease ${index * 0.1}s`;            observer.observe(section);
        });
    }

    handleNewsletterSignup(e) {
        const emailInput = e.target.querySelector('.newsletter-input');
        const submitBtn = e.target.querySelector('.newsletter-btn');
        const email = emailInput.value.trim();

        if (!this.isValidEmail(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        // Disable form during submission
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subscribing...';

        // Simulate newsletter signup (replace with actual API call)
        setTimeout(() => {
            this.showNotification('Thank you for subscribing!', 'success');
            emailInput.value = '';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Subscribe';
        }, 1500);
    }

    handleSocialClick(e) {
        const platform = this.getSocialPlatform(e.target);
        
        // Analytics tracking (replace with actual analytics)
        console.log(`Social media click: ${platform}`);
        
        // For demo purposes, show a message
        this.showNotification(`Opening ${platform}...`, 'info');
    }

    handleFooterLinkClick(e) {
        const href = e.target.getAttribute('href');
        
        if (href && href.startsWith('#')) {
            e.preventDefault();
            
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.modern-header')?.offsetHeight || 0;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }
    }

    getSocialPlatform(element) {
        const icon = element.querySelector('i') || element;
        const classList = icon.className;
        
        if (classList.includes('github')) return 'GitHub';
        if (classList.includes('twitter')) return 'Twitter';
        if (classList.includes('linkedin')) return 'LinkedIn';
        if (classList.includes('facebook')) return 'Facebook';
        
        return 'Social Media';
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: '#ffffff',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });

        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to DOM and animate in
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Method to update footer year
    updateYear() {
        const yearElement = this.footer.querySelector('.footer-bottom p');
        if (yearElement) {
            yearElement.innerHTML = yearElement.innerHTML.replace(
                /\d{4}/,
                new Date().getFullYear()
            );
        }
    }

    // Destroy method for cleanup
    destroy() {
        if (this.footer && this.footer.parentNode) {
            this.footer.parentNode.removeChild(this.footer);
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.modernFooter = new ModernFooter();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernFooter;
}

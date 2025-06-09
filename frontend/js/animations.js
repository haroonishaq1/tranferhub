// Bubble Animations JavaScript - Restricted to main content area only

class BubbleAnimations {
    constructor() {
        this.particles = [];
        this.animationContainer = null;
        this.isInitialized = false;
        this.homeSection = null;
        this.intersectionObserver = null;
    }

    init() {
        if (this.isInitialized) return;
        
        // Get the existing bubble container in home section only
        this.animationContainer = document.getElementById('bubble-container');
        this.homeSection = document.getElementById('home');
        
        if (!this.animationContainer || !this.homeSection) {
            console.warn('Bubble container or home section not found');
            return;
        }
        
        // Ensure bubble container is properly scoped to main content
        this.animationContainer.style.position = 'absolute';
        this.animationContainer.style.top = '0';
        this.animationContainer.style.left = '0';
        this.animationContainer.style.width = '100%';
        this.animationContainer.style.height = '100%';
        this.animationContainer.style.pointerEvents = 'none';
        this.animationContainer.style.zIndex = '0';
        this.animationContainer.style.overflow = 'hidden';
        
        // Create static circles
        this.createAnimatedCircles();
        
        // Generate and create particles
        this.generateParticles(30);
        this.createParticles();
        
        // Add interaction effects only for main content
        this.addInteractionEffects();
        
        // Add scroll listener to hide animations when not in main section
        this.addScrollListener();
        
        this.isInitialized = true;
        console.log('Bubble animations initialized for main content area only');
    }    addInteractionEffects() {
        // Add bubble effect only to elements within home section
        const homeInteractiveElements = this.homeSection.querySelectorAll('button, .btn, .file-drop-zone, .action-card');
        homeInteractiveElements.forEach(element => {
            element.classList.add('bubble-effect');
        });

        // Add click bubble effect only for main content clicks within home section
        this.homeSection.addEventListener('click', (e) => {
            if (e.target.matches('button, .btn, input[type="submit"]')) {
                this.createClickBubble(e);
            }
        });
    }

    createAnimatedCircles() {
        const circles = [
            { class: 'circle-1', size: '250px', top: '15%', left: '15%', duration: '20s', blur: '35px' },
            { class: 'circle-2', size: '300px', top: '65%', left: '70%', duration: '25s', blur: '40px' },
            { class: 'circle-3', size: '200px', top: '35%', left: '75%', duration: '18s', blur: '30px' }
        ];

        circles.forEach(circle => {
            const element = document.createElement('div');
            element.className = `animated-circle ${circle.class}`;
            element.style.width = circle.size;
            element.style.height = circle.size;
            element.style.top = circle.top;
            element.style.left = circle.left;
            element.style.animationDuration = circle.duration;
            element.style.filter = `blur(${circle.blur})`;
            element.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))';
            element.style.borderRadius = '50%';
            element.style.animation = `float ${circle.duration} ease-in-out infinite`;
            
            this.animationContainer.appendChild(element);
        });
    }

    generateParticles(count) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push({
                id: i,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                size: Math.random() * 12 + 4,
                duration: `${Math.random() * 6 + 4}s`,
                delay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.4 + 0.2,
                variant: Math.random() > 0.5 ? 'variant-1' : 'variant-2'
            });
        }
    }

    createParticles() {
        this.particles.forEach(particle => {
            const element = document.createElement('div');
            element.className = `particle ${this.getSizeClass(particle.size)} ${particle.variant}`;
            element.style.position = 'absolute';
            element.style.top = particle.top;
            element.style.left = particle.left;
            element.style.width = `${particle.size}px`;
            element.style.height = `${particle.size}px`;
            element.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4))';
            element.style.borderRadius = '50%';
            element.style.animationDuration = particle.duration;
            element.style.animationDelay = particle.delay;
            element.style.opacity = particle.opacity;
            element.style.animation = `bubbleFloat ${particle.duration} ease-in-out infinite ${particle.delay}`;
            
            this.animationContainer.appendChild(element);
        });
    }

    getSizeClass(size) {
        if (size < 6) return 'small';
        if (size < 10) return 'medium';
        return 'large';
    }addInteractionEffects() {
        // Add bubble effect only to elements within home section
        const homeInteractiveElements = this.homeSection.querySelectorAll('button, .btn, .file-drop-zone, .action-card');
        homeInteractiveElements.forEach(element => {
            element.classList.add('bubble-effect');
        });

        // Add click bubble effect only for home section clicks
        this.homeSection.addEventListener('click', (e) => {
            if (e.target.matches('button, .btn, input[type="submit"]')) {
                this.createClickBubble(e);
            }
        });
    }    addScrollListener() {
        // Create intersection observer to hide animations when leaving home section
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.showAnimations();
                } else {
                    this.hideAnimations();
                }
            });
        }, {
            threshold: 0.3,
            rootMargin: '-50px 0px -50px 0px'
        });

        this.intersectionObserver.observe(this.homeSection);
    }

    showAnimations() {
        if (this.animationContainer) {
            this.animationContainer.style.opacity = '1';
            this.animationContainer.style.visibility = 'visible';
        }
    }

    hideAnimations() {
        if (this.animationContainer) {
            this.animationContainer.style.opacity = '0';
            this.animationContainer.style.visibility = 'hidden';
        }
    }

    createClickBubble(event) {
        // Get the position relative to the home section container
        const homeRect = this.homeSection.getBoundingClientRect();
        const relativeX = event.clientX - homeRect.left;
        const relativeY = event.clientY - homeRect.top;
        
        // Only create bubble if click is within home section bounds
        if (relativeX >= 0 && relativeX <= homeRect.width && 
            relativeY >= 0 && relativeY <= homeRect.height) {
            
            const bubble = document.createElement('div');
            bubble.className = 'click-bubble';
            
            const size = Math.random() * 15 + 8;
            bubble.style.position = 'absolute';
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${relativeX - size/2}px`;
            bubble.style.top = `${relativeY - size/2}px`;
            bubble.style.background = 'radial-gradient(circle, rgba(99, 102, 241, 0.6), rgba(168, 85, 247, 0.6))';
            bubble.style.borderRadius = '50%';
            bubble.style.pointerEvents = 'none';
            bubble.style.zIndex = '10';
            bubble.style.animation = 'clickBubbleFloat 2s ease-out forwards';
            
            this.animationContainer.appendChild(bubble);
            
            // Remove bubble after animation
            setTimeout(() => {
                if (bubble.parentNode) {
                    bubble.parentNode.removeChild(bubble);
                }
            }, 2000);
        }
    }

    // Method to regenerate particles (useful for dynamic content)
    regenerateParticles(count = 30) {
        // Clear existing particles
        const existingParticles = this.animationContainer.querySelectorAll('.particle');
        existingParticles.forEach(particle => particle.remove());
        
        // Generate new particles
        this.generateParticles(count);
        this.createParticles();
    }

    // Method to pause/resume animations
    toggleAnimations(pause = false) {
        const elements = this.animationContainer.querySelectorAll('.animated-circle, .particle');
        elements.forEach(element => {
            element.style.animationPlayState = pause ? 'paused' : 'running';
        });
    }

    // Clean up method
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        if (this.animationContainer) {
            this.animationContainer.innerHTML = '';
        }
        this.isInitialized = false;
        this.particles = [];
        this.animationContainer = null;
        this.homeSection = null;
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
        // Wait a bit for all elements to be properly loaded
        setTimeout(() => {
            window.bubbleAnimations = new BubbleAnimations();
            window.bubbleAnimations.init();
        }, 100);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubbleAnimations;
}

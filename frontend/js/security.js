/**
 * Security Section Component
 * Handles animations and interactions for the security features section
 */
class SecuritySection {
    constructor() {
        this.isInitialized = false;
        this.animationObserver = null;
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupIntersectionObserver();
        this.initializeSecurityCards();
        this.initializeTrustIndicators();
        this.setupEncryptionVisualization();
        this.isInitialized = true;
    }

    setupIntersectionObserver() {
        // Create intersection observer for scroll animations
        this.animationObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '50px'
            }
        );

        // Observe security cards
        document.querySelectorAll('.security-card').forEach(card => {
            this.animationObserver.observe(card);
        });

        // Observe trust indicators
        document.querySelectorAll('.trust-indicator').forEach(indicator => {
            this.animationObserver.observe(indicator);
        });
    }

    initializeSecurityCards() {
        const cards = document.querySelectorAll('.security-card');
        
        cards.forEach((card, index) => {
            // Add staggered delay for animations
            card.style.animationDelay = `${index * 0.2}s`;
            
            // Add hover interactions
            card.addEventListener('mouseenter', () => {
                this.enhanceCardHover(card);
            });
            
            card.addEventListener('mouseleave', () => {
                this.resetCardHover(card);
            });
        });
    }

    enhanceCardHover(card) {
        const icon = card.querySelector('.security-icon');
        if (icon) {
            icon.style.transform = 'scale(1.1) rotate(5deg)';
            icon.style.filter = 'brightness(1.2)';
        }
    }

    resetCardHover(card) {
        const icon = card.querySelector('.security-icon');
        if (icon) {
            icon.style.transform = 'scale(1) rotate(0deg)';
            icon.style.filter = 'brightness(1)';
        }
    }

    initializeTrustIndicators() {
        const indicators = document.querySelectorAll('.trust-indicator');
        
        indicators.forEach((indicator, index) => {
            indicator.style.animationDelay = `${1 + index * 0.3}s`;
            
            // Add click interaction for trust badges
            indicator.addEventListener('click', () => {
                this.showTrustDetails(indicator);
            });
        });
    }

    showTrustDetails(indicator) {
        const title = indicator.querySelector('h4')?.textContent || 'Security Feature';
        const description = this.getTrustDescription(title);
        
        // Create a simple tooltip or modal
        this.showTooltip(indicator, description);
    }

    getTrustDescription(title) {
        const descriptions = {
            'Military-Grade Encryption': 'Your files are protected with AES-256 encryption, the same standard used by military and government agencies worldwide.',
            'Zero-Knowledge Transfer': 'We never see your files. All encryption and decryption happens on your device before any data leaves your computer.',
            'Secure P2P Protocol': 'Direct peer-to-peer connections ensure your data never touches our servers unnecessarily.',
            'End-to-End Security': 'Complete security from your device to the recipient with no intermediate vulnerabilities.',
            'ISO 27001 Certified': 'Our security practices meet international standards for information security management.',
            'GDPR Compliant': 'Full compliance with European data protection regulations ensuring your privacy rights.'
        };
        
        return descriptions[title] || 'Advanced security feature to protect your data transfers.';
    }

    showTooltip(element, text) {
        // Remove existing tooltips
        document.querySelectorAll('.security-tooltip').forEach(tip => tip.remove());
        
        const tooltip = document.createElement('div');
        tooltip.className = 'security-tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 14px;
            max-width: 300px;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            animation: fadeIn 0.3s ease;
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            tooltip.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => tooltip.remove(), 300);
        }, 3000);
    }

    setupEncryptionVisualization() {
        const encryptionDemo = document.querySelector('.encryption-demo');
        if (!encryptionDemo) return;
        
        // Create animated encryption visualization
        this.createEncryptionFlow(encryptionDemo);
    }

    createEncryptionFlow(container) {
        const flowHTML = `
            <div class="encryption-flow">
                <div class="flow-step" data-step="1">
                    <div class="step-icon">📁</div>
                    <div class="step-label">Your File</div>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step" data-step="2">
                    <div class="step-icon">🔐</div>
                    <div class="step-label">Encryption</div>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step" data-step="3">
                    <div class="step-icon">📡</div>
                    <div class="step-label">Transfer</div>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step" data-step="4">
                    <div class="step-icon">🔓</div>
                    <div class="step-label">Decryption</div>
                </div>
                <div class="flow-arrow">→</div>
                <div class="flow-step" data-step="5">
                    <div class="step-icon">📁</div>
                    <div class="step-label">Received File</div>
                </div>
            </div>
        `;
        
        container.innerHTML = flowHTML;
        
        // Add CSS for the flow
        const style = document.createElement('style');
        style.textContent = `
            .encryption-flow {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 20px;
                margin: 30px 0;
                flex-wrap: wrap;
            }
            
            .flow-step {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 15px;
                background: rgba(124, 58, 237, 0.1);
                border-radius: 12px;
                border: 2px solid rgba(124, 58, 237, 0.2);
                min-width: 80px;
                transition: all 0.3s ease;
                animation: flowPulse 2s ease-in-out infinite;
            }
            
            .flow-step:hover {
                background: rgba(124, 58, 237, 0.2);
                transform: translateY(-5px);
            }
            
            .step-icon {
                font-size: 24px;
                margin-bottom: 8px;
            }
            
            .step-label {
                font-size: 12px;
                font-weight: 600;
                text-align: center;
                color: #333;
            }
            
            .flow-arrow {
                font-size: 20px;
                color: #7c3aed;
                font-weight: bold;
                animation: flowArrow 1.5s ease-in-out infinite;
            }
            
            @keyframes flowPulse {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
            }
            
            @keyframes flowArrow {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(5px); }
            }
            
            @media (max-width: 768px) {
                .encryption-flow {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .flow-arrow {
                    transform: rotate(90deg);
                }
            }
        `;
        
        document.head.appendChild(style);
        
        // Animate steps sequentially
        this.animateEncryptionSteps();
    }

    animateEncryptionSteps() {
        const steps = document.querySelectorAll('.flow-step');
        
        steps.forEach((step, index) => {
            step.style.animationDelay = `${index * 0.5}s`;
            
            // Add click interaction
            step.addEventListener('click', () => {
                step.style.animation = 'none';
                step.offsetHeight; // Trigger reflow
                step.style.animation = 'flowPulse 0.5s ease-in-out 3';
            });
        });
    }

    // Utility method to count security features
    getSecurityFeatureCount() {
        return document.querySelectorAll('.security-card').length;
    }

    // Method to highlight a specific security feature
    highlightFeature(featureIndex) {
        const cards = document.querySelectorAll('.security-card');
        if (cards[featureIndex]) {
            cards[featureIndex].style.animation = 'securityHighlight 1s ease-in-out';
            cards[featureIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Cleanup method
    destroy() {
        if (this.animationObserver) {
            this.animationObserver.disconnect();
        }
        
        document.querySelectorAll('.security-tooltip').forEach(tip => tip.remove());
        this.isInitialized = false;
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.securitySection = new SecuritySection();
    window.securitySection.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecuritySection;
}

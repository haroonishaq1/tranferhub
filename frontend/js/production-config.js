// Production Configuration for Cross-Device File Transfer
// This configuration is optimized for reliable cross-device connectivity

class ProductionConfig {
    static getOptimizedIceServers() {
        return [
            // Google STUN servers (most reliable)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            
            // Additional STUN servers for redundancy
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.voiparound.com' },
            
            // Multiple TURN servers for cross-network connectivity
            {
                urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:relay1.expressturn.com:3478',
                username: 'efJBIBVP6ETOFD3XKX',
                credential: 'WmtzanB3ZnpERzRYVw'
            },
            {
                urls: 'turn:numb.viagenie.ca',
                username: 'webrtc@live.com',
                credential: 'muazkh'
            }
        ];
    }

    static getConnectionConfig() {
        return {
            // Very aggressive timeouts for production
            p2pTimeout: 3000,           // 3 seconds max for P2P attempts
            fallbackTimeout: 1000,      // 1 second before starting fallback preparation
            maxConnectionAttempts: 1,   // Only try P2P once, then fallback
            
            // Socket.io configuration for production
            socketConfig: {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 10,
                timeout: 20000,
                forceNew: true,
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true,
                pingTimeout: 60000,
                pingInterval: 25000
            },
            
            // WebRTC configuration optimized for reliability
            webrtcConfig: {
                iceServers: this.getOptimizedIceServers(),
                iceCandidatePoolSize: 15,
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            }
        };
    }

    static shouldSkipP2P() {
        // Skip P2P entirely in certain conditions for faster fallback
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
        const isOnSameNetwork = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1';
        
        // For production, always try server relay first on mobile
        if (isMobile && !isOnSameNetwork) {
            console.log('📱 Mobile device detected in production - prioritizing server relay');
            return true;
        }
        
        return false;
    }

    static getServerUrl() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Production environment
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '0.0.0.0') {
            return `${protocol}//${hostname}${port ? ':' + port : ''}`;
        } 
        // Local development
        else {
            if (port === '8000') {
                return `http://${hostname}:4999`;
            }
            return `http://${hostname}:4999`;
        }
    }
}

// Export for use in main app
window.ProductionConfig = ProductionConfig;

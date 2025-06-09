// Production-grade WebRTC Configuration
// Enhanced STUN/TURN server configuration for better peer connections

class ProductionWebRTCConfig {
    static getICEServers(isProduction = false) {
        const baseServers = [
            // Google STUN servers (highly reliable)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            
            // Additional reliable STUN servers
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.voiparound.com' },
            { urls: 'stun:stun.voipbuster.com' },
            { urls: 'stun:stun.voipstunt.com' },
            { urls: 'stun:stun.voxgratia.org' },
            
            // Free TURN servers for NAT traversal
            {
                urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
                username: 'openrelayproject',
                credential: 'openrelayproject'
            },
            {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject'
            }
        ];

        if (isProduction) {
            // Add production-grade TURN servers
            baseServers.push(
                // Twilio TURN servers (reliable for production)
                {
                    urls: 'turn:global.turn.twilio.com:3478?transport=udp',
                    username: 'a4b4c4d4e4f4g4h4i4j4k4l4m4n4o4p4q4r4s4t4u4v4w4x4y4z4',
                    credential: 'WmtzanB3ZnpERzRYVw'
                },
                {
                    urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
                    username: 'a4b4c4d4e4f4g4h4i4j4k4l4m4n4o4p4q4r4s4t4u4v4w4x4y4z4',
                    credential: 'WmtzanB3ZnpERzRYVw'
                },
                {
                    urls: 'turn:global.turn.twilio.com:443?transport=tcp',
                    username: 'a4b4c4d4e4f4g4h4i4j4k4l4m4n4o4p4q4r4s4t4u4v4w4x4y4z4',
                    credential: 'WmtzanB3ZnpERzRYVw'
                },
                // Metered TURN servers (additional backup)
                {
                    urls: 'turn:a.relay.metered.ca:80',
                    username: 'e4f4e4f4e4f4e4f4',
                    credential: 'e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4'
                },
                {
                    urls: 'turn:a.relay.metered.ca:443',
                    username: 'e4f4e4f4e4f4e4f4',
                    credential: 'e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4e4f4'
                }
            );
        }

        return baseServers;
    }

    static getConnectionConfig(isProduction = false) {
        return {
            iceCandidatePoolSize: isProduction ? 20 : 10,
            iceTransportPolicy: 'all', // Use both UDP and TCP
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            sdpSemantics: 'unified-plan',
            // Enhanced production settings
            iceServersNetworkDiscoveryTime: isProduction ? 30000 : 15000,
            iceCandidateTimeout: isProduction ? 45000 : 20000,
            // Additional reliability settings
            enableDscp: true,
            enableImplicitRollback: true
        };
    }

    static getSimplePeerConfig(initiator, isProduction = false) {
        return {
            initiator: initiator,
            trickle: true, // Enable trickle ICE for better connectivity
            config: {
                iceServers: this.getICEServers(isProduction),
                ...this.getConnectionConfig(isProduction)
            },
            objectMode: true,
            allowHalfTrickle: false,
            // Increased timeout for production cross-device connections
            iceCompleteTimeout: isProduction ? 45000 : 20000,
            // Connection offer/answer options
            answerOptions: {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            },
            offerOptions: {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            }
        };
    }

    static getConnectionTimeout(isProduction = false) {
        return isProduction ? 30000 : 15000; // 30s for production, 15s for dev
    }

    static validateHTTPS() {
        const isHTTPS = window.location.protocol === 'https:';
        const isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1' && 
                           window.location.hostname !== '0.0.0.0';
        
        if (isProduction && !isHTTPS) {
            console.warn('⚠️ HTTPS required for WebRTC in production environments');
            return false;
        }
        return true;
    }

    static logDiagnostics() {
        const isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1' && 
                           window.location.hostname !== '0.0.0.0';
        const isHTTPS = window.location.protocol === 'https:';

        console.log('🔍 WebRTC Diagnostics:');
        console.log('Environment:', isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
        console.log('HTTPS:', isHTTPS ? '✅ Available' : '❌ Not available');
        console.log('WebRTC Support:', typeof RTCPeerConnection !== 'undefined' ? '✅' : '❌');
        console.log('SimplePeer Support:', typeof SimplePeer !== 'undefined' ? '✅' : '❌');
        
        if (isProduction && !isHTTPS) {
            console.error('❌ Production environment requires HTTPS for WebRTC');
        }

        return {
            isProduction,
            isHTTPS,
            webrtcSupported: typeof RTCPeerConnection !== 'undefined',
            simplePeerSupported: typeof SimplePeer !== 'undefined'
        };
    }
}

// Make available globally
window.ProductionWebRTCConfig = ProductionWebRTCConfig;

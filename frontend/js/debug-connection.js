// Debug Connection Script
// Add this script to your HTML to help debug connection issues

console.log('=== TransferHub Connection Debug ===');
console.log('Current URL:', window.location.href);
console.log('Protocol:', window.location.protocol);
console.log('Hostname:', window.location.hostname);
console.log('Port:', window.location.port);
console.log('Environment:', window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'Production' : 'Development');

// Function to test server connectivity
function testServerConnection() {
    const getServerUrl = () => {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        let port = window.location.port;
        
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}${port ? ':' + port : ''}`;
        } else {
            if (port === '8000') {
                return `http://${hostname}:3001`;
            } else {
                return `http://${hostname}:3001`;
            }
        }
    };
    
    const serverUrl = getServerUrl();
    console.log('Testing connection to:', serverUrl);
    
    // Test API endpoint
    fetch(`${serverUrl}/api`)
        .then(response => response.json())
        .then(data => {
            console.log('✓ API connection successful:', data);
        })
        .catch(error => {
            console.error('✗ API connection failed:', error);
        });
    
    // Test health endpoint
    fetch(`${serverUrl}/health`)
        .then(response => response.json())
        .then(data => {
            console.log('✓ Health check successful:', data);
        })
        .catch(error => {
            console.error('✗ Health check failed:', error);
        });
    
    // Test Socket.io connection
    console.log('Testing Socket.io connection...');
    const testSocket = io(serverUrl, {
        timeout: 5000,
        forceNew: true
    });
    
    testSocket.on('connect', () => {
        console.log('✓ Socket.io connection successful, ID:', testSocket.id);
        testSocket.disconnect();
    });
    
    testSocket.on('connect_error', (error) => {
        console.error('✗ Socket.io connection failed:', error);
    });
    
    testSocket.on('error', (error) => {
        console.error('✗ Socket.io error:', error);
    });
}

// Run test automatically if this is included
if (typeof window !== 'undefined') {
    window.testServerConnection = testServerConnection;
    console.log('Run testServerConnection() to test your connection');
    
    // Auto-run test after 2 seconds
    setTimeout(testServerConnection, 2000);
}

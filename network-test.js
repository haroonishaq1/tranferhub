const os = require('os');
const express = require('express');

// Get network interfaces
function getLocalIPs() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            // Skip over non-IPv4 and internal addresses
            if (net.family === 'IPv4' && !net.internal) {
                ips.push({
                    interface: name,
                    ip: net.address
                });
            }
        }
    }
    
    return ips;
}

console.log('\n=== NETWORK CONFIGURATION CHECK ===\n');

const localIPs = getLocalIPs();
console.log('📍 Your Local IP Addresses:');
localIPs.forEach(({ interface, ip }) => {
    console.log(`   ${interface}: ${ip}`);
});

console.log('\n🔗 To allow cross-device transfers:');
console.log('1. Start your backend server:');
console.log('   cd backend && npm start');
console.log('\n2. Share this URL with your friend:');
if (localIPs.length > 0) {
    const mainIP = localIPs.find(ip => ip.interface.includes('Wi-Fi') || ip.interface.includes('Ethernet')) || localIPs[0];
    console.log(`   http://${mainIP.ip}:4999`);
} else {
    console.log('   http://YOUR_IP:4999 (replace YOUR_IP with your network IP)');
}

console.log('\n⚠️  IMPORTANT:');
console.log('- Make sure Windows Firewall allows port 4999');
console.log('- Both devices should be on the same network (WiFi)');
console.log('- If it still doesn\'t work, try using ngrok or deploy to cloud');

console.log('\n🧪 TESTING:');
console.log('Your friend can test the connection by visiting the URL above');
console.log('If they see the file transfer page, P2P should work!');

// Test if we can create a simple server
const testPort = 4999;
const testApp = express();

testApp.get('/test', (req, res) => {
    res.json({ 
        status: 'Server is accessible!', 
        timestamp: new Date().toISOString(),
        clientIP: req.ip
    });
});

console.log('\n🔧 Starting test server...');
const server = testApp.listen(testPort, '0.0.0.0', () => {
    console.log(`✅ Test server running on port ${testPort}`);
    console.log(`   Test URL: http://localhost:${testPort}/test`);
    if (localIPs.length > 0) {
        const mainIP = localIPs[0];
        console.log(`   External test URL: http://${mainIP.ip}:${testPort}/test`);
    }
    console.log('\nPress Ctrl+C to stop the test server');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down test server...');
    server.close(() => {
        console.log('Server stopped');
        process.exit(0);
    });
});

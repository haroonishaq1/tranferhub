#!/usr/bin/env node

// Test script for cross-device transfer functionality
const io = require('socket.io-client');

console.log('🧪 Testing Cross-Device Transfer Functionality');
console.log('='.repeat(50));

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:10000';
const TEST_FILE_DATA = 'data:text/plain;base64,' + Buffer.from('Hello, Cross-Device Transfer!').toString('base64');

let senderSocket, receiverSocket, transferCode;

// Helper function to wait for a specific event
function waitForEvent(socket, eventName, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${eventName}`));
    }, timeout);
    
    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function runTest() {
  try {
    console.log(`📡 Connecting to server: ${SERVER_URL}`);
    
    // Create sender connection
    senderSocket = io(SERVER_URL, {
      forceNew: true,
      transports: ['websocket', 'polling']
    });
    
    // Create receiver connection
    receiverSocket = io(SERVER_URL, {
      forceNew: true,
      transports: ['websocket', 'polling']
    });
    
    // Wait for both connections
    await Promise.all([
      waitForEvent(senderSocket, 'connect'),
      waitForEvent(receiverSocket, 'connect')
    ]);
    
    console.log('✅ Both clients connected');
    console.log(`   Sender ID: ${senderSocket.id}`);
    console.log(`   Receiver ID: ${receiverSocket.id}`);
    
    // Step 1: Generate transfer code
    console.log('\n📝 Step 1: Generating transfer code...');
    senderSocket.emit('generate-code');
    const codeData = await waitForEvent(senderSocket, 'code-generated');
    transferCode = codeData.code;
    console.log(`✅ Code generated: ${transferCode}`);
    
    // Step 2: Receiver joins
    console.log('\n👥 Step 2: Receiver joining transfer...');
    receiverSocket.emit('join-room', { code: transferCode });
    
    // Wait for both sides to acknowledge connection
    const [senderEvent, receiverEvent] = await Promise.all([
      waitForEvent(senderSocket, 'receiver-joined', 15000),
      waitForEvent(receiverSocket, 'joined-room', 15000)
    ]);
    
    console.log('✅ Both sides connected');
    
    // Step 3: Wait for connection failure and fallback to server relay
    console.log('\n🔄 Step 3: Waiting for WebRTC failure and server relay fallback...');
    
    // Listen for relay events on sender
    senderSocket.on('relay-file-upload-ack', (data) => {
      console.log(`   📤 File upload acknowledged: ${data.fileName}`);
    });
    
    senderSocket.on('relay-upload-complete-ack', (data) => {
      console.log(`   ✅ Upload complete acknowledged for code: ${data.code}`);
    });
    
    // Listen for relay events on receiver
    let receivedFiles = [];
    receiverSocket.on('relay-file-download', (data) => {
      console.log(`   📥 File received: ${data.fileData.name} (${data.fileIndex + 1}/${data.totalFiles})`);
      receivedFiles.push(data.fileData);
    });
    
    receiverSocket.on('relay-download-complete', (data) => {
      console.log(`   ✅ Download complete: ${data.totalFiles} files`);
    });
    
    // Wait a bit for WebRTC to fail (should timeout after 10 seconds)
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    // Step 4: Simulate file upload to server
    console.log('\n📤 Step 4: Uploading test file via server relay...');
    
    const testFileData = {
      name: 'test-cross-device.txt',
      size: 29,
      type: 'text/plain',
      lastModified: Date.now(),
      data: TEST_FILE_DATA
    };
    
    senderSocket.emit('relay-file-upload', {
      code: transferCode,
      fileData: testFileData,
      fileIndex: 0,
      totalFiles: 1
    });
    
    // Wait for upload acknowledgment
    await waitForEvent(senderSocket, 'relay-file-upload-ack');
    
    // Mark upload complete
    senderSocket.emit('relay-upload-complete', {
      code: transferCode,
      totalFiles: 1
    });
    
    await waitForEvent(senderSocket, 'relay-upload-complete-ack');
    console.log('✅ File uploaded to server');
    
    // Step 5: Receiver requests files
    console.log('\n📥 Step 5: Receiver requesting files from server...');
    
    receiverSocket.emit('relay-file-request', {
      code: transferCode
    });
    
    // Wait for file download
    await waitForEvent(receiverSocket, 'relay-file-download');
    await waitForEvent(receiverSocket, 'relay-download-complete');
    
    console.log('✅ File downloaded from server');
    
    // Step 6: Verify file content
    console.log('\n🔍 Step 6: Verifying file content...');
    
    if (receivedFiles.length === 1) {
      const receivedFile = receivedFiles[0];
      if (receivedFile.name === testFileData.name && 
          receivedFile.data === testFileData.data) {
        console.log('✅ File content verified successfully');
      } else {
        throw new Error('File content verification failed');
      }
    } else {
      throw new Error(`Expected 1 file, received ${receivedFiles.length}`);
    }
    
    console.log('\n🎉 Cross-Device Transfer Test PASSED!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    console.log('='.repeat(50));
    process.exit(1);
  } finally {
    // Cleanup
    if (senderSocket) senderSocket.disconnect();
    if (receiverSocket) receiverSocket.disconnect();
    
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

// Run the test
runTest();

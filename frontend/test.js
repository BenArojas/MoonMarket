const WebSocket = require('ws');
const axios = require('axios');

async function checkAuthStatus() {
  try {
    const response = await axios.get('http://localhost:8000/auth/status');
    console.log('Authentication status:', response.data);
    return response.data.authenticated;
  } catch (error) {
    console.error('Error checking authentication status:', error.message);
    return false;
  }
}

async function connectWebSocket(attempt = 1, maxAttempts = 3, delay = 2000) {
  if (attempt > maxAttempts) {
    console.error(`Failed to connect to WebSocket server after ${maxAttempts} attempts`);
    return;
  }

  console.log(`Attempting WebSocket connection (Attempt ${attempt}/${maxAttempts})`);
  const ws = new WebSocket('ws://localhost:8765');

  ws.on('open', () => {
    console.log('Connected to WebSocket server');
    // Send a test message
    ws.send(JSON.stringify({ type: 'test', message: 'Hello from Node.js client' }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received message:', message);
    } catch (error) {
      console.error('Error parsing message:', error.message);
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`Disconnected from WebSocket server: Code ${code}, Reason: ${reason}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (attempt < maxAttempts) {
      console.log(`Retrying connection in ${delay}ms...`);
      setTimeout(() => connectWebSocket(attempt + 1, maxAttempts, delay), delay);
    }
  });

  // Timeout to close connection if no response
  setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket connection timed out');
      ws.close();
    }
  }, 5000);
}

async function testWebSocket() {
  // Check authentication status
  const isAuthenticated = await checkAuthStatus();
  if (!isAuthenticated) {
    console.log('Cannot connect to WebSocket server: Please authenticate at https://localhost:5000');
    return;
  }

  // Attempt WebSocket connection
  await connectWebSocket();
}

// Run the test
testWebSocket();
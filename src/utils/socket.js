// src/utils/socket.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.userInfo = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.eventListenersAttached = false;
  }

  connect(userInfo) {
    // Prevent multiple connections
    if (this.socket && this.socket.connected) {
      console.log('📌 Socket already connected, reusing existing connection');
      return this.socket;
    }

    // Store user info for reconnection attempts
    this.userInfo = userInfo;
    
    // Get backend URL from environment variable
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    
    console.log('🔌 Connecting to backend:', backendUrl);
    
    // Disconnect any existing connection first
    if (this.socket) {
      this.cleanupSocket();
    }
    
    // Create new socket connection with stable configuration
    this.socket = io(backendUrl, {
      transports: ['polling', 'websocket'], // Start with polling for stability
      timeout: 30000,
      forceNew: false, // Don't force new connection every time
      reconnection: false, // Disable automatic reconnection to prevent loops
      withCredentials: true,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: false
    });

    // Set up connection event handlers
    this.setupEventHandlers();
    
    return this.socket;
  }

  setupEventHandlers() {
    if (!this.socket || this.eventListenersAttached) return;
    
    console.log('🔧 Setting up socket event handlers...');
    this.eventListenersAttached = true;

    // Connection established
    this.socket.on('connect', () => {
      console.log('✅ Connected to Render backend - ID:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Authenticate user when connected
      if (this.userInfo) {
        this.authenticate(this.userInfo);
      }
    });

    // Disconnection handling
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from backend. Reason:', reason);
      this.isConnected = false;
      
      // Don't attempt manual reconnection to prevent loops
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected the client');
      } else if (reason === 'io client disconnect') {
        console.log('🛑 Client disconnected manually');
      } else if (reason === 'ping timeout') {
        console.log('⏰ Connection timed out');
      }
    });

    // Connection error handling
    this.socket.on('connect_error', (error) => {
      console.error('🚫 Connection error:', error.message);
      this.isConnected = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
      }
    });
  }

  authenticate(userInfo) {
    if (this.socket && this.socket.connected) {
      console.log('🔐 Authenticating user:', userInfo.nickname);
      this.socket.emit('authenticate', userInfo);
    } else {
      console.warn('⚠️ Cannot authenticate: socket not connected');
    }
  }

  joinRoom(roomData) {
    if (this.socket && this.socket.connected) {
      console.log('🏠 Joining room:', roomData.type, roomData.code || '');
      this.socket.emit('join-room', roomData);
    } else {
      console.warn('⚠️ Cannot join room: socket not connected');
    }
  }

  sendMessage(message) {
    if (this.socket && this.socket.connected) {
      console.log('💬 Sending message:', message);
      this.socket.emit('send-message', { content: message });
      return true;
    } else {
      console.warn('⚠️ Cannot send message: socket not connected');
      return false;
    }
  }

  // Event listener registration methods with duplicate prevention
  onAuthenticated(callback) {
    if (this.socket) {
      this.socket.off('authenticated'); // Remove existing listeners
      this.socket.on('authenticated', (data) => {
        console.log('✅ User authenticated:', data);
        callback(data);
      });
    }
  }

  onRoomJoined(callback) {
    if (this.socket) {
      this.socket.off('room-joined'); // Remove existing listeners
      this.socket.on('room-joined', (data) => {
        console.log('✅ Room joined:', data);
        callback(data);
      });
    }
  }

  onMessageReceived(callback) {
    if (this.socket) {
      this.socket.off('receive-message'); // Remove existing listeners
      this.socket.on('receive-message', (data) => {
        console.log('📨 Message received:', data);
        callback(data);
      });
    }
  }

  onUserJoined(callback) {
    if (this.socket) {
      this.socket.off('user-joined'); // Remove existing listeners
      this.socket.on('user-joined', (data) => {
        console.log('👋 User joined:', data.user.nickname);
        callback(data);
      });
    }
  }

  onUserLeft(callback) {
    if (this.socket) {
      this.socket.off('user-left'); // Remove existing listeners
      this.socket.on('user-left', (data) => {
        console.log('👋 User left:', data.nickname);
        callback(data);
      });
    }
  }

  // Connection status methods
  isSocketConnected() {
    return this.socket && this.socket.connected && this.isConnected;
  }

  getConnectionState() {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'disconnected';
  }

  // Clean up socket without full disconnect
  cleanupSocket() {
    if (this.socket) {
      console.log('🧹 Cleaning up existing socket...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.eventListenersAttached = false;
    }
  }

  // Graceful disconnect with cleanup
  disconnect() {
    console.log('🧹 Disconnecting socket service...');
    
    if (this.socket) {
      // Remove all event listeners to prevent memory leaks
      this.socket.removeAllListeners();
      
      // Disconnect the socket
      this.socket.disconnect();
      
      // Clear the socket reference
      this.socket = null;
    }
    
    // Reset connection state
    this.isConnected = false;
    this.userInfo = null;
    this.reconnectAttempts = 0;
    this.eventListenersAttached = false;
    
    console.log('✅ Socket service disconnected and cleaned up');
  }

  // Utility method to manually trigger reconnection
  forceReconnect() {
    if (this.socket) {
      console.log('🔄 Forcing reconnection...');
      this.cleanupSocket();
      if (this.userInfo) {
        this.connect(this.userInfo);
      }
    }
  }

  // Health check method
  ping() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('ping');
    }
  }

  onPong(callback) {
    if (this.socket) {
      this.socket.off('pong'); // Remove existing listeners
      this.socket.on('pong', callback);
    }
  }
}

// Create and export a single instance
const socketServiceInstance = new SocketService();
export default socketServiceInstance;

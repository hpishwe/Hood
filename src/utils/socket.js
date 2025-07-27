// src/utils/socket.js
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.userInfo = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(userInfo) {
    // Store user info for reconnection attempts
    this.userInfo = userInfo;
    
    // Get backend URL from environment variable
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    
    console.log('🔌 Connecting to backend:', backendUrl);
    
    // Disconnect any existing connection first
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Create new socket connection with robust configuration
    this.socket = io(backendUrl, {
      transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
      timeout: 30000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      withCredentials: true,
      autoConnect: true,
      upgrade: true, // Allow transport upgrades
      rememberUpgrade: false // Don't remember the upgrade for next time
    });

    // Set up connection event handlers
    this.setupEventHandlers();
    
    return this.socket;
  }

  setupEventHandlers() {
    if (!this.socket) return;

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
      
      // Log different disconnect reasons for debugging
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected the client, will attempt to reconnect...');
      } else if (reason === 'io client disconnect') {
        console.log('🛑 Client disconnected manually');
      } else if (reason === 'ping timeout') {
        console.log('⏰ Connection timed out, attempting to reconnect...');
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

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt #${attemptNumber}`);
    });

    // Successful reconnection
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Re-authenticate after reconnection
      if (this.userInfo) {
        this.authenticate(this.userInfo);
      }
    });

    // Failed to reconnect
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Failed to reconnect after maximum attempts');
      this.isConnected = false;
    });
  }

  authenticate(userInfo) {
    if (this.socket && this.isConnected) {
      console.log('🔐 Authenticating user:', userInfo.nickname);
      this.socket.emit('authenticate', userInfo);
    } else {
      console.warn('⚠️  Cannot authenticate: socket not connected');
    }
  }

  joinRoom(roomData) {
    if (this.socket && this.isConnected) {
      console.log('🏠 Joining room:', roomData.type, roomData.code || '');
      this.socket.emit('join-room', roomData);
    } else {
      console.warn('⚠️  Cannot join room: socket not connected');
    }
  }

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      console.log('💬 Sending message:', message);
      this.socket.emit('send-message', { content: message });
    } else {
      console.warn('⚠️  Cannot send message: socket not connected');
      return false;
    }
    return true;
  }

  // Event listener registration methods
  onAuthenticated(callback) {
    if (this.socket) {
      this.socket.on('authenticated', (data) => {
        console.log('✅ User authenticated:', data);
        callback(data);
      });
    }
  }

  onRoomJoined(callback) {
    if (this.socket) {
      this.socket.on('room-joined', (data) => {
        console.log('✅ Room joined:', data);
        callback(data);
      });
    }
  }

  onMessageReceived(callback) {
    if (this.socket) {
      this.socket.on('receive-message', (data) => {
        console.log('📨 Message received:', data);
        callback(data);
      });
    }
  }

  onUserJoined(callback) {
    if (this.socket) {
      this.socket.on('user-joined', (data) => {
        console.log('👋 User joined:', data.user.nickname);
        callback(data);
      });
    }
  }

  onUserLeft(callback) {
    if (this.socket) {
      this.socket.on('user-left', (data) => {
        console.log('👋 User left:', data.nickname);
        callback(data);
      });
    }
  }

  // Connection status methods
  isSocketConnected() {
    return this.socket && this.isConnected && this.socket.connected;
  }

  getConnectionState() {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'disconnected';
  }

  // Graceful disconnect with cleanup
  disconnect() {
    console.log('🧹 Cleaning up socket connection...');
    
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
    
    console.log('✅ Socket cleanup completed');
  }

  // Utility method to manually trigger reconnection
  forceReconnect() {
    if (this.socket) {
      console.log('🔄 Forcing reconnection...');
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Health check method
  ping() {
    if (this.socket && this.isConnected) {
      this.socket.emit('ping');
    }
  }

  onPong(callback) {
    if (this.socket) {
      this.socket.on('pong', callback);
    }
  }
}

// Create and export a single instance
const socketServiceInstance = new SocketService();
export default socketServiceInstance;

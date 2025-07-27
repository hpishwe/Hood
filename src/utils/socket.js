// src/utils/socket.js
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(userInfo) {
    if (!this.socket) {
      this.socket = io(BACKEND_URL, {
        transports: ['websocket'],
        upgrade: false
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server');
        this.isConnected = true;
        
        // Authenticate user when connected
        if (userInfo) {
          this.authenticate(userInfo);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        this.isConnected = false;
      });
    }
    
    return this.socket;
  }

  authenticate(userInfo) {
    if (this.socket && this.isConnected) {
      this.socket.emit('authenticate', userInfo);
    }
  }

  joinRoom(roomData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-room', roomData);
    }
  }

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send-message', { content: message });
    }
  }

  onAuthenticated(callback) {
    if (this.socket) {
      this.socket.on('authenticated', callback);
    }
  }

  onRoomJoined(callback) {
    if (this.socket) {
      this.socket.on('room-joined', callback);
    }
  }

  onMessageReceived(callback) {
    if (this.socket) {
      this.socket.on('receive-message', callback);
    }
  }

  onUserJoined(callback) {
    if (this.socket) {
      this.socket.on('user-joined', callback);
    }
  }

  onUserLeft(callback) {
    if (this.socket) {
      this.socket.on('user-left', callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

const socketServiceInstance = new SocketService();
export default socketServiceInstance;

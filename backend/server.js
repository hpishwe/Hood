// backend/server.js
const express = require('express');
const http = require('http');

const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000","https://*.vercel.app" ],
    methods: ["GET", "POST"]
  }
});

// In-memory room management
const activeRooms = new Map(); // roomId -> Set of users

// Middleware
app.use(cors({
  origin: ["http://localhost:3000","https://*.vercel.app"]
}));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hood Backend API',
    status: 'Running',
    endpoints: {
      health: '/api/health',
      socket: 'ws://localhost:5000'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);
  
  // Handle authentication
  socket.on('authenticate', (userData) => {
    console.log('🔐 User authenticating:', userData.nickname);
    
    // Store user session
    socket.userSession = {
      sessionId: userData.sessionId,
      nickname: userData.nickname,
      avatar: userData.avatar,
      socketId: socket.id
    };
    
    // Send success response
    socket.emit('authenticated', {
      success: true,
      sessionId: userData.sessionId,
      nickname: userData.nickname
    });
    
    console.log(`✅ User authenticated: ${userData.nickname}`);
  });
  
  // Handle room joining with proper participant management
  socket.on('join-room', (roomData) => {
    console.log('🏠 User joining room:', roomData.type, roomData.code || '');
    
    let roomId;
    if (roomData.type === 'global') {
      roomId = 'global-main';
    } else if (roomData.type === 'local') {
      roomId = 'local-main';
    } else if (roomData.code) {
      roomId = roomData.code;
    } else {
      roomId = `room-${Date.now()}`;
    }
    
    // Initialize room if doesn't exist
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Set());
    }
    
    // Add current user to room
    const currentUser = {
      sessionId: socket.userSession.sessionId,
      nickname: socket.userSession.nickname,
      avatar: socket.userSession.avatar,
      socketId: socket.id,
      isActive: true
    };
    
    activeRooms.get(roomId).add(currentUser);
    
    // Join the socket room
    socket.join(roomId);
    socket.currentRoom = roomId;
    
    // Get all participants in room
    const allParticipants = Array.from(activeRooms.get(roomId));
    
    console.log(`👥 Room ${roomId} now has ${allParticipants.length} participants:`, 
                allParticipants.map(p => p.nickname));
    
    // Send room joined response with ALL participants
    socket.emit('room-joined', {
      room: {
        roomId: roomId,
        type: roomData.type,
        name: `${roomData.type} Hood`,
        code: roomData.code,
        participants: allParticipants
      }
    });
    
    // Notify others in room that new user joined with updated participant list
    socket.to(roomId).emit('user-joined', {
      user: currentUser,
      roomId: roomId,
      allParticipants: allParticipants
    });
    
    console.log(`✅ User ${socket.userSession.nickname} joined room ${roomId} with ${allParticipants.length} total users`);
  });
  
  // Handle messages
  socket.on('send-message', (messageData) => {
    if (!socket.userSession || !socket.currentRoom) {
      socket.emit('message-error', { error: 'Not in a room' });
      return;
    }
    
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user: socket.userSession.nickname,
      avatar: socket.userSession.avatar,
      content: messageData.content,
      timestamp: new Date().toISOString(),
      roomId: socket.currentRoom
    };
    
    // Send message to all users in room
    io.to(socket.currentRoom).emit('receive-message', message);
    
    console.log(`💬 Message in ${socket.currentRoom}: ${message.content}`);
  });
  
  // Handle disconnect with proper room cleanup
  socket.on('disconnect', () => {
    if (socket.userSession && socket.currentRoom) {
      const roomId = socket.currentRoom;
      
      // Remove user from active room
      if (activeRooms.has(roomId)) {
        const roomUsers = activeRooms.get(roomId);
        
        // Remove user from set
        for (let user of roomUsers) {
          if (user.socketId === socket.id) {
            roomUsers.delete(user);
            break;
          }
        }
        
        // Get updated participant list
        const updatedParticipants = Array.from(roomUsers);
        
        // Notify others of user leaving with updated participant list
        socket.to(roomId).emit('user-left', {
          sessionId: socket.userSession.sessionId,
          nickname: socket.userSession.nickname,
          roomId: roomId,
          allParticipants: updatedParticipants
        });
        
        console.log(`❌ User ${socket.userSession.nickname} left room ${roomId}. ${updatedParticipants.length} users remaining`);
        
        // Clean up empty rooms
        if (roomUsers.size === 0) {
          activeRooms.delete(roomId);
          console.log(`🗑️ Deleted empty room: ${roomId}`);
        }
      }
    } else {
      console.log('❌ User disconnected:', socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
});



module.exports = app;

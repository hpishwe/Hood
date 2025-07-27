// backend/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Production CORS setup for Render + Vercel
const allowedOrigins = [
  "http://localhost:3000",
  "https://hood-three.vercel.app",
  "https://hood-three-git-main-hpishwe.vercel.app", // Git branch deployments
  "https://hood-three-hpishwe.vercel.app",          // Alternative Vercel URL
  /^https:\/\/hood-.*\.vercel\.app$/,               // Any hood-* Vercel domain
  process.env.FRONTEND_URL
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowEIO3: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true
});

// Security and performance middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...allowedOrigins]
    }
  }
}));
app.use(compression());

// CORS middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json({ limit: '10mb' }));

// In-memory room management
const activeRooms = new Map(); // roomId -> Set of users

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hood Backend API',
    status: 'Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      socket: 'Socket.io enabled'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Hood Backend server is running!',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeRooms: activeRooms.size,
    timestamp: new Date().toISOString()
  });
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
      socketId: socket.id,
      joinedAt: new Date().toISOString()
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
      isActive: true,
      joinedAt: new Date().toISOString()
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

  // Handle ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Hood Backend server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for origins: ${allowedOrigins.join(', ')}`);
});

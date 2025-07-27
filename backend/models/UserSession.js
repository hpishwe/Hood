// backend/models/UserSession.js
const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  avatar: {
    type: String,
    required: true
  },
  currentRoom: {
    type: String,
    default: null
  },
  ipHash: {
    type: String,
    required: true,
    index: true
  },
  subnet: {
    type: String,
    index: true
  },
  socketId: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  expires: '24h'
});

userSessionSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

module.exports = mongoose.model('UserSession', userSessionSchema);

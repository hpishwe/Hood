// src/pages/ChatRoom.jsx
import React, { useState, useEffect , useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import socketService from '../utils/socket';
import styles from '../styles/ChatRoom.module.css';

export default function ChatRoom({ userInfo, roomInfo }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const navigate = useNavigate();

  const getRoomDisplayInfo = () => {
    if (!currentRoom && !roomInfo) return { name: 'Loading...', subtitle: '', icon: '💬' };
    
    if (roomInfo.type === 'global') {
      return {
        name: 'Global Village',
        subtitle: 'Connect with people worldwide',
        icon: '🌍'
      };
    } else if (roomInfo.type === 'local') {
      return {
        name: 'Neighborhood',
        subtitle: 'Chat with nearby people',
        icon: '🏘️'
      };
    } else if (roomInfo.code) {
      return {
        name: `Private Room`,
        subtitle: `Code: ${roomInfo.code}`,
        icon: '🔐'
      };
    }
    
    return {
      name: 'Anonymous Chat',
      subtitle: 'Private conversation',
      icon: '💬'
    };
  };

  useEffect(() => {
    if (!userInfo || !roomInfo) {
      navigate('/room-selection');
      return;
    }

    socketService.connect(userInfo);

    // Set up event listeners
    socketService.onAuthenticated((response) => {
      if (response.success) {
        console.log('✅ User authenticated:', response);
        setIsConnected(true);
        
        // Join room after authentication
        socketService.joinRoom(roomInfo);
      } else {
        console.error('❌ Authentication failed:', response.error);
      }
    });

    socketService.onRoomJoined((roomData) => {
      console.log('✅ Room joined:', roomData);
      setCurrentRoom(roomData.room);
      
      // Set ALL participants from backend
      const participants = roomData.room.participants || [];
      console.log('👥 Setting participants:', participants.map(p => p.nickname));
      setOnlineUsers(participants);
      
      // Get proper room display info
      const roomDisplayInfo = getRoomDisplayInfo();
      
      // Add welcome message with proper room name
      const welcomeMessage = {
        id: `welcome-${Date.now()}`,
        user: 'System',
        content: `Welcome to ${roomDisplayInfo.name}! 🎉 `,
        timestamp: new Date(),
        isSystem: true
      };
      setMessages([welcomeMessage]);
    });

    socketService.onMessageReceived((message) => {
      console.log('📨 Message received:', message);
      setMessages(prev => [...prev, {
        ...message,
        isOwn: message.user === userInfo.nickname
      }]);
    });

    socketService.onUserJoined((data) => {
      console.log('👋 User joined:', data.user.nickname);
      console.log('👥 Updated participants:', data.allParticipants?.map(p => p.nickname));
      
      // Update participant list with all participants if provided
      if (data.allParticipants) {
        setOnlineUsers(data.allParticipants);
      } else {
        // Fallback: just add the new user (avoid duplicates)
        setOnlineUsers(prev => {
          const existingUser = prev.find(u => u.sessionId === data.user.sessionId);
          if (existingUser) return prev;
          return [...prev, data.user];
        });
      }
      
      const joinMessage = {
        id: `join-${Date.now()}`,
        user: 'System',
        content: `${data.user.nickname} joined the room! 👋`,
        timestamp: new Date(),
        isSystem: true
      };
      setMessages(prev => [...prev, joinMessage]);
    });

    socketService.onUserLeft((data) => {
      console.log('👋 User left:', data.nickname);
      console.log('👥 Updated participants after leave:', data.allParticipants?.map(p => p.nickname));
      
      // Update participant list with remaining participants if provided
      if (data.allParticipants) {
        setOnlineUsers(data.allParticipants);
      } else {
        // Fallback: just remove the user
        setOnlineUsers(prev => prev.filter(user => user.sessionId !== data.sessionId));
      }
      
      const leaveMessage = {
        id: `leave-${Date.now()}`,
        user: 'System',
        content: `${data.nickname} left the room`,
        timestamp: new Date(),
        isSystem: true
      };
      setMessages(prev => [...prev, leaveMessage]);
    });

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, [userInfo, roomInfo, navigate, getRoomDisplayInfo]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && isConnected) {
      socketService.sendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave this room?')) {
      socketService.disconnect();
      navigate('/room-selection');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isConnected) {
    const roomDisplayInfo = getRoomDisplayInfo();
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>
          <div className={styles.loadingIcon}>🚀</div>
          <h2>Entering {roomDisplayInfo.name}...</h2>
          <p>Setting up your anonymous session</p>
          <div className={styles.loadingDots}>
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    );
  }

  const roomDisplayInfo = getRoomDisplayInfo();

  return (
    <div className={styles.chatContainer}>
      {/* Left Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.hoodInfo}>
            <div className={styles.hoodIcon}>{roomDisplayInfo.icon}</div>
            <div className={styles.hoodDetails}>
              <h2 className={styles.hoodName}>{roomDisplayInfo.name}</h2>
              <p className={styles.hoodSubtext}>{roomDisplayInfo.subtitle}</p>
              <div className={styles.peopleCount}>
                <span className={styles.onlineIndicator}>●</span>
                {onlineUsers.length} {onlineUsers.length === 1 ? 'person' : 'people'} active
              </div>
            </div>
          </div>
        </div>

        <div className={styles.userSection}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>👥</span>
            Active Members
          </h3>
          <div className={styles.usersList}>
            {onlineUsers.map((user, index) => (
              <div key={user.sessionId || index} className={styles.userItem}>
                <div className={styles.userAvatarContainer}>
                  <img src={user.avatar} alt={user.nickname} className={styles.userAvatar} />
                  <div className={styles.statusDot}></div>
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {user.nickname}
                    {user.nickname === userInfo.nickname && (
                      <span className={styles.youTag}>YOU</span>
                    )}
                  </span>
                  <span className={styles.userStatus}>online</span>
                </div>
              </div>
            ))}
          </div>
          
          {onlineUsers.length === 0 && (
            <div className={styles.emptyUsersList}>
              <p>No users in this room yet...</p>
            </div>
          )}
        </div>

        <div className={styles.sidebarActions}>
          <button className={styles.actionButton}>
            <span className={styles.actionIcon}>🔍</span>
            Search
          </button>
          <button className={styles.actionButton}>
            <span className={styles.actionIcon}>⚙️</span>
            Settings
          </button>
          <button className={styles.leaveButton} onClick={handleLeaveRoom}>
            <span className={styles.actionIcon}>🚪</span>
            Leave Room
          </button>
        </div>
      </div>

      {/* Right Chat Area */}
      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>{roomDisplayInfo.icon}</div>
            <div className={styles.headerInfo}>
              <h3 className={styles.headerTitle}>{roomDisplayInfo.name}</h3>
              <span className={styles.headerSubtitle}>
                {onlineUsers.length} active • Anonymous chat
              </span>
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.connectionBadge}>
              <span className={styles.connectionDot}></span>
              Connected
            </div>
          </div>
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((msg) => (
            <div key={msg.id} className={`${styles.messageWrapper} ${msg.isOwn ? styles.ownMessage : styles.otherMessage} ${msg.isSystem ? styles.systemMessage : ''}`}>
              {!msg.isOwn && !msg.isSystem && (
                <img src={msg.avatar} alt={msg.user} className={styles.messageAvatar} />
              )}
              <div className={styles.messageContent}>
                {!msg.isOwn && !msg.isSystem && (
                  <span className={styles.messageSender}>{msg.user}</span>
                )}
                <div className={styles.messageText}>{msg.content}</div>
                {!msg.isSystem && (
                  <span className={styles.messageTime}>{formatTime(msg.timestamp)}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className={styles.messageInput}
              disabled={!isConnected}
            />
            <button 
              type="submit" 
              className={styles.sendButton} 
              disabled={!newMessage.trim() || !isConnected}
            >
              <span className={styles.sendIcon}>➤</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

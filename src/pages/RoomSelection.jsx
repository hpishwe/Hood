// src/pages/RoomSelection.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/RoomSelection.module.css';

export default function RoomSelection({ userInfo, onRoomSelect }) {
  const [selectedOption, setSelectedOption] = useState('global');
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (selectedOption === 'code' && !roomCode.trim()) {
      alert('Please enter a room code');
      return;
    }
    
    const roomData = {
      type: selectedOption,
      code: selectedOption === 'code' ? roomCode.trim() : null,
      roomId: selectedOption === 'code' ? roomCode.trim() : `${selectedOption}-${Date.now()}`,
      joinedAt: new Date().toISOString()
    };
    
    console.log('Joining room with data:', roomData);
    onRoomSelect(roomData);
    
    // Navigate to chat room
    navigate('/chat-room');
  };

  const handleCreateRoom = () => {
    // Generate a random 6-character room code
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const roomData = {
      type: 'custom',
      code: newRoomCode,
      roomId: newRoomCode,
      isCreator: true,
      joinedAt: new Date().toISOString()
    };
    
    console.log('Creating room:', roomData);
    
    // Call onRoomSelect to store room data
    onRoomSelect(roomData);
    
    // Show the room code to user before navigating
    alert(`Room created! Share this code: ${newRoomCode}`);
    
    // Navigate to chat room
    navigate('/chat-room');
  };

  const handleSearchRoom = () => {
    // For now, just simulate finding a room
    alert('Search functionality coming soon! For now, try joining a room.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.blob1}></div>
      <div className={styles.blob2}></div>
      
      <div className={styles.card}>
        {userInfo && (
          <div className={styles.userInfo}>
            <img src={userInfo.avatar} alt="Your avatar" className={styles.userAvatar} />
          </div>
        )}

        <h1 className={styles.heading}> Hey {userInfo.nickname}, where's your crew?</h1>

        <div className={styles.optionsSection}>
          <h2 className={styles.subheading}>Pick your hood</h2>
          
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.optionBtn} ${selectedOption === 'global' ? styles.active : ''}`}
              onClick={() => setSelectedOption('global')}
            >
              Global
            </button>
            <button 
              className={`${styles.optionBtn} ${selectedOption === 'local' ? styles.active : ''}`}
              onClick={() => setSelectedOption('local')}
            >
              Local
            </button>
            <button 
              className={`${styles.optionBtn} ${selectedOption === 'code' ? styles.active : ''}`}
              onClick={() => setSelectedOption('code')}
            >
              Code
            </button>
          </div>

          {selectedOption === 'code' && (
            <input
              className={styles.codeInput}
              type="text"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
          )}
        </div>

        <div className={styles.actionsSection}>
          <button className={styles.actionBtn} onClick={handleSearchRoom}>
            Search a hood
          </button>
          <button className={styles.actionBtn} onClick={handleCreateRoom}>
            Create a hood
          </button>
          
          <button 
            className={styles.joinBtn}
            onClick={handleJoinRoom}
            disabled={selectedOption === 'code' && !roomCode.trim()}
          >
            {selectedOption === 'code' ? 'Join Hood' : `Join ${selectedOption} Hood`}
          </button>
        </div>
      </div>
    </div>
  );
}

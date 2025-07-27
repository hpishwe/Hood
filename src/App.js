// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import PickName from './pages/PickNickname';
import RoomSelection from './pages/RoomSelection';
import ChatRoom from './pages/ChatRoom'; 
import './App.css';

function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null);

  const handleUserInfoSubmit = (userData) => {
    setUserInfo(userData);
    console.log('User info stored:', userData);
  };

  const handleRoomSelect = (roomData) => {
    setRoomInfo(roomData);
    console.log('Room selected:', roomData);
    console.log('User info:', userInfo);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Landing />} />
          
          <Route 
            path="/pick-nickname" 
            element={<PickName onSubmit={handleUserInfoSubmit} />} 
          />
          
          <Route 
            path="/room-selection" 
            element={
              userInfo ? (
                <RoomSelection 
                  userInfo={userInfo} 
                  onRoomSelect={handleRoomSelect} 
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/chat-room" 
            element={
              userInfo && roomInfo ? (
                <ChatRoom 
                  userInfo={userInfo} 
                  roomInfo={roomInfo}
                />
              ) : (
                <Navigate to="/room-selection" replace />
              )
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

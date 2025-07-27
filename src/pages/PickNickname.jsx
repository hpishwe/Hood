// src/pages/PickNickname.jsx
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import styles from "../styles/PickName.module.css";

// Add this function to generate UUID compatible with all browsers
const generateUUID = () => {
  return 'xxxx-xxxx-4xxx-yxxx-xxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const avatarOptions = [
  { src: "https://api.dicebear.com/7.x/micah/svg?seed=dance", alt: "Dance" },
  { src: "https://api.dicebear.com/7.x/micah/svg?seed=laugh", alt: "Laugh" },
  { src: "https://api.dicebear.com/7.x/micah/svg?seed=smile", alt: "Smile" },
  { src: "https://api.dicebear.com/7.x/micah/svg?seed=robot", alt: "Robot" },
  { src: "https://api.dicebear.com/7.x/micah/svg?seed=happy", alt: "Happy" },
  { src: "https://api.dicebear.com/7.x/micah/svg?seed=snake", alt: "Snake" },
  { src: "https://api.dicebear.com/7.x/micah/svg?seed=dog", alt: "Dog" },
  { src: "https://api.dicebear.com/7.x/micah/svg?seed=mouse", alt: "Mouse" },
];

function PickNickname({ onSubmit }) {
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0].src);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted!');
    console.log('Nickname:', nickname.trim());
    console.log('Selected Avatar:', selectedAvatar);
    
    if (nickname.trim() && selectedAvatar) {
      const userData = {
        nickname: nickname.trim(),
        avatar: selectedAvatar,
        timestamp: new Date().toISOString(),
        sessionId: generateUUID() // Use custom UUID generator instead of crypto.randomUUID()
      };
      
      console.log('Submitting user data:', userData);
      
      if (onSubmit) {
        onSubmit(userData);
      }
      
      console.log('Navigating to room selection...');
      navigate('/room-selection');
    } else {
      console.log('Form validation failed');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.blob1}></div>
      <div className={styles.blob2}></div>
      
      <div className={styles.card}>
        <div className={styles.heading}>
          Let's give you a vibe !
        </div>
        <div className={styles.subheading}>
          Keep it anonymous, keep it cool.
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.avatarsGrid}>
            {avatarOptions.map((av) => (
              <button
                type="button"
                key={av.alt}
                className={`${styles.avatarBtn} ${selectedAvatar === av.src ? styles.selected : ""}`}
                onClick={() => {
                  console.log('Avatar selected:', av.src);
                  setSelectedAvatar(av.src);
                }}
                aria-label={`Select ${av.alt} avatar`}
              >
                <img src={av.src} alt={av.alt} className={styles.avatarImg} />
              </button>
            ))}
          </div>
          
          <div className={styles.inputRow}>
            <input
              className={styles.nickInput}
              type="text"
              autoFocus
              maxLength={20}
              value={nickname}
              onChange={e => {
                console.log('Nickname changed:', e.target.value);
                setNickname(e.target.value);
              }}
              placeholder="Pick a name. Any name."
              required
            />
          </div>
          
          <button 
            className={styles.lockBtn} 
            type="submit"
            disabled={!nickname.trim() || !selectedAvatar}
          >
            Lock it in
          </button>
        </form>
      </div>
    </div>
  );
}

export default PickNickname;

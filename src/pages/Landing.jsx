// src/pages/Landing.jsx
import React from 'react';
import styles from '../styles/Landing.module.css';
import hoodLogo from '../assets/Hood.png';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();
  return (
    <div className={styles['landing-container']}>
      <div className={styles['logo-blob']}>
        <img
          src={hoodLogo}
          alt="Hood logo"
          className={styles['logo-fade-in']}
          style={{ width: 500, height: 500, display: 'block', margin: '0 auto 12px' }}
        />
      </div>
      <button type="button" className={styles['landing-button']} onClick={() => navigate('/pick-nickname')}>
        slide in !
      </button>
    </div>
  );
};

export default Landing;

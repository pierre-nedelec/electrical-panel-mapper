// src/components/HamburgerIcon.js
import React from 'react';
import { IconButton } from '@mui/material';
import './HamburgerIcon.css';

const HamburgerIcon = ({ isOpen, onClick }) => {
  return (
    <IconButton onClick={onClick} className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
      <div className="bar1"></div>
      <div className="bar2"></div>
      <div className="bar3"></div>
    </IconButton>
  );
};

export default HamburgerIcon;

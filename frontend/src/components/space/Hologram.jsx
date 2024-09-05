import React from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import styles from './spaceship.module.css';
import { DonutBarplotTransition } from '@/components/space/DonutBarplotTransition';
import { LinearProgress, Typography, Box } from '@mui/material';


function Hologram({ isActive, showHologram, data, onClose, Percentage }) {
  if (!(isActive && showHologram)) {
    return null;
  }

  return ReactDOM.createPortal(
    <div className={styles.hologramWrapper}>
      <motion.div
        className={styles.hologramScreen}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1] }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.hologramImage}></div>
        <div className={styles.screenOverlay}></div>
        <div className={styles.hologramContent}>
          <button className={styles.closeButton} onClick={onClose}>
            X
          </button>
          <Typography variant="h6" component="h2" sx={{ color: 'white', mb: 1 }}>
            {data.username + "'" + 's'} Portfolio
          </Typography>
          <Box sx={{ width: '50%'}}>
            <Typography variant="body2" sx={{ color: 'white', mb: 1 }}>
              Mission to the moon: {Math.round(Percentage)}% Completed!
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Percentage}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 5,
                  backgroundColor: 'white',
                },
              }}
            />
          </Box>
          {data.holdings.length === 0 ? (
            <Typography variant="body1" sx={{ color: 'white' }}>No holdings</Typography>
          ) : (
            <DonutBarplotTransition Holdingsdata={data.holdings} />
          )}

        </div>
      </motion.div>
    </div>,
    document.querySelector('.space-container')
  );
}

export default Hologram;
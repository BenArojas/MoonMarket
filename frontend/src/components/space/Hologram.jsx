import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './spaceship.module.css';
import { DonutBarplotTransition } from '@/components/space/DonutBarplotTransition';
import { LinearProgress, Typography, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from "@mui/material/IconButton";

function Hologram({ data, Percentage, handleExit }) {
  const handleClick = () => {
    handleExit();
  };
  return ReactDOM.createPortal(
    <AnimatePresence>

      <motion.div
        className={styles.hologramWrapper}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={styles.hologramScreen}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.hologramImage}></div>
          <div className={styles.screenOverlay}></div>
          <motion.div
            className={styles.hologramContent}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <IconButton onClick={handleClick} size="small" className={styles.closeButton}>
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" component="h2" sx={{ color: 'white', mb: 1 }}>
              {data.username + "'" + 's'} Portfolio
            </Typography>
            <Box sx={{ width: '50%' }}>
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
          </motion.div>
        </motion.div>
      </motion.div>

    </AnimatePresence>,
    document.querySelector('.space-container')
  );
}

export default Hologram;
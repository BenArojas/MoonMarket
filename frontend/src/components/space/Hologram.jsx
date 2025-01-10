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
        className={`${styles.hologramWrapper} fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={`${styles.hologramScreen} w-11/12 max-w-4xl h-5/6 max-h-[800px] flex flex-col items-center justify-center p-4 bg-gray-900 rounded-lg overflow-auto`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={`${styles.hologramImage} mb-4`}></div>
          <div className={styles.screenOverlay}></div>
          <motion.div
            className={`${styles.hologramContent} w-full max-w-3xl px-4 flex flex-col items-center`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <IconButton
              onClick={handleClick}
              size="small"
              className={`${styles.closeButton} self-end mb-2`}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
            <Typography
              variant="h6"
              component="h2"
              sx={{ color: 'white', mb: 2 }}
              className="text-center"
            >
              {data.username + "'" + 's'} Portfolio
            </Typography>
            <Box sx={{ width: '100%', maxWidth: '500px', mb: 2 }}>
              <Typography
                variant="body2"
                sx={{ color: 'white', mb: 1 }}
                className="text-center"
              >
                Mission to the moon: {Percentage.toFixed(2)}% Completed!
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
              <Typography
                variant="body1"
                sx={{ color: 'white' }}
                className="text-center"
              >
                No holdings
              </Typography>
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
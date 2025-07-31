import { Box } from '@mui/material';

export default function BlinkingDot() {
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: 'success.main', // Uses the theme's green color
        animation: 'blinking 1.5s infinite',
        // Define the animation using CSS keyframes
        '@keyframes blinking': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.4 },
          '100%': { opacity: 1 },
        },
      }}
    />
  );
}
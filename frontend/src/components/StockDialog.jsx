import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Slide from '@mui/material/Slide';
import { Box, Typography } from '@mui/material';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function AlertDialogSlide({ dialogOpen, setDialogOpen, stock }) {
  console.log(stock)

  const handleClose = () => {
    setDialogOpen(false);
  };

  return (
    <React.Fragment>
      <Dialog
        open={dialogOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
      >
        <DialogTitle sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <Typography variant="h3" sx={{
            textAlign: 'center',
          }}>{stock.name}</Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }} >
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',

            }}>
              <Typography variant="h4" sx={{
                letterSpacing: '-3px'
              }}>{stock.sharePrice}$</Typography>
              <Typography variant="body2" sx={{
              }}>Share price</Typography>
            </Box>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Typography variant="h4" sx={{ textAlign: 'center', letterSpacing: '-3px' }}>{stock.quantity}</Typography>
              <Typography variant="body2" sx={{
              }}>Number of shares owned</Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-slide-description">
            Let Google help apps determine location. This means sending anonymous
            location data to Google, even when no apps are running.
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}

import { Box, Divider, Stack, Typography } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Slide from "@mui/material/Slide";
import * as React from "react";
import dayjs from "dayjs";
import styles from "./stockDialog.module.css";
import { useTheme } from "@mui/material";
import { Stock } from "../leaderboards/LeaderboardCard";
import { TransitionProps } from "@mui/material/transitions";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface InfoBoxProps {
  text: string;
  subtitle: string;
}

interface InfoBoxProps{
  text: string;
  subtitle: string;
}

function InfoBox({ text, subtitle }: InfoBoxProps) {
  return (
    <Box className={styles.infoBox}>
      <Typography variant="h5" fontWeight={"bold"}>
        {text}{subtitle === 'Value' ? ' $': null}
      </Typography>
      <Typography variant="subtitle2">{subtitle}</Typography>
    </Box>
  );
}

interface AlertDialogSlideProps{
  dialogOpen: boolean
  setDialogOpen: (isOpen: boolean) => void
  stock: Stock
}

export default function AlertDialogSlide({ dialogOpen, setDialogOpen, stock }: AlertDialogSlideProps) {
  const theme = useTheme();
  const infoBoxText = [
    {
      text: dayjs(stock.earnings).format("DD.MM.YYYY"),
      subtitle: "Earnings",
    },
    {
      text: stock.percentageOfPortfolio.toFixed(2),
      subtitle: "% of Portfolio",
    },
    { text: stock.value, subtitle: "Value" },
  ];
  const handleClose = () => {
    setDialogOpen(false);
  };

  return (
    <React.Fragment>
      <Dialog
      BackdropProps={{
        style: { backgroundColor: 'rgba(0, 0, 0, 0.9)' }, 
      }}
        open={dialogOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        sx={{
          "& .MuiDialog-paper": {
            color:theme.palette.text.primary,
            borderRadius: "10px",
            overflow: "visible", 
            maxWidth: "600px",
            display:'flex',
            alignItems: "center"
          },
        }}
      >
        <DialogTitle className={styles.dialogTitle}>
          <Typography
            variant="h4"
            component="div"
            sx={{
              textAlign: "center",
            }}
          >
            {stock.name}
          </Typography>
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Stack direction="column">
              <Typography
                variant="h5"
                sx={{
                  letterSpacing: "-1px",
                  fontSize: "2rem",
                }}
              >
                {stock.sharePrice.toFixed(2)}$
              </Typography>
              <Typography variant="body2" color={"darkgray"}>
                Share price
              </Typography>
            </Stack>
            <Stack direction="column">
              <Typography
                variant="h5"
                sx={{
                  textAlign: "right",
                  letterSpacing: "-2px",
                  fontSize: "2rem",
                }}
              >
                {stock.quantity}
              </Typography>
              <Typography variant="body2" color={"darkgray"}>
                shares owned
              </Typography>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{
          p:'20px 0',
          width:'105%',
          
        }}>
          <div className={styles.container}>
            {infoBoxText.map((item, index) => (
              <InfoBox key={index} text={item.text} subtitle={item.subtitle} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}

import { Box, Divider, Stack, Typography, useTheme } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Slide from "@mui/material/Slide";
import * as React from "react";
import dayjs from "dayjs";
import { TransitionProps } from "@mui/material/transitions";
import { leaderboardsStock } from "@/utils/dataProcessing";
import ClickToFetchSentimentBadge from "../ClickToFetchSentimentBadge";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface InfoBoxProps {
  text: string | number; // Allow number for stock.value
  subtitle: string;
}

function InfoBox({ text, subtitle }: InfoBoxProps) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
        padding: theme.spacing(2), // 1rem
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: theme.spacing(2), // 1rem
      }}
    >
      <Typography variant="h5" fontWeight={"bold"}>
        {text}
        {subtitle === "Value" ? " $" : null}
      </Typography>
      <Typography variant="subtitle2">{subtitle}</Typography>
    </Box>
  );
}

interface AlertDialogSlideProps {
  dialogOpen: boolean;
  setDialogOpen: (isOpen: boolean) => void;
  stock: leaderboardsStock;
}

export default function AlertDialogSlide({
  dialogOpen,
  setDialogOpen,
  stock,
}: AlertDialogSlideProps) {
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
          style: { backgroundColor: "rgba(0, 0, 0, 0.9)" },
        }}
        open={dialogOpen}
        TransitionComponent={Transition}
        keepMounted
        onClose={handleClose}
        aria-describedby="alert-dialog-slide-description"
        sx={{
          "& .MuiDialog-paper": {
            color: theme.palette.text.primary,
            borderRadius: "10px",
            overflow: "visible",
            maxWidth: "600px",
            display: "flex",
            alignItems: "center",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing(2), // 1rem
            marginBottom: theme.spacing(3), // 1.5rem
            width: "100%",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              variant="h4"
              component="div"
              sx={{
                textAlign: "center",
              }}
            >
              {stock.name}
            </Typography>
            {/* Using stock.ticker is more reliable for the API */}
            <ClickToFetchSentimentBadge ticker={stock.ticker} />
          </Box>
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
        <DialogContent
          sx={{
            p: "20px 0",
            width: "105%",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: theme.spacing(2), // 1rem
              backgroundColor: "#00695c",
              borderRadius: "10px",
              justifyContent: "center",
              padding: theme.spacing(2), // 1rem
            }}
          >
            {infoBoxText.map((item, index) => (
              <InfoBox key={index} text={item.text} subtitle={item.subtitle} />
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}
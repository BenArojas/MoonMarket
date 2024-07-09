import { Box, Divider, Typography } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Slide from "@mui/material/Slide";
import * as React from "react";
import dayjs from "dayjs";
const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function InfoBox({ text, subtitle }) {
  return (
    <Box
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.1)", // Lighter background for embossed effect
        borderRadius: 2,
        padding: 2,
        boxShadow:
          "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
          display:'flex',
          flexDirection:'column',
          justifyContent:'space-between',
          gap: 2
      }}
    >
      <Typography variant="h5" fontWeight={"bold"}>
        {text}
      </Typography>
      <Typography variant="subtitle2">{subtitle}</Typography>
    </Box>
  );
}

export default function AlertDialogSlide({ dialogOpen, setDialogOpen, stock }) {
  console.log(stock);

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
        sx={{
          "& .MuiDialog-paper": {
            color: "white",
            borderRadius: "10px",
            overflow: "visible", // Allow content to overflow
            maxWidth: "600px",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            mb: 3,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: "center",
            }}
          >
            {stock.name}
          </Typography>
          <Divider />
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  letterSpacing: "-1px",
                  fontSize: "2rem",
                }}
              >
                {stock.sharePrice}$
              </Typography>
              <Typography variant="body2" sx={{ color: "#a0a0a0" }}>
                Share price
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
              }}
            >
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
              <Typography
                variant="body2"
                sx={{
                  color: "#a0a0a0",
                }}
              >
                shares owned
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            padding: 0,
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              // flexDirection: "row",
              gap: 2, // Add gap between Boxes
              backgroundColor: "#2196f3",
              borderRadius: "10px",
              justifyContent: "center",
              padding: 2,
            }}
          >
            {[
              {
                text: dayjs(stock.earnings).format("DD.MM.YYYY"),
                subtitle: "Earnings",
              },
              {
                text: stock.percentageOfPortfolio,
                subtitle: "% of Portfolio",
              },
              { text: stock.value, subtitle: "Value" },
            ].map((item, index) => (
              <InfoBox key={index} text={item.text} subtitle={item.subtitle} />
            ))}
          </Box>
        </DialogContent>
        <Box
          sx={{
            height: "1rem",
          }}
        ></Box>
      </Dialog>
    </React.Fragment>
  );
}

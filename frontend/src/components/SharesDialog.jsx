import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useForm } from "react-hook-form";
import "@/styles/portfolio.css";
import TextField from "@mui/material/TextField";
import { transactionSchema } from "@/schemas/transaction";
import { zodResolver } from "@hookform/resolvers/zod";

function SharesDialog({
  handleClose,
  open,
  dialog,
  buyShares,
  sellShares,
}) {

  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    criteriaMode: "all",
  });

  const onSubmit = async (data, event) => {
    event.preventDefault();
    try {
      if (dialog.function === 'buy') {
        await buyShares.mutateAsync({
          price: data.price,
          ticker: dialog.ticker,
          quantity: data.quantity,
          
        });
      } else if (dialog.function === "sell") {
        await sellShares.mutateAsync({
          ticker: dialog.ticker,
          quantity: data.quantity,
          price: data.price,
    
        });
      }
      else {
        console.log("Unknown function", dialog.function);
      }
      handleClose();
    } catch (error) {
      console.error("Error in onSubmit:", error);
      if (error.response && error.response.data) {
        setServerError("ERROR! " + error.response.data.detail);
      } else {
        setServerError("An unexpected error occurred");
      }
    }
  };

  return (
    <React.Fragment>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{dialog.title}</DialogTitle>
        <DialogContent className="addStockForm">
          <DialogContentText>{dialog.text}</DialogContentText>
          <Box
            component={"form"}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
            onSubmit={handleSubmit(onSubmit)}
          >
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <label>{dialog.labelText}</label>
              <TextField {...register("price")} />
              <Typography variant="body2" sx={{ color: "red" }}>
                {errors.price?.message ?? null}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <label>Enter quantity</label>
              <TextField {...register("quantity")} />
              <Typography variant="body2" sx={{ color: "red" }}>
                {errors.quantity?.message ?? null}
                {serverError}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="contained" type="submit">
                {dialog.buttonText}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
}

export default SharesDialog;

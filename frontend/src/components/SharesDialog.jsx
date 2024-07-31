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
  addUserPurchase,
  addUserSale,
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
      if (dialog.function === addUserPurchase) {
        const response = await dialog.function(
          data.price,
          dialog.ticker,
          data.quantity,
          dialog.token
        );
      } else if (dialog.function === addUserSale) {
        const response = await dialog.function(
          dialog.ticker,
          data.quantity,
          data.price,
          dialog.token
        );
      }
    } catch (error) {
      if (error.response.status > 200) {
        setServerError("ERROR! " + error.response.data.detail);
      }
      console.error("Error:", error);
    }
  };

  // useEffect(() => {
  //   console.log(dialog)
  // },[])

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

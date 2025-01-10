import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useForm, Controller } from "react-hook-form";
import "@/styles/portfolio.css";
import TextField from "@mui/material/TextField";
import { transactionSchema } from "@/schemas/transaction";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs'; // Added dayjs import

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
    control,
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
          date: data.date,
          commission: data.commission
        });
      } else if (dialog.function === "sell") {
        await sellShares.mutateAsync({
          ticker: dialog.ticker,
          quantity: data.quantity,
          price: data.price,
          date: data.date,
          commission: data.commission
        });
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
            sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2  }}
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
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <label>Enter Commission</label>
              <TextField {...register("commission")} />
              <Typography variant="body2" sx={{ color: "red" }}>
                {errors.quantity?.message ?? null}
                {serverError}
              </Typography>
            </Box>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Transaction Date"
                value={field.value}
                onChange={(newValue) => {
                  field.onChange(newValue);
                }}
                maxDate={dayjs()} // Changed to dayjs
                slotProps={{
                  textField: {
                    helperText: errors.date?.message,
                    error: !!errors.date,
                    size: "small",
                    sx: { width: '200px' } // Added width for better presentation
                  }
                }}
              />
            )}
          />
        </LocalizationProvider>
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

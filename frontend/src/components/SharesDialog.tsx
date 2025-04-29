import React, {useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import "@/styles/portfolio.css";
import TextField from "@mui/material/TextField";
import { transactionSchema } from "@/schemas/transaction";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addUserPurchase, addUserSale } from "@/api/user";

// Define the form data type from the schema
type TransactionFormData = z.infer<typeof transactionSchema>;
type TransactionPayload = TransactionFormData & { ticker: string };


interface SharesDialogProps {
  handleClose: () => void;
  open: boolean;
  dialog: {
    title: string;
    text: string;
    labelText: string;
    buttonText: string;
    function: 'buy' | 'sell';
    ticker: string;
  };
}

function SharesDialog({
  handleClose,
  open,
  dialog,
}: SharesDialogProps) {
  const queryClient = useQueryClient();
  
  const buyShares = useMutation({
    mutationFn: async (data: TransactionPayload) => addUserPurchase(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    },
    onError: (error: Error) => {
      console.error("Error posting transaction", error);
    }
  });

  const sellShares = useMutation({
    mutationFn: async (data: TransactionPayload) => addUserSale(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["authStatus"] });
    },
    onError: (error: Error) => {
      console.error("Error posting transaction", error);
    }
  });

  const [serverError, setServerError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    control,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    criteriaMode: "all",
    defaultValues: {
      date: dayjs(),
      price: 0,
      quantity: 0,
      commission: 0,
    }
  });

  const onSubmit: SubmitHandler<TransactionFormData> = async (data, event) => {
    event?.preventDefault();
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
    } catch (error: any) {
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
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}
            onSubmit={handleSubmit(onSubmit)}
          >
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <label>{dialog.labelText}</label>
              <TextField
                {...register("price")}
                error={!!errors.price}
                helperText={errors.price?.message}
              />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <label>Enter quantity</label>
              <TextField
                {...register("quantity")}
                error={!!errors.quantity}
                helperText={errors.quantity?.message || serverError}
              />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <label>Enter Commission($)</label>
              <TextField
                {...register("commission")}
                error={!!errors.commission}
                helperText={errors.commission?.message}
              />
            </Box>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Transaction Date"
                    value={field.value as Dayjs | null}
                    onChange={(newValue: Dayjs | null) => {
                      field.onChange(newValue);
                    }}
                    maxDate={dayjs()}
                    slotProps={{
                      textField: {
                        helperText: errors.date?.message,
                        error: !!errors.date,
                        size: "small",
                        sx: { width: '200px' }
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
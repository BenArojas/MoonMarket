import React, { useState, useEffect } from 'react';
import { Box, Typography, Input, Button } from '@mui/material';
// Changed date adapter imports
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs'; // Added dayjs import
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionSchema } from '@/schemas/transaction';
import { addStockToPortfolio } from '@/api/user';
import ConfirmBuyDialog from '@/components/ConfirmBuy.jsx';

function BuyStockForm({ stock }) {
  const [isBought, setIsBought] = useState(false);
  const [price, setPrice] = useState(stock?.price.toFixed(2));
  const [quantity, setQuantity] = useState(0);
  const totalPrice = (parseFloat(price) || 0) * (parseFloat(quantity) || 0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm({
    defaultValues: {
      price: stock?.price.toFixed(2),
      date: dayjs(), // Changed to dayjs
    },
    resolver: zodResolver(transactionSchema),
    criteriaMode: 'all',
  });

  useEffect(() => {
    if (stock) {
      setPrice(stock.price.toFixed(2));
      setQuantity(0);
      setValue('price', stock.price.toFixed(2));
      setValue('quantity', 0);
    }
  }, [stock, setValue]);

  const queryClient = useQueryClient();
  const { mutateAsync: addStockMutation } = useMutation({
    mutationFn: ({ portfolioStock, price, quantity, date }) =>
      addStockToPortfolio(portfolioStock, price, quantity, date.toDate()), // Convert dayjs to Date
    onSuccess: () => {
      queryClient.invalidateQueries(['userData']);
    },
  });

  const handleInputChange = (setter) => (event) => {
    const value = event.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const onSubmit = async (data) => {
    try {
      const portfolioStock = {
        name: stock.name,
        ticker: stock.symbol,
        price: stock.price,
      };
      if (stock.earningsAnnouncement !== null) {
        portfolioStock.earnings = stock.earningsAnnouncement;
      }
      await addStockMutation({
        portfolioStock,
        price: parseFloat(data.price),
        quantity: parseInt(data.quantity),
        date: data.date, // This will be a dayjs object
      });
      setIsBought(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'transparent',
        p: 2,
        width: '70%',
        margin: 'auto',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
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
      </Box>

      {/* Rest of the form remains the same */}
      <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
        <Typography>At Price</Typography>
        <Input
          placeholder="10.52"
          {...register('price')}
          value={price}
          onChange={handleInputChange(setPrice)}
        />
        {errors.price?.message && (
          <Typography color="error" variant="caption">
            {errors.price.message}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography>Amount</Typography>
        <Input
          placeholder="0"
          {...register('quantity')}
          value={quantity}
          onChange={handleInputChange(setQuantity)}
        />
        {errors.quantity?.message && (
          <Typography color="error" variant="caption">
            {errors.quantity.message}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography>Total Price</Typography>
        <Input
          placeholder="0"
          value={isNaN(totalPrice) ? '0' : totalPrice.toFixed(2)}
          readOnly
        />
      </Box>

      <Box>
        <Button variant="contained" type="submit">
          Buy
        </Button>
        {isBought && (
          <ConfirmBuyDialog
            setisBought={setIsBought}
            open={isBought}
            ticker={stock?.symbol}
            price={price}
            quantity={quantity}
            totalCost={totalPrice.toFixed(2)}
          />
        )}
      </Box>
    </Box>
  );
}

export default BuyStockForm;
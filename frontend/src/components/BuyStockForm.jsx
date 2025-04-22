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
import { useNavigate } from "react-router-dom";


function BuyStockForm({ stock, isMobile }) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [formData, setFormData] = useState(null);
  const [price, setPrice] = useState(stock?.price.toFixed(2));
  const [quantity, setQuantity] = useState(0);
  const [commission, setCommission] = useState(0);
  const totalPrice = (parseFloat(price) || 0) * (parseFloat(quantity) || 0);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm({
    defaultValues: {
      price: stock?.price.toFixed(2),
      date: dayjs(),
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
      setCommission(0)
    }
  }, [stock, setValue]);

  const queryClient = useQueryClient();
  const { mutateAsync: addStockMutation } = useMutation({
    mutationFn: ({ portfolioStock, price, quantity, date }) =>
      addStockToPortfolio(portfolioStock, price, quantity,commission, date.toDate()),
    onSuccess: async () => {
      console.log('success');
      await queryClient.invalidateQueries({
        queryKey: ['authStatus'],
        exact: false,  
        refetchType: 'inactive'
      });
      // queryClient.resetQueries({queryKey:["userData"]});
    },
  });

  const handleInputChange = (setter) => (event) => {
    const value = event.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleFormSubmit = (data) => {
    setFormData({
      portfolioStock: {
        name: stock.name,
        ticker: stock.symbol,
        price: stock.price,
        ...(stock.earningsAnnouncement !== null && { earnings: stock.earningsAnnouncement }),
      },
      price: parseFloat(data.price),
      quantity: parseInt(data.quantity),
      commission: data.commission,
      date: data.date,
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmPurchase = async () => {
    try {
      await addStockMutation(formData);
      setShowConfirmDialog(false);
      navigate('/home');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        component="form"
        onSubmit={handleSubmit(handleFormSubmit)}
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems:  'center',
          backgroundColor: 'transparent',
          p: 1,
          gap: isMobile ? 2 : 5,
          margin: isMobile ? 'none' : 'auto',
        }}
      >
        {/* Row 1 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection:  'row',
            gap: 2,
            alignItems:  'center',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Transaction Date"
                  value={field.value}
                  onChange={(newValue) => field.onChange(newValue)}
                  maxDate={dayjs()}
                  slotProps={{
                    textField: {
                      helperText: errors.date?.message,
                      error: !!errors.date,
                      size: 'small',
                      sx: { width: '150px' },
                    },
                  }}
                />
              )}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
            <Typography>At Price</Typography>
            <Input
              placeholder="10.52"
              {...register('price')}
              value={price}
              onChange={handleInputChange(setPrice)}
              sx={{ width: isMobile ? '150px' : '200px' }}
            />
            {errors.price?.message && (
              <Typography color="error" variant="caption">
                {errors.price.message}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Row 2 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection:  'row',
            gap: 2,
            alignItems:  'center',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
            <Typography>Amount</Typography>
            <Input
              placeholder="0"
              {...register('quantity')}
              value={quantity}
              onChange={handleInputChange(setQuantity)}
              sx={{ width: isMobile ? '150px' : '200px' }}
            />
            {errors.quantity?.message && (
              <Typography color="error" variant="caption">
                {errors.quantity.message}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
            <Typography>Total Price</Typography>
            <Input
              placeholder="0"
              value={isNaN(totalPrice) ? '0' : totalPrice.toFixed(2)}
              readOnly
              sx={{ width: isMobile ? '150px' : '200px' }}
            />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
            <Typography>Commission($)</Typography>
            <Input
              placeholder="0"
              {...register('commission')}
              value={commission}
              onChange={handleInputChange(setCommission)}
              sx={{ width: isMobile ? '150px' : '200px' }}
            />
            {errors.commission?.message && (
              <Typography color="error" variant="caption">
                {errors.commission.message}
              </Typography>
            )}
          </Box>
         

        </Box>
        <Box>
            <Button
              variant="contained"
              type="submit"
              sx={{ width: isMobile ? '100%' : 'auto' }}
            >
              Buy
            </Button>
            {showConfirmDialog && (
              <ConfirmBuyDialog
                open={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleConfirmPurchase}
                ticker={stock?.symbol}
                price={price}
                quantity={quantity}
                commission={commission}
                totalCost={totalPrice.toFixed(2)}
              />
            )}
          </Box>
      </Box>
    </LocalizationProvider>
  );
}

export default BuyStockForm;

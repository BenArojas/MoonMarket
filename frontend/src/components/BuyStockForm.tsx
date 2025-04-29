import React, { useState, useEffect } from 'react';
import { Box, Typography, Input, Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionSchema } from '@/schemas/transaction';
import { addStockToPortfolio, PortfolioStock } from '@/api/user';
import ConfirmBuyDialog from '@/components/ConfirmBuy.js';
import { useNavigate } from 'react-router-dom';
import { StockData } from '@/hooks/useStocksDailyData';
import { z } from 'zod';

interface BuyStockFormProps {
  stock: StockData;
  isMobile: boolean;
}

type TransactionFormData = z.infer<typeof transactionSchema>;

interface FormData {
  portfolioStock: PortfolioStock;
  price: number;
  quantity: number;
  commission: number;
  date: Dayjs;
}

function BuyStockForm({ stock, isMobile }: BuyStockFormProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [price, setPrice] = useState<number>(stock?.price || 0);
  const [quantity, setQuantity] = useState<number>(0);
  const [commission, setCommission] = useState<number>(0);
  const totalPrice = price * quantity;
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm<TransactionFormData>({
    defaultValues: {
      price: stock?.price || 0, // Set as number
      date: dayjs(),
      quantity: 0,
      commission: 0,
    },
    resolver: zodResolver(transactionSchema),
    criteriaMode: 'all',
  });

  useEffect(() => {
    if (stock) {
      setPrice(stock.price);
      setQuantity(0);
      setValue('price', stock.price); // Set as number
      setValue('quantity', 0);
      setCommission(0);
      setValue('commission', 0);
    }
  }, [stock, setValue]);

  const queryClient = useQueryClient();
  const { mutateAsync: addStockMutation } = useMutation({
    mutationFn: ({ portfolioStock, price, quantity, date, commission }: FormData) =>
      addStockToPortfolio(portfolioStock, price, quantity, commission, date.toDate()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['authStatus'],
        exact: false,
        refetchType: 'inactive',
      });
    },
  });

  // Handle input changes for numeric fields
  const handleInputChange =
    (setter: React.Dispatch<React.SetStateAction<number>>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      // Allow empty input or valid number (including decimal)
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setter(value === '' ? 0 : parseFloat(value));
      }
    };

  const handleFormSubmit = (data: TransactionFormData) => {
    setFormData({
      portfolioStock: {
        name: stock.name,
        ticker: stock.symbol,
        price: stock.price.toString(),
        ...(stock.earningsAnnouncement !== null && { earnings: stock.earningsAnnouncement }),
      },
      price: data.price, // Already a number due to schema
      quantity: data.quantity,
      commission: data.commission,
      date: data.date,
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmPurchase = async () => {
    try {
      if (formData) {
        await addStockMutation(formData);
        setShowConfirmDialog(false);
        navigate('/home');
      }
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
          alignItems: 'center',
          backgroundColor: 'transparent',
          p: 1,
          gap: isMobile ? 2 : 5,
          margin: isMobile ? 'none' : 'auto',
        }}
      >
        {/* Row 1 */}
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
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
              {...register('price', {
                // Ensure input is coerced to number
                setValueAs: (value) => (value === '' ? 0 : parseFloat(value)),
              })}
              value={price === 0 ? '' : price} // Display empty string for 0
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
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', p: 1 }}>
            <Typography>Amount</Typography>
            <Input
              placeholder="0"
              {...register('quantity', {
                setValueAs: (value) => (value === '' ? 0 : parseInt(value)),
              })}
              value={quantity === 0 ? '' : quantity}
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
              {...register('commission', {
                setValueAs: (value) => (value === '' ? 0 : parseFloat(value)),
              })}
              value={commission === 0 ? '' : commission}
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
              price={price.toString()} // Convert to string for display if needed
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
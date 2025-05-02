import { z } from 'zod';
import dayjs, { Dayjs } from 'dayjs';

export const transactionSchema = z.object({
  price: z
    .number({
      coerce: true,
      required_error: 'Price is required',
      invalid_type_error: 'Price must be a number',
    })
    .positive({ message: 'Price must be positive' }),
  commission: z
    .number({
      coerce: true,
      required_error: 'Commission is required',
      invalid_type_error: 'Commission must be a number',
    })
    .positive({ message: 'Commission must be positive' }),
  quantity: z
    .number({
      coerce: true,
      required_error: 'Quantity is required',
      invalid_type_error: 'Quantity must be a number',
    })
    .positive({ message: 'Quantity must be positive' }),
  date: z.custom<Dayjs>(
    (val) => dayjs.isDayjs(val),
    { message: 'Invalid date' }
  ).refine((date) => date.isBefore(dayjs().add(1, 'day')), {
    message: 'Transaction date cannot be in the future',
  }),
});
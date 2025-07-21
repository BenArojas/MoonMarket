import {
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { useMemo, useState } from 'react';
import { OptionContract, OptionsData } from './StockItem';

interface OptionsChainProps {
  data: OptionsData;
}


export default function OptionsChain({ data }: OptionsChainProps) {
  const expirationDates = Object.keys(data);
  const [selectedExpiration, setSelectedExpiration] = useState(expirationDates[0] || '');

  // Group contracts by strike price for the selected expiration date
  const strikes = useMemo(() => {
    if (!selectedExpiration) return [];

    const contracts = data[selectedExpiration];
    const groupedByStrike: Record<string, { call?: OptionContract; put?: OptionContract }> = {};

    contracts.forEach((contract) => {
      const strike = contract.strike.toFixed(2);
      if (!groupedByStrike[strike]) {
        groupedByStrike[strike] = {};
      }
      if (contract.type === 'call') {
        groupedByStrike[strike].call = contract;
      } else {
        groupedByStrike[strike].put = contract;
      }
    });

    return Object.entries(groupedByStrike).map(([strike, contracts]) => ({
      strike: parseFloat(strike),
      ...contracts,
    }));
  }, [data, selectedExpiration]);

  const headerCellStyle = { fontWeight: 'bold', borderBottom: '2px solid #424242', color: '#bdbdbd' };
  const cellStyle = { color: '#e0e0e0', borderColor: '#424242' };

  return (
    <Paper sx={{ p: 2, backgroundColor: '#1e1e1e' }}>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="expiration-select-label" sx={{color: '#bdbdbd'}}>Expiration Date</InputLabel>
        <Select
          labelId="expiration-select-label"
          value={selectedExpiration}
          label="Expiration Date"
          onChange={(e) => setSelectedExpiration(e.target.value)}
          sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' }, '& .MuiSvgIcon-root': { color: 'white' } }}
        >
          {expirationDates.map((date) => (
            <MenuItem key={date} value={date}>{new Date(date).toDateString()}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <TableContainer>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" colSpan={5} sx={headerCellStyle}>CALLS</TableCell>
              <TableCell align="center" sx={{...headerCellStyle, backgroundColor: '#2c2c2c'}}>STRIKE</TableCell>
              <TableCell align="center" colSpan={5} sx={headerCellStyle}>PUTS</TableCell>
            </TableRow>
            <TableRow>
              {['Last', 'Bid', 'Ask', 'Vol', 'OI'].map(h => <TableCell key={`call-${h}`} align="center" sx={headerCellStyle}>{h}</TableCell>)}
              <TableCell sx={{...headerCellStyle, backgroundColor: '#2c2c2c'}}></TableCell>
              {['Last', 'Bid', 'Ask', 'Vol', 'OI'].map(h => <TableCell key={`put-${h}`} align="center" sx={headerCellStyle}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {strikes.map(({ strike, call, put }) => (
              <TableRow key={strike}>
                <TableCell align="center" sx={cellStyle}>{call?.lastPrice.toFixed(2)}</TableCell>
                <TableCell align="center" sx={cellStyle}>{call?.bid.toFixed(2)}</TableCell>
                <TableCell align="center" sx={cellStyle}>{call?.ask.toFixed(2)}</TableCell>
                <TableCell align="center" sx={cellStyle}>{call?.volume}</TableCell>
                <TableCell align="center" sx={cellStyle}>{call?.openInterest}</TableCell>
                <TableCell align="center" sx={{...cellStyle, fontWeight: 'bold', fontSize: '1rem', backgroundColor: '#2c2c2e'}}>{strike.toFixed(2)}</TableCell>
                <TableCell align="center" sx={cellStyle}>{put?.lastPrice.toFixed(2)}</TableCell>
                <TableCell align="center" sx={cellStyle}>{put?.bid.toFixed(2)}</TableCell>
                <TableCell align="center" sx={cellStyle}>{put?.ask.toFixed(2)}</TableCell>
                <TableCell align="center" sx={cellStyle}>{put?.volume}</TableCell>
                <TableCell align="center" sx={cellStyle}>{put?.openInterest}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
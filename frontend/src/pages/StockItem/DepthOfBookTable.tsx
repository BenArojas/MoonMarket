import React from 'react';
import { PriceLadderRow } from '@/stores/stockStore';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';

interface DepthOfBookTableProps {
  depth: PriceLadderRow[];
}

const DepthOfBookTable: React.FC<DepthOfBookTableProps> = ({ depth }) => {
  return (
    <Paper 
     variant="outlined" 
     sx={{ 
       display: 'flex', 
       flexDirection: 'column', 
       height: '220px' 
     }}
   >
        <Typography variant="h6" sx={{ p: 2 }}>Market Depth</Typography>
        <TableContainer sx={{ flex: 1, overflowY: 'auto' }}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold' }}>Bid Size</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Price</TableCell>
                        <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>Ask Size</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {depth.length > 0 ? (
                        depth.map((row, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell align="center" sx={{ color: 'success.dark' }}>
                                    {row.bidSize}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'medium' }}>
                                    {row.price.toFixed(2)}
                                </TableCell>
                                <TableCell align="center" sx={{ color: 'error.dark' }}>
                                    {row.askSize}
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                                No depth data available.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
  );
};

export default DepthOfBookTable;
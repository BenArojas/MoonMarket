// src/features/scanner/ScannerResults.tsx
import React from 'react';
import { Box, Card, CardContent, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { ScannerResponse } from '@/api/scanner';

interface Props {
    results: ScannerResponse;
}

const ScannerResults: React.FC<Props> = ({ results }) => {
    console.log(results);
    
    // Function to get the sort criteria name
    const getSortCriteria = () => {
        if (results.scan_data_column_name) {
            return results.scan_data_column_name;
        }
        
        // Try to get from first contract that has column_name
        const firstWithColumn = results.contracts.find(c => (c as any).column_name);
        if (firstWithColumn) {
            return (firstWithColumn as any).column_name;
        }
        
        return 'Scan Criteria';
    };
    
    return (
        <Card sx={{ mt: 2, maxHeight: '45vh', overflowY: 'auto' }}>
            <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h5" fontWeight="bold">
                        Scanner Results ({results.contracts.length})
                    </Typography>
                    <Chip 
                        label={`Sorted by: ${getSortCriteria()}`} 
                        color="primary" 
                        variant="outlined" 
                        size="small"
                    />
                </Box>
                
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Symbol</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Company Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Exchange</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.contracts.map((contract, index) => (
                                <TableRow key={contract.con_id} hover>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary" fontWeight="bold">
                                            #{parseInt(contract.server_id) + 1}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography color="primary" fontWeight="bold">
                                            {contract.symbol}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                            {contract.company_name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {contract.listing_exchange}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={contract.sec_type} 
                                            size="small" 
                                            variant="outlined" 
                                            color="secondary"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                <Box mt={2} textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                        Results are sorted by {getSortCriteria()} in descending order (best to worst)
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default ScannerResults;
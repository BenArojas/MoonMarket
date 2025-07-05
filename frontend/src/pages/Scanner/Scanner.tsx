// src/features/scanner/Scanner.tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { scannerApi, ScannerFilter, ScannerParams, ScannerRequest, ScannerResponse } from '@/api/scanner';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider, Typography } from '@mui/material';
import { PlayArrow, Search } from '@mui/icons-material';
import ScannerConfiguration from './ScannerConfiguration';
import ScannerFilters from './ScannerFilters';
import ScannerResults from './ScannerResults';

const Scanner: React.FC = () => {
    // --- STATE MANAGEMENT ---
    const [selectedInstrument, setSelectedInstrument] = useState<string>('');
    const [selectedScanType, setSelectedScanType] = useState<string>('');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [activeFilters, setActiveFilters] = useState<ScannerFilter[]>([]);

    // --- DATA FETCHING (TANSTACK QUERY) ---
    const { data: scannerParams, isLoading: paramsLoading, error: paramsError } = useQuery<ScannerParams>({
        queryKey: ['scannerParams'],
        queryFn: scannerApi.getScannerParams,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const { data: scanTypesData, isLoading: scanTypesLoading } = useQuery({
        queryKey: ['scanTypes', selectedInstrument],
        queryFn: () => scannerApi.getScanTypesForInstrument(selectedInstrument),
        enabled: !!selectedInstrument,
    });

    const { data: instrumentFilters } = useQuery({
        queryKey: ['instrumentFilters', selectedInstrument],
        queryFn: () => scannerApi.getInstrumentFilters(selectedInstrument),
        enabled: !!selectedInstrument,
    });

    const scannerMutation = useMutation<ScannerResponse, Error, ScannerRequest>({
        mutationFn: scannerApi.runScanner,
    });

    // --- EVENT HANDLERS ---
    const handleRunScanner = () => {
        const request: ScannerRequest = {
            instrument: selectedInstrument,
            type: selectedScanType,
            location: selectedLocation,
            filter: activeFilters,
        };
        scannerMutation.mutate(request);
    };
    
    // --- RENDER LOGIC ---
    if (paramsLoading) {
        return (
            <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography>Loading scanner parameters...</Typography>
            </Container>
        );
    }

    if (paramsError || !scannerParams) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error">Error loading scanner parameters.</Alert>
            </Container>
        );
    }
    
    const canRunScanner = selectedInstrument && selectedScanType && selectedLocation;

    return (
        <Container maxWidth="lg" sx={{ py: 2 }}>
            <Box display="flex" alignItems="center" mb={2}>
                <Search sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                <Typography variant="h3" component="h1" fontWeight="bold">
                    Market Scanner
                </Typography>
            </Box>

            <Card sx={{ mb: 2}}>
                <CardContent sx={{ p: 3 }}>
                    <ScannerConfiguration
                        params={scannerParams}
                        scanTypesData={scanTypesData}
                        scanTypesLoading={scanTypesLoading}
                        selectedInstrument={selectedInstrument}
                        onInstrumentChange={(value) => {
                            setSelectedInstrument(value);
                            setSelectedScanType(''); // Reset scan type when instrument changes
                        }}
                        selectedScanType={selectedScanType}
                        onScanTypeChange={setSelectedScanType}
                        selectedLocation={selectedLocation}
                        onLocationChange={setSelectedLocation}
                    />

                    <Divider sx={{ my: 1 }} />

                    <ScannerFilters
                        activeFilters={activeFilters}
                        setActiveFilters={setActiveFilters}
                        availableFilters={instrumentFilters?.filters || []}
                        allFilterInfo={scannerParams.filter_list}
                    />

                    <Divider sx={{ my: 1 }} />

                    <Box display="flex" justifyContent="center">
                        <Button
                            onClick={handleRunScanner}
                            disabled={!canRunScanner || scannerMutation.isPending}
                            variant="contained"
                            size="large"
                            startIcon={scannerMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                            sx={{ px: 4, py: 1.5 }}
                        >
                            Run Scanner
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {scannerMutation.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Error running scanner: {scannerMutation.error.message}
                </Alert>
            )}

            {scannerMutation.data && <ScannerResults results={scannerMutation.data} />}
        </Container>
    );
};

export default Scanner;
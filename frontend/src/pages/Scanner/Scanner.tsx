// src/features/scanner/Scanner.tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { scannerApi, ScannerFilter, ScannerParams, ScannerRequest, ScannerResponse } from '@/api/scanner';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider, Typography, Grid } from '@mui/material';
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
            <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography>Loading scanner parameters...</Typography>
            </Container>
        );
    }

    if (paramsError || !scannerParams) {
        return (
            <Container maxWidth="xl" sx={{ py: 4 }}>
                <Alert severity="error">Error loading scanner parameters.</Alert>
            </Container>
        );
    }
    
    const canRunScanner = selectedInstrument && selectedScanType && selectedLocation;

    return (
        <Container maxWidth="xl" sx={{ py: 2 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" mb={3}>
                <Search sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                <Typography variant="h3" component="h1" fontWeight="bold">
                    Market Scanner
                </Typography>
            </Box>

            <Grid container spacing={3} sx={{ height: 'calc(90vh - 200px)' }}>
                {/* Left Column - Configuration */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                        <CardContent sx={{ p: 3, flex: 1 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                Scanner Configuration
                            </Typography>
                            
                            <ScannerConfiguration
                                params={scannerParams}
                                scanTypesData={scanTypesData}
                                scanTypesLoading={scanTypesLoading}
                                selectedInstrument={selectedInstrument}
                                onInstrumentChange={(value) => {
                                    setSelectedInstrument(value);
                                    setSelectedScanType(''); 
                                }}
                                selectedScanType={selectedScanType}
                                onScanTypeChange={setSelectedScanType}
                                selectedLocation={selectedLocation}
                                onLocationChange={setSelectedLocation}
                            />

                            <Divider sx={{ my: 3 }} />
                            
                            <ScannerFilters
                                activeFilters={activeFilters}
                                setActiveFilters={setActiveFilters}
                                availableFilters={instrumentFilters?.filters || []}
                                allFilterInfo={scannerParams.filter_list}
                            />

                            <Box sx={{ mt: 'auto', pt: 3 }}>
                                <Button
                                    onClick={handleRunScanner}
                                    disabled={!canRunScanner || scannerMutation.isPending}
                                    variant="contained"
                                    size="large"
                                    fullWidth
                                    startIcon={scannerMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                                    sx={{ py: 1.5 }}
                                >
                                    Run Scanner
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column - Results */}
                <Grid item xs={12} md={8}>
                    <Card sx={{  display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                        <CardContent sx={{ p: 3, flex: 1, overflow: 'hidden' }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                Scan Results
                            </Typography>
                            
                            {scannerMutation.error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    Error running scanner: {scannerMutation.error.message}
                                </Alert>
                            )}

                            {scannerMutation.isPending && (
                                <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: '200px' }}>
                                    <CircularProgress />
                                    <Typography sx={{ ml: 2 }}>Running scanner...</Typography>
                                </Box>
                            )}

                            {!scannerMutation.data && !scannerMutation.isPending && (
                                <Box 
                                    display="flex" 
                                    justifyContent="center" 
                                    alignItems="center" 
                                    sx={{ 
                                        height: '200px', 
                                        // bgcolor: 'grey.50', 
                                        borderRadius: 1,
                                        border: '2px dashed',
                                        borderColor: 'grey.300'
                                    }}
                                >
                                    <Typography >
                                        Configure scanner and click "Run Scanner" to see results
                                    </Typography>
                                </Box>
                            )}

                            {scannerMutation.data && (
                                <Box sx={{
                                    maxHeight: '70vh',
                                    overflowY:'auto'
                                }}>
                                    <ScannerResults results={scannerMutation.data} />
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default Scanner;
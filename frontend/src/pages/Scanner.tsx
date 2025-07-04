import { Location, scannerApi, ScannerFilter, ScannerParams, ScannerRequest, ScannerResponse } from '@/api/scanner';
import {
    Add,
    Business,
    Delete,
    ExpandLess,
    ExpandMore,
    FilterList,
    LocationOn,
    PlayArrow,
    Search,
    TrendingUp,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Collapse,
    Container,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';

const Scanner: React.FC = () => {
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [selectedScanType, setSelectedScanType] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<ScannerFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [newFilterCode, setNewFilterCode] = useState<string>('');

  // Query for scanner parameters
  const { data: scannerParams, isLoading: paramsLoading, error: paramsError } = useQuery<ScannerParams>({
    queryKey: ['scannerParams'],
    queryFn: scannerApi.getScannerParams,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Query for scan types when instrument changes
  const { data: scanTypesData, isLoading: scanTypesLoading } = useQuery({
    queryKey: ['scanTypes', selectedInstrument],
    queryFn: () => scannerApi.getScanTypesForInstrument(selectedInstrument),
    enabled: !!selectedInstrument,
  });

  // Query for instrument filters
  const { data: instrumentFilters } = useQuery({
    queryKey: ['instrumentFilters', selectedInstrument],
    queryFn: () => scannerApi.getInstrumentFilters(selectedInstrument),
    enabled: !!selectedInstrument,
  });

  // Mutation for running scanner
  const scannerMutation = useMutation<ScannerResponse, Error, ScannerRequest>({
    mutationFn: scannerApi.runScanner,
  });

  // Flatten location tree for dropdown
  const flattenLocations = (locations: Location[]): Location[] => {
    const flattened: Location[] = [];
    
    const traverse = (locs: Location[]) => {
      locs.forEach(loc => {
        flattened.push(loc);
        if (loc.locations && loc.locations.length > 0) {
          traverse(loc.locations);
        }
      });
    };
    
    traverse(locations);
    return flattened;
  };

  const handleRunScanner = () => {
    if (!selectedInstrument || !selectedScanType || !selectedLocation) {
      return;
    }

    const request: ScannerRequest = {
      instrument: selectedInstrument,
      type: selectedScanType,
      location: selectedLocation,
      filter: activeFilters,
    };

    scannerMutation.mutate(request);
  };

  const addFilter = () => {
    if (newFilterCode && !activeFilters.find(f => f.code === newFilterCode)) {
      setActiveFilters([...activeFilters, { code: newFilterCode, value: 0 }]);
      setNewFilterCode('');
    }
  };

  const updateFilter = (filterCode: string, value: number) => {
    setActiveFilters(activeFilters.map(f => 
      f.code === filterCode ? { ...f, value } : f
    ));
  };

  const removeFilter = (filterCode: string) => {
    setActiveFilters(activeFilters.filter(f => f.code !== filterCode));
  };

  const getFilterDisplayName = (code: string) => {
    return scannerParams?.filter_list.find(f => f.code === code)?.display_name || code;
  };

  const canRunScanner = selectedInstrument && selectedScanType && selectedLocation;

  if (paramsLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Loading scanner parameters...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (paramsError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading scanner parameters
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={4}>
        <Search sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
        <Typography variant="h3" component="h1" fontWeight="bold">
          Market Scanner
        </Typography>
      </Box>

      {/* Scanner Configuration */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Instrument Selection */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>
                  <Box display="flex" alignItems="center">
                    <Business sx={{ mr: 1, fontSize: 20 }} />
                    Instrument
                  </Box>
                </InputLabel>
                <Select
                  value={selectedInstrument}
                  onChange={(e) => {
                    setSelectedInstrument(e.target.value);
                    setSelectedScanType('');
                  }}
                  label="Instrument"
                >
                  {scannerParams?.instrument_list.map(instrument => (
                    <MenuItem key={instrument.type} value={instrument.type}>
                      {instrument.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Scan Type Selection */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!selectedInstrument || scanTypesLoading}>
                <InputLabel>
                  <Box display="flex" alignItems="center">
                    <TrendingUp sx={{ mr: 1, fontSize: 20 }} />
                    Scan Type
                  </Box>
                </InputLabel>
                <Select
                  value={selectedScanType}
                  onChange={(e) => setSelectedScanType(e.target.value)}
                  label="Scan Type"
                >
                  {scanTypesData?.scan_types.map(scanType => (
                    <MenuItem key={scanType.code} value={scanType.code}>
                      {scanType.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Location Selection */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>
                  <Box display="flex" alignItems="center">
                    <LocationOn sx={{ mr: 1, fontSize: 20 }} />
                    Location
                  </Box>
                </InputLabel>
                <Select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  label="Location"
                >
                  {scannerParams?.location_tree && flattenLocations(scannerParams.location_tree).map(location => (
                    <MenuItem key={location.type} value={location.type}>
                      {location.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Filters Section */}
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Filters
              </Typography>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                startIcon={<FilterList />}
                endIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
                variant="outlined"
                size="small"
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </Box>

            <Collapse in={showFilters}>
              <Box sx={{ mt: 2 }}>
                {/* Add Filter */}
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Add Filter</InputLabel>
                    <Select
                      value={newFilterCode}
                      onChange={(e) => setNewFilterCode(e.target.value)}
                      label="Add Filter"
                    >
                      {instrumentFilters?.filters.map(filterCode => {
                        const filterInfo = scannerParams?.filter_list.find(f => f.code === filterCode);
                        return (
                          <MenuItem key={filterCode} value={filterCode}>
                            {filterInfo?.display_name || filterCode}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <Button
                    onClick={addFilter}
                    variant="contained"
                    startIcon={<Add />}
                    disabled={!newFilterCode}
                    size="small"
                  >
                    Add
                  </Button>
                </Box>

                {/* Active Filters */}
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {activeFilters.map(filter => (
                    <Card key={filter.code} variant="outlined" sx={{ p: 2, minWidth: 250 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" fontWeight="medium" sx={{ mr: 2 }}>
                          {getFilterDisplayName(filter.code)}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <TextField
                            size="small"
                            type="number"
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.code, parseFloat(e.target.value) || 0)}
                            inputProps={{ step: 0.01 }}
                            sx={{ width: 80 }}
                          />
                          <IconButton
                            onClick={() => removeFilter(filter.code)}
                            size="small"
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Box>
              </Box>
            </Collapse>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Run Scanner Button */}
          <Box display="flex" justifyContent="center">
            <Button
              onClick={handleRunScanner}
              disabled={!canRunScanner || scannerMutation.isPending}
              variant="contained"
              size="large"
              startIcon={scannerMutation.isPending ? <CircularProgress size={20} /> : <PlayArrow />}
              sx={{ px: 4, py: 1.5 }}
            >
              Run Scanner
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Results */}
      {scannerMutation.data && (
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
              <Typography variant="h5" fontWeight="bold">
                Scanner Results ({scannerMutation.data.contracts.length})
              </Typography>
              {scannerMutation.data.scan_data_column_name && (
                <Chip
                  label={`Sorted by: ${scannerMutation.data.scan_data_column_name}`}
                  variant="outlined"
                  color="primary"
                />
              )}
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Symbol</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Exchange</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      {scannerMutation.data.scan_data_column_name || 'Value'}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scannerMutation.data.contracts.map((contract, index) => (
                    <TableRow
                      key={contract.con_id}
                      sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium" color="primary">
                          {contract.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {contract.company_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
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
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {contract.scan_data}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {scannerMutation.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Error running scanner: {scannerMutation.error.message}
        </Alert>
      )}
    </Container>
  );
};

export default Scanner;
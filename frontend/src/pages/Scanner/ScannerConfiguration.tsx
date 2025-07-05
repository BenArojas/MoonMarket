// src/features/scanner/ScannerConfiguration.tsx
import { Location, ScannerParams, ScanType } from '@/api/scanner';
import { Business, LocationOn, TrendingUp } from '@mui/icons-material';
import { FormControl, Grid, InputLabel, MenuItem, Select } from '@mui/material';
import React from 'react';

interface Props {
    params: ScannerParams;
    scanTypesData?: { scan_types: ScanType[] };
    scanTypesLoading: boolean;
    selectedInstrument: string;
    onInstrumentChange: (value: string) => void;
    selectedScanType: string;
    onScanTypeChange: (value: string) => void;
    selectedLocation: string;
    onLocationChange: (value: string) => void;
}

const getAllLocations = (locations: Location[]): Location[] => {
    const result: Location[] = [];
    
    const traverse = (locs: Location[]) => {
        locs.forEach(loc => {
            result.push(loc);
            if (loc.locations && loc.locations.length > 0) {
                traverse(loc.locations);
            }
        });
    };
    
    traverse(locations);
    return result;
};

const ScannerConfiguration: React.FC<Props> = ({
    params,
    scanTypesData,
    scanTypesLoading,
    selectedInstrument,
    onInstrumentChange,
    selectedScanType,
    onScanTypeChange,
    selectedLocation,
    onLocationChange,
}) => {
    const locationOptions = React.useMemo(() => {
        if (!selectedInstrument) return [];
        
        // Get all locations
        const allLocations = getAllLocations(params.location_tree);
        
        // Filter locations that match the selected instrument
        // and are leaf nodes (no child locations)
        const relevantLocations = allLocations.filter(loc => {
            // Check if this location is relevant to the selected instrument
            const isRelevant = loc.type.startsWith(selectedInstrument) || 
                              loc.type === selectedInstrument;
            
            // Only include leaf locations (ones without child locations)
            const isLeaf = !loc.locations || loc.locations.length === 0;
            
            return isRelevant && isLeaf;
        });
        
        return relevantLocations;
    }, [params.location_tree, selectedInstrument]);
    
    // Reset location when instrument changes and current location is not valid
    React.useEffect(() => {
        if (selectedLocation && !locationOptions.some(loc => loc.type === selectedLocation)) {
            onLocationChange('');
        }
    }, [selectedInstrument, locationOptions, selectedLocation, onLocationChange]);
    
    return (
        <Grid container spacing={3}>
            {/* Instrument Selection */}
            <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                    <InputLabel id="instrument-select-label">Instrument</InputLabel>
                    <Select
                        labelId="instrument-select-label"
                        value={selectedInstrument}
                        onChange={(e) => onInstrumentChange(e.target.value)}
                        label="Instrument"
                    >
                        {params.instrument_list.map(instrument => (
                            <MenuItem key={instrument.type} value={instrument.type}>
                                <Business sx={{ mr: 1, fontSize: 20, verticalAlign: 'middle' }} />
                                {instrument.display_name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            {/* Scan Type Selection */}
            <Grid item xs={12} md={4}>
                <FormControl fullWidth disabled={!selectedInstrument || scanTypesLoading}>
                    <InputLabel id="scantype-select-label">Scan Type</InputLabel>
                    <Select
                        labelId="scantype-select-label"
                        value={selectedScanType}
                        onChange={(e) => onScanTypeChange(e.target.value)}
                        label="Scan Type"
                    >
                        {scanTypesData?.scan_types.map(scanType => (
                            <MenuItem key={scanType.code} value={scanType.code}>
                                <TrendingUp sx={{ mr: 1, fontSize: 20, verticalAlign: 'middle' }} />
                                {scanType.display_name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            {/* Location Selection */}
            <Grid item xs={12} md={4}>
                <FormControl fullWidth disabled={!selectedInstrument}>
                    <InputLabel id="location-select-label">Location</InputLabel>
                    <Select
                        labelId="location-select-label"
                        value={selectedLocation}
                        onChange={(e) => onLocationChange(e.target.value)}
                        label="Location"
                    >
                        {locationOptions.map(location => (
                            <MenuItem key={location.type} value={location.type}>
                                <LocationOn sx={{ mr: 1, fontSize: 20, verticalAlign: 'middle' }} />
                                {location.display_name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
        </Grid>
    );
};

export default ScannerConfiguration;
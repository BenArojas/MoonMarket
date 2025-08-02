import React, { useState } from 'react';
import { 
    Box, 
    Button, 
    Collapse, 
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem, 
    Typography, 
    Card, 
    TextField, 
    IconButton,
    Chip,
    Tooltip,
    FormHelperText
} from '@mui/material';
import { Add, Delete, ExpandLess, ExpandMore, FilterList, Help } from '@mui/icons-material';

// Define filter types for better UX
const FILTER_TYPES = {
    BOOLEAN: 'boolean',
    PRICE: 'price',
    PERCENTAGE: 'percentage',
    VOLUME: 'volume',
    DATE: 'date',
    RATIO: 'ratio',
    NUMBER: 'number'
};

const FILTER_METADATA = {
    'haltedIs': { 
        type: FILTER_TYPES.BOOLEAN, 
        description: '1 = halted stocks only, 0 = non-halted only',
        placeholder: '1 or 0'
    },
    'hasOptionsIs': { 
        type: FILTER_TYPES.BOOLEAN, 
        description: '1 = has options, 0 = no options',
        placeholder: '1 or 0'
    },
    'price': { 
        type: FILTER_TYPES.PRICE, 
        description: 'Minimum stock price in USD',
        placeholder: '50.00'
    },
    'priceAbove': { 
        type: FILTER_TYPES.PRICE, 
        description: 'Stock price above this value',
        placeholder: '10.00'
    },
    'marketCap': { 
        type: FILTER_TYPES.NUMBER, 
        description: 'Market cap (e.g., 1000000000 = $1B)',
        placeholder: '1000000000'
    },
    'avgVolume': { 
        type: FILTER_TYPES.VOLUME, 
        description: 'Average daily volume',
        placeholder: '1000000'
    },
    'changePerc': { 
        type: FILTER_TYPES.PERCENTAGE, 
        description: 'Percentage change (e.g., 5 = 5%)',
        placeholder: '5.0'
    },
    'minPeRatio': { 
        type: FILTER_TYPES.RATIO, 
        description: 'Minimum P/E ratio',
        placeholder: '15'
    },
    'maxPeRatio': { 
        type: FILTER_TYPES.RATIO, 
        description: 'Maximum P/E ratio',
        placeholder: '25'
    },
    'firstTradeDate': { 
        type: FILTER_TYPES.DATE, 
        description: 'First trade date (YYYYMMDD)',
        placeholder: '20200101'
    },
    'dividendYieldFrd': { 
        type: FILTER_TYPES.PERCENTAGE, 
        description: 'Forward dividend yield %',
        placeholder: '2.5'
    },
    'avgPriceTarget': { 
        type: FILTER_TYPES.PRICE, 
        description: 'Average analyst price target',
        placeholder: '100.00'
    },
    'avgRating': { 
        type: FILTER_TYPES.RATIO, 
        description: 'Average analyst rating (1-5)',
        placeholder: '3.5'
    },
    'impVolat': { 
        type: FILTER_TYPES.PERCENTAGE, 
        description: 'Implied volatility %',
        placeholder: '30'
    },
    'optVolume': { 
        type: FILTER_TYPES.VOLUME, 
        description: 'Options volume',
        placeholder: '10000'
    }
};

interface Filter {
    code: string;
    display_name: string;
}

interface ScannerFilter {
    code: string;
    value: number;
}

interface Props {
    activeFilters: ScannerFilter[];
    setActiveFilters: React.Dispatch<React.SetStateAction<ScannerFilter[]>>;
    availableFilters: string[];
    allFilterInfo: Filter[];
}

const ScannerFilters: React.FC<Props> = ({ 
    activeFilters, 
    setActiveFilters, 
    availableFilters, 
    allFilterInfo 
}) => {
    const [showFilters, setShowFilters] = useState(false);
    const [newFilterCode, setNewFilterCode] = useState<string>('');
    
    const getFilterDisplayName = (code: string) => {
        return allFilterInfo.find(f => f.code === code)?.display_name || code;
    };
    
    const getFilterMetadata = (code: string) => {
        return FILTER_METADATA[code] || { 
            type: FILTER_TYPES.NUMBER, 
            description: 'Enter filter value',
            placeholder: '0'
        };
    };
    
    const addFilter = () => {
        if (newFilterCode && !activeFilters.find(f => f.code === newFilterCode)) {
            const metadata = getFilterMetadata(newFilterCode);
            const defaultValue = metadata.type === FILTER_TYPES.BOOLEAN ? 1 : 0;
            setActiveFilters(prev => [...prev, { code: newFilterCode, value: defaultValue }]);
            setNewFilterCode('');
        }
    };
    
    const updateFilterValue = (code: string, value: number) => {
        setActiveFilters(prev => prev.map(f => 
            f.code === code ? { ...f, value } : f
        ));
    };

    const removeFilter = (code: string) => {
        setActiveFilters(prev => prev.filter(f => f.code !== code));
    };
    
    const selectableFilters = allFilterInfo.filter(f => 
        availableFilters.includes(f.code)
    );

    const getFilterTypeChip = (code: string) => {
        const metadata = getFilterMetadata(code);
        const colorMap = {
            [FILTER_TYPES.BOOLEAN]: 'primary',
            [FILTER_TYPES.PRICE]: 'success',
            [FILTER_TYPES.PERCENTAGE]: 'warning',
            [FILTER_TYPES.VOLUME]: 'info',
            [FILTER_TYPES.DATE]: 'secondary',
            [FILTER_TYPES.RATIO]: 'default'
        };
        
        return (
            <Chip 
                label={metadata.type} 
                size="small" 
                color={colorMap[metadata.type] || 'default'}
                sx={{ ml: 1 }}
            />
        );
    };

    return (
        <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                    <Typography variant="h6" fontWeight="bold">
                        Filters
                    </Typography>
                    {activeFilters.length > 0 && (
                        <Chip 
                            label={`${activeFilters.length} active`} 
                            size="small" 
                            color="primary" 
                            sx={{ ml: 2 }}
                        />
                    )}
                </Box>
                <Button 
                    onClick={() => setShowFilters(prev => !prev)} 
                    startIcon={<FilterList />} 
                    endIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
                    variant="outlined"
                >
                    {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
            </Box>

            <Collapse in={showFilters}>
                <Box display="flex" alignItems="center" gap={2} my={2}>
                    <FormControl sx={{ minWidth: 300 }}>
                        <InputLabel id="add-filter-label">Add Filter</InputLabel>
                        <Select
                            labelId="add-filter-label"
                            value={newFilterCode}
                            onChange={(e) => setNewFilterCode(e.target.value)}
                            label="Add Filter"
                            disabled={!availableFilters.length}
                        >
                            {selectableFilters.map(filter => (
                                <MenuItem key={filter.code} value={filter.code}>
                                    <Box display="flex" alignItems="center" width="100%">
                                        <Typography>{filter.display_name}</Typography>
                                        {getFilterTypeChip(filter.code)}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>
                            {newFilterCode && getFilterMetadata(newFilterCode).description}
                        </FormHelperText>
                    </FormControl>
                    <Button 
                        onClick={addFilter} 
                        variant="contained" 
                        startIcon={<Add />} 
                        disabled={!newFilterCode}
                    >
                        Add Filter
                    </Button>
                </Box>
                
                {activeFilters.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                        No filters active. Add filters to refine your scanner results.
                    </Typography>
                ) : (
                    <Box display="flex" flexDirection="column" gap={2}>
                        <Typography variant="body2" color="text.secondary">
                            All filters are applied together (AND logic). Results must match all criteria.
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={2}>
                            {activeFilters.map(filter => {
                                const metadata = getFilterMetadata(filter.code);
                                return (
                                    <Card key={filter.code} variant="outlined" sx={{ p: 2, width: '100%'}}>
                                        <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                                            <Box flex={1}>
                                                <Box display="flex" alignItems="center" mb={1}>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {getFilterDisplayName(filter.code)}
                                                    </Typography>
                                                    {getFilterTypeChip(filter.code)}
                                                    <Tooltip title={metadata.description}>
                                                        <IconButton size="small" sx={{ ml: 1 }}>
                                                            <Help fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                                <TextField
                                                    type="number"
                                                    value={filter.value}
                                                    onChange={(e) => updateFilterValue(
                                                        filter.code, 
                                                        parseFloat(e.target.value) || 0
                                                    )}
                                                    size="small"
                                                    fullWidth
                                                    placeholder={metadata.placeholder}
                                                    inputProps={{
                                                        step: metadata.type === FILTER_TYPES.PERCENTAGE ? 0.1 : 
                                                              metadata.type === FILTER_TYPES.PRICE ? 0.01 : 1,
                                                        min: metadata.type === FILTER_TYPES.BOOLEAN ? 0 : undefined,
                                                        max: metadata.type === FILTER_TYPES.BOOLEAN ? 1 : undefined
                                                    }}
                                                />
                                            </Box>
                                            <IconButton 
                                                onClick={() => removeFilter(filter.code)} 
                                                size="small" 
                                                color="error"
                                            >
                                                <Delete />
                                            </IconButton>
                                        </Box>
                                    </Card>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </Collapse>
        </Box>
    );
};

export default ScannerFilters;
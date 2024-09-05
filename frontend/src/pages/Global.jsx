// Global.jsx
import React from 'react'
import TickerTape from '@/components/tradingView/TickerTapeTradingView'
import SwitchableHeatMap from '@/components/SwitchHeatMap'
import { Box } from '@mui/material'
import Timeline from '@/components/tradingView/TimelineTradingView'
import HotList from '@/components/tradingView/HotListTradingVIew'
import TechnicalAnalysis from '@/components/tradingView/TechnicalAnalysisTradingView'
import { useTheme } from "@/contexts/ThemeContext";

function Global() {
    const { mode } = useTheme();
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
        }}>
            <TickerTape mode={mode}/>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-around',
            }}>
                <Timeline mode={mode}/>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    height: 750,
                    width: 1050,
                    overflowY: 'auto',
                    alignItems: 'center',
                    '&::-webkit-scrollbar': {
                        width: '20px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#d6dee1',
                        borderRadius: '20px',
                        border: '6px solid transparent',
                        backgroundClip: 'content-box',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                        backgroundColor: '#a8bbbf',
                    },
                }}>
                    <SwitchableHeatMap mode={mode}/>

                    <Box sx={{
                        minHeight: '70vh',
                        width: '100%',
                        padding: '0 20px',
                        mb: 6
                    }}>
                        <TechnicalAnalysis mode={mode}/>
                    </Box>
                </Box>
                <HotList mode={mode}/>
                
            </Box>
        </Box>
    )
}

export default Global
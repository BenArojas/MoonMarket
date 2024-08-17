// Global.jsx
import React from 'react'
import TickerTape from '@/components/tradingView/TickerTapeTradingView'
import SwitchableHeatMap from '@/components/SwitchHeatMap'
import { Box, Container } from '@mui/material'
import Timeline from '@/components/tradingView/TimelineTradingView'
import HotList from '@/components/tradingView/HotListTradingVIew'
import StockScreener from '@/components/tradingView/StockScreenerTradingView'
import TechnicalAnalysis from '@/components/tradingView/TechnicalAnalysisTradingView'
import EconomicCalander from '@/components/tradingView/EconomicCalanderTradingView'
import { MinimizeSharp } from '@mui/icons-material'

function Global() {
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
        }}>
            <TickerTape />
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-around',
            }}>
                <Timeline />
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
                    <SwitchableHeatMap />
                    <Box sx={{
                        display: 'flex',
                        gap: 5,
                        p: 2,
                        mb: 5
                    }}>
                        <HotList />
                        <StockScreener />
                    </Box>
                    <Box sx={{
                        minHeight: '70vh',
                        width: '100%',
                        padding: '0 20px',
                        mb: 6
                    }}>
                        <TechnicalAnalysis />
                    </Box>

                </Box>
                <EconomicCalander />
            </Box>
        </Box>
    )
}

export default Global
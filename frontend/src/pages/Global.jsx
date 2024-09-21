// Global.jsx
import React from 'react'
import TickerTape from '@/components/tradingView/TickerTapeTradingView'
import SwitchableHeatMap from '@/components/SwitchHeatMap'
import { Box } from '@mui/material'
import Timeline from '@/components/tradingView/TimelineTradingView'
import HotList from '@/components/tradingView/HotListTradingVIew'
import TechnicalAnalysis from '@/components/tradingView/TechnicalAnalysisTradingView'
import { useThemeHook } from "@/contexts/ThemeContext";
import { flexRender } from '@tanstack/react-table'

function Global() {
    const { mode } = useThemeHook();
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            height: '80vh',
            overflowY: 'auto',
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
            <Box sx={{
                position: 'sticky',
            }}>
                <TickerTape mode={mode} />
            </Box>
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-around',
            }}>
                <Timeline mode={mode} />
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    width: 1100,
                    alignItems: 'center',
                }}>
                    <SwitchableHeatMap mode={mode} />
                    <Box sx={{
                        minHeight: '70vh',
                        width: '100%',
                        mb: 2
                    }}>
                        <TechnicalAnalysis mode={mode} />
                    </Box>
                </Box>
                <Box sx={{
                    position: 'sticky',
                }}>
                    <HotList mode={mode} />
                </Box>
            </Box>
        </Box>
    )
}

export default Global
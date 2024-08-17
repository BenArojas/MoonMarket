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

function Global() {
    return (
        <Box sx={{
            display:'flex',
            flexDirection:'column',
            gap:5,
        }}> 
            <TickerTape/>
            <Box sx={{
                display:'flex',
                justifyContent: 'space-around',
            }}>
                <Timeline/>
                <Box sx={{
                    display:'flex',
                    flexDirection:'column',
                    gap: 5,
                    height:750,
                    width:1050,
                    overflowY:'auto',
                    alignItems: 'center',
                }}>
                    <SwitchableHeatMap/>
                    <Box sx={{
                        display:'flex',
                        gap:5,
                        p:2,
                        mb:5
                    }}>
                        <HotList/>
                        <StockScreener/>
                    </Box>
                    <div style={{
                        height: 500,
                        width: 800
                    }}><TechnicalAnalysis/> </div>
                   
                </Box>
                <EconomicCalander />
            </Box>
        </Box>
    )
}

export default Global
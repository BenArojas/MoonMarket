// Global.jsx
import React from 'react'
import TickerTape from '@/components/TickerTapeTradingView'
import SwitchableHeatMap from '@/components/SwitchHeatMap'
import { Box, Container } from '@mui/material'
import Timeline from '@/components/TimelineTradingView'

function Global() {
    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            justifyContent: 'center',
            alignItems: 'center',
        }}>
            <TickerTape />

            <Container maxWidth="lg">
                <Box sx={{
                    display: 'flex',
                    gap: 5,
                    height: '600px', // Set a fixed height for both charts
                }}>
                    <Box sx={{ flex: 2 }}> {/* This will take up 2/3 of the space */}
                        <SwitchableHeatMap />
                    </Box>
                    <Box sx={{ flex: 1 }}> {/* This will take up 1/3 of the space */}
                        <Timeline />
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}

export default Global
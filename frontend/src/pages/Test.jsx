
import React from 'react'
import CandleStickChart from '@/components/CandleSticksChart'
import { Card, CircularProgress } from '@mui/material'
import { Height } from '@mui/icons-material'

function Test() {
  return (
    <div>
      {/* <CandleStickChart/> */}
      <Card sx={{
        width: '100%',
        Height: '100%',
        display:'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <CircularProgress></CircularProgress>
      </Card>
    </div>
  )
}

export default Test
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const MarketStatus = () => {
    const [status, setStatus] = useState('');

    useEffect(() => {
        const updateStatus = () => {
            const now = new Date();
            const israelTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
            const day = israelTime.getDay();
            const hours = israelTime.getHours();
            const minutes = israelTime.getMinutes();
            const time = hours * 60 + minutes;

            if (day === 6 || day === 0) {
                setStatus('Closed (Weekend)');
            } else if (time >= 660 && time < 990) { // 11:00 to 16:30 Israel time
                setStatus('Pre-market');
            } else if (time >= 990 && time < 1380) { // 16:30 to 23:00 Israel time
                setStatus('Regular market');
            } else if ((time >= 1380 && time <= 1439) || (time >= 0 && time < 180)) { // 23:00 to 03:00 Israel time
                setStatus('After-market');
            } else {
                setStatus('Closed');
            }
        };

        updateStatus();
        const interval = setInterval(updateStatus, 300000); // Update every 5 minutes

        return () => clearInterval(interval);
    }, []);

    return <Box sx={{
        paddingTop: '0.5em',
    }}>
        <Typography variant="subtitle1">Market Status: {status}</Typography>
    </Box>;
};

export default MarketStatus;
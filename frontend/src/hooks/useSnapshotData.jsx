import React, { useEffect, useState } from 'react'
import { getPortfolioSnapshots } from '@/api/portfolioSnapshot'
import { useAuth } from "@/pages/AuthProvider";

function useSnapshotData(refreshTrigger) {
    const { token } = useAuth();
    const [dailySnapshots, setDailySnapshots] = useState([])


    useEffect(() => {
        async function fetchSnapshotsData() {
            const dailyTimeFrame = await getPortfolioSnapshots(token)
            setDailySnapshots(dailyTimeFrame.data)
        }
        fetchSnapshotsData()
    }, [refreshTrigger])  
    
    // useEffect(() => {
    //     console.log("Updated Hourly Snapshots:", hourlySnapshots);
    // }, [hourlySnapshots]);

    // useEffect(() => {
    //     console.log("Updated Daily Snapshots:", dailySnapshots);
    // }, [dailySnapshots]);


    return  dailySnapshots
}

export default useSnapshotData
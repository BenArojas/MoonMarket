import React, { useEffect, useState } from 'react'
import { getPortfolioSnapshots } from '@/api/portfolioSnapshot'
import { useAuth } from "@/pages/AuthProvider";

function useSnapshotData() {
    const { token } = useAuth();
    const [hourlySnapshots, setHourlySnapshots] = useState(null)
    const [dailySnapshots, setDailySnapshots] = useState(null)


    useEffect(() => {
        async function fetchSnapshotsData() {
            const [hourlyResponse, dailyResponse] = await Promise.all([
                getPortfolioSnapshots(token, "intraday"),
                getPortfolioSnapshots(token, "daily")
            ])
            setHourlySnapshots(hourlyResponse.data)
            setDailySnapshots(dailyResponse.data)
        }

        fetchSnapshotsData()
    }, [])  // Only re-run if token changes
    
    // useEffect(() => {
    //     console.log("Updated Hourly Snapshots:", hourlySnapshots);
    // }, [hourlySnapshots]);

    // useEffect(() => {
    //     console.log("Updated Daily Snapshots:", dailySnapshots);
    // }, [dailySnapshots]);


    return [hourlySnapshots, dailySnapshots]
}

export default useSnapshotData
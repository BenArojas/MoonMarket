import React, { useEffect, useState } from 'react'
import { getStockFromPortfolio } from "@/api/stock";

function useHoldingsData(holdingsList, userData) {
    const [holdingsData, setHoldingsData] = useState([])
    useEffect(() => {
        const getStocksData = async () => {
            // populate the holdings
            let promises = holdingsList.map((holding) =>
                getStockFromPortfolio(holding.ticker )
            );
            let results = await Promise.all(promises);

            if (results.length === holdingsList.length) {
                setHoldingsData(results);
            }
        }
        if (holdingsList.length > 0) {
            getStocksData();
        } else {
            setHoldingsData([]); // Reset holdings data if there are no holdings
        }
    }, [holdingsList, userData])

    return holdingsData
}

export default useHoldingsData
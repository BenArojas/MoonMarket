import React, { useEffect, useState } from 'react';
import { getStocksFromPortfolio } from "@/api/stock";

function useHoldingsData(holdingsList) {
    const [holdingsData, setHoldingsData] = useState([]);

    useEffect(() => {
        const fetchHoldingsData = async () => {
            if (holdingsList.length > 0) {
                const tickers = holdingsList.map(holding => holding.ticker);
                const results = await getStocksFromPortfolio(tickers);
                setHoldingsData(results);
            } else {
                setHoldingsData([]);
            }
        };

        fetchHoldingsData();
    }, [holdingsList]);

    return holdingsData;
}

export default useHoldingsData;
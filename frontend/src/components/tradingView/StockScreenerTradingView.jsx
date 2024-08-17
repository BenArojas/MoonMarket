
import React, { useEffect, useRef } from 'react';

const StockScreener = () => {
    const container = useRef();

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
       {
        "width": "600",
        "height": "500",
        "defaultColumn": "overview",
        "defaultScreen": "most_capitalized",
        "showToolbar": true,
        "locale": "en",
        "market": "us",
        "colorTheme": "light"
    }`;
        container.current.appendChild(script);
    }, []);

    return (
        <div className="tradingview-widget-container" ref={container} />
           
    );
};

export default StockScreener;
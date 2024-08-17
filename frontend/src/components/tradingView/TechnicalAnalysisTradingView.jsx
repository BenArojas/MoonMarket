// HotList.jsx
import React, { useEffect, useRef } from 'react';

const TechnicalAnalysis = () => {
    const container = useRef();

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/tv.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
        {
        "container_id": "technical-analysis-chart-demo",
        "width": "100%",
        "height": "100%",
        "autosize": true,
        "symbol": "AAPL",
        "interval": "D",
        "timezone": "exchange",
        "theme": "light",
        "style": "1",
        "withdateranges": true,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "save_image": false,
        "studies": [
        "ROC@tv-basicstudies",
        "StochasticRSI@tv-basicstudies",
        "MASimple@tv-basicstudies"
        ],
        "show_popup_button": true,
        "popup_width": "1000",
        "popup_height": "650",
        "support_host": "https://www.tradingview.com",
        "locale": "en"
    }`;
        container.current.appendChild(script);
    }, []);

    return (
        <div className="tradingview-widget-container" ref={container} style={{ height: '100%' }}>
           
        </div>
    );
};

export default TechnicalAnalysis;
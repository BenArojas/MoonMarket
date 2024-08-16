import React, { useEffect, useRef } from 'react';

const TickerTape = () => {
    const container = useRef();

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
      {
        "symbols": [
          {
            "proName": "FOREXCOM:SPXUSD",
            "title": "S&P 500 Index"
          },
          {
            "proName": "BITSTAMP:BTCUSD",
            "title": "Bitcoin"
          },
          {
            "proName": "BITSTAMP:ETHUSD",
            "title": "Ethereum"
          },
          {
            "description": "ILS TO USD",
            "proName": "FOREXCOM:USDILS"
          },
          {
            "description": "Russel",
            "proName": "AMEX:IWM"
          },
          {
            "description": "Nikkei",
            "proName": "TVC:NI225"
          },
          {
            "description": "Vix",
            "proName": "TVC:VIX"
          },
          {
            "description": "Nasdaq",
            "proName": "NASDAQ:NDX"
          }
        ],
        "showSymbolLogo": true,
        "isTransparent": false,
        "displayMode": "adaptive",
        "colorTheme": "light",
        "locale": "en"
      }`;
        container.current.appendChild(script);
    }, []);

    return (
        <div className="tradingview-widget-container" ref={container}>
            <div className="tradingview-widget-container__widget"></div>
        </div>
    );
};

export default TickerTape;
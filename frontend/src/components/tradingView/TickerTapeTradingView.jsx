import React, { useEffect, useRef } from 'react';

const TickerTape = ({ mode }) => {
  const container = useRef();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig = {
      symbols: [
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
        { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500 Index" },
        { description: "Nasdaq", proName: "NASDAQ:NDX" },
        { description: "Russel", proName: "AMEX:IWM" },
        { description: "Vix", proName: "CAPITALCOM:VIX" },
        { description: "Nikkei", proName: "OANDA:JP225USD" },
        { description: "ILS TO USD", proName: "FOREXCOM:USDILS" }
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: "adaptive",
      colorTheme: mode === 'dark' ? 'dark' : 'light',
      locale: "en"
    };

    script.innerHTML = JSON.stringify(widgetConfig);

    if (container.current) {
      container.current.innerHTML = ''; // Clear previous content
      container.current.appendChild(script);
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [mode]); // Re-run effect when mode changes

  return (
    <div className="tradingview-widget-container" ref={container}></div>
  );
};

export default TickerTape;
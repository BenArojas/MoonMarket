import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget({ mode }) {
  const container = useRef();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig = {
      symbol: "NASDAQ:AAPL",
      interval: "D",
      timezone: "Etc/UTC",
      theme: mode === 'dark' ? 'dark' : 'light',
      style: "1",
      locale: "en",
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      studies: [
        "STD;RSI"
      ],
      support_host: "https://www.tradingview.com"
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
  }, [mode]);

  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(TradingViewWidget);
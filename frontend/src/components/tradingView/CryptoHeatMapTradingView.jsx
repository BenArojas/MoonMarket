import React, { useEffect, useRef, memo } from 'react';

function CryptoHeatMap({ mode }) {
  const container = useRef();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig = {
      dataSource: "Crypto",
      blockSize: "market_cap_calc",
      blockColor: "change",
      locale: "en",
      symbolUrl: "",
      colorTheme: mode === 'dark' ? 'dark' : 'light',
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "100%"
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
    <div className="tradingview-widget-container" ref={container} />
  );
}

export default memo(CryptoHeatMap);
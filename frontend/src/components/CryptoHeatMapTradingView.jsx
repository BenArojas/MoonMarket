// CryptoHeatMap.jsx
import React, { useEffect, useRef, memo } from 'react';

function CryptoHeatMap() {
  const container = useRef();
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "dataSource": "Crypto",
        "blockSize": "market_cap_calc",
        "blockColor": "change",
        "locale": "en",
        "symbolUrl": "",
        "colorTheme": "light",
        "hasTopBar": false,
        "isDataSetEnabled": false,
        "isZoomEnabled": true,
        "hasSymbolTooltip": true,
        "isMonoSize": false,
        "width": "100%",
        "height": "100%"
      }`;
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: '100%' }}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(CryptoHeatMap);
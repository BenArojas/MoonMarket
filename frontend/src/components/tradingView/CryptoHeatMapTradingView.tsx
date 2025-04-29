import React, { useEffect, useRef, memo } from 'react';

export interface ThemeModeProps {
  mode: 'light' | 'dark';
}

const CryptoHeatMap: React.FC<ThemeModeProps> = ({ mode }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script: HTMLScriptElement = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig: Record<string, string | boolean | number> = {
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
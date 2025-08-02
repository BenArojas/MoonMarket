import React, { useEffect, useRef, memo } from 'react';
import { ThemeModeProps } from './CryptoHeatMapTradingView';

const StockHeatMap: React.FC<ThemeModeProps> = ({ mode }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script: HTMLScriptElement = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig: Record<string, string | boolean | string[] | number> = {
      exchanges: [],
      dataSource: "SPX500",
      grouping: "sector",
      blockSize: "market_cap_basic",
      blockColor: "change",
      locale: "en",
      symbolUrl: "",
      colorTheme: mode === 'dark' ? 'dark' : 'light',
      hasTopBar: false,
      isDataSetEnabled: true,
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
};

export default memo(StockHeatMap);
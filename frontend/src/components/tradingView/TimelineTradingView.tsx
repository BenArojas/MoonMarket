import React, { useEffect, useRef } from 'react';
import { ThemeModeProps } from './CryptoHeatMapTradingView';


const Timeline: React.FC<ThemeModeProps> = ({ mode }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script: HTMLScriptElement = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig: Record<string, string | boolean | number> = {
      feedMode: "all_symbols",
      isTransparent: false,
      displayMode: "adaptive",
      width: 350,
      height: 600,
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
  }, [mode]);

  return (
    <div className="tradingview-widget-container" ref={container}></div>
  );
};

export default Timeline;
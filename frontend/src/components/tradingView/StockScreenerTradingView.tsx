import { useEffect, useRef } from 'react';

const StockScreener: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script: HTMLScriptElement = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
    script.type = "text/javascript";
    script.async = true;

    const widgetConfig: Record<string, string | boolean | number> = {
      width: "600",
      height: "500",
      defaultColumn: "overview",
      defaultScreen: "most_capitalized",
      showToolbar: true,
      locale: "en",
      market: "us",
      colorTheme: "light"
    };

    script.innerHTML = JSON.stringify(widgetConfig);

    if (container.current) {
      container.current.innerHTML = ''; // Clear previous content
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container} />
  );
};

export default StockScreener;
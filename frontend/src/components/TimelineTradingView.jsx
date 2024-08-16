import React, { useEffect, useRef } from 'react';

const Timeline = () => {
  const container = useRef();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "feedMode": "all_symbols",
        "isTransparent": false,
        "displayMode": "adaptive",
        "width": "100%",
        "height": "100%",
        "colorTheme": "light",
        "locale": "en"
      }`;
    container.current.appendChild(script);
  }, []);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: '100%' }}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
        </a>
      </div>
    </div>
  );
};

export default Timeline;
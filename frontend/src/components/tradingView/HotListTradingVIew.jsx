import React, { useEffect, useRef } from 'react';

const HotList = ({ mode }) => {
    const container = useRef();

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js";
        script.type = "text/javascript";
        script.async = true;

        const widgetConfig = {
            colorTheme: mode === 'dark' ? 'dark' : 'light',
            dateRange: "12M",
            exchange: "US",
            showChart: true,
            locale: "en",
            largeChartUrl: "",
            isTransparent: false,
            showSymbolLogo: true,
            showFloatingTooltip: true,
            width: "350",
            height: "600",
            plotLineColorGrowing: "rgba(41, 98, 255, 1)",
            plotLineColorFalling: "rgba(41, 98, 255, 1)",
            gridLineColor: "rgba(240, 243, 250, 0)",
            scaleFontColor: "rgba(19, 23, 34, 1)",
            belowLineFillColorGrowing: "rgba(41, 98, 255, 0.12)",
            belowLineFillColorFalling: "rgba(41, 98, 255, 0.12)",
            belowLineFillColorGrowingBottom: "rgba(41, 98, 255, 0)",
            belowLineFillColorFallingBottom: "rgba(41, 98, 255, 0)",
            symbolActiveColor: "rgba(41, 98, 255, 0.12)"
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

export default HotList;
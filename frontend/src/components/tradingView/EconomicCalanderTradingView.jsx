// HotList.jsx
import React, { useEffect, useRef } from 'react';

const EconomicCalander = () => {
    const container = useRef();

    useEffect(() => {

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = `
        {
        "colorTheme": "light",
        "isTransparent": false,
        "width": 350,
        "height": 600,
        "locale": "en",
        "importanceFilter": "-1,0,1",
        "countryFilter": "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu"
        }`;
        container.current.appendChild(script);
    }, []);

    return (
        <div className="tradingview-widget-container" ref={container}>

        </div>
    );
};

export default EconomicCalander;
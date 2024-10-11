import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode,PriceScaleMode } from 'lightweight-charts';
import { useTheme } from "@mui/material";

const PerformanceChart = ({ data }) => {
    //todo: make priceScaleMode percentage
    const chartContainerRef = useRef();
    const theme = useTheme();

    useEffect(() => {
        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };

        // Find the maximum value in the dataset
        // const minValue = Math.min(...data.map(item => item.value));
        const MaxValue = Math.max(...data.map(item => item.value));

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: theme.palette.text.primary,
                attributionLogo: false,
            },
            grid: {
                horzLines: {
                    color: theme.palette.text.disabled,
                    visible: false,
                },
                vertLines: {
                    visible: false,
                }
            },
            crosshair: {
                mode: CrosshairMode.Hidden,
            },
            width: chartContainerRef.current.clientWidth,
            height: 250,
            handleScroll: false,
            handleScale: false,
            rightPriceScale: {
                scaleMargins: {
                    top: 0.35,
                    bottom: 0.15,
                },
            },
            // mode: PriceScaleMode.Percentage
        });
        // chart.applyOptions({
        //     localization: {
        //         priceFormatter: (price) => `${price}%`
        //     },
        // });

        const baselineSeries = chart.addBaselineSeries({
            baseValue: {
                type: 'price',
                price: 0,
            },
            lastValueVisible: false,
            priceLineVisible: false,
            topLineColor: 'rgba(38, 166, 154, 1)',
            topFillColor1: 'rgba(38, 166, 154, 0.28)',
            topFillColor2: 'rgba(38, 166, 154, 0.05)',
            bottomLineColor: 'rgba(239, 83, 80, 1)',
            bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
            bottomFillColor2: 'rgba(239, 83, 80, 0.28)'
        });

        baselineSeries.setData(data);

        // Set the visible range to include some space above zero
        const priceScale = chart.priceScale('right');
        priceScale.applyOptions({
            autoScale: true,
        });

        // Make the zero line more visible
        const zeroLine = {
            price: 0,
            color: theme.palette.text.primary,
            lineWidth: 1,
            lineStyle: 1,
        };

        baselineSeries.createPriceLine(zeroLine);

        // Ensure zero is visible by adjusting the price scale
        if (MaxValue < 0) {
            chart.applyOptions({
                rightPriceScale: {
                    borderColor: "transparent",
                    scaleMargins: {
                        top: 0.55,  // Increased top margin to make sure 0 is visible
                        bottom: 0.36,
                    },
                    visible: true,
                },
            });
        }
        
        chart.timeScale().fitContent();
        chart.timeScale().applyOptions({
            borderColor: "white",
            fixLeftEdge: true,
            fixRightEdge: true,
        });


        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, theme]);

    return <div ref={chartContainerRef} />;
};

export default PerformanceChart;



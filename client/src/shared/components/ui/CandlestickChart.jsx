import React, { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, CandlestickSeries, LineSeries } from 'lightweight-charts';

export default function CandlestickChart({ data, type = 'candle', className = '' }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#9CA3AF', // Matches text-surface-400
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.2)',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: 'rgba(255, 255, 255, 0.2)',
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true, // Requires lightweight-charts v4+ to resize automatically
    });

    chartRef.current = chart;

    let activeSeries;
    if (type === 'candle') {
      activeSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10B981', // emerald-500
        downColor: '#EF4444', // red-500
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#EF4444',
      });
    } else {
      activeSeries = chart.addSeries(LineSeries, {
        color: '#3B82F6', // blue-500 for line chart
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#fff',
        crosshairMarkerBackgroundColor: '#3B82F6',
      });
    }

    seriesRef.current = activeSeries;

    // Resize handler fallback in case autoSize is buggy in containers
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial size
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [type]); // Re-create chart if type changes

  // Update data when it changes
  useEffect(() => {
    if (seriesRef.current && data && data.length > 0) {
      // Ensure data is sorted by time and formatted properly for lightweight-charts
      const formattedData = data.map(item => ({
        time: Math.floor(item.timestamp / 1000), // lightweight-charts uses seconds
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      })).sort((a, b) => a.time - b.time);
      
      // Remove duplicates based on time
      const uniqueData = [];
      const times = new Set();
      for (const d of formattedData) {
        if (!times.has(d.time)) {
          times.add(d.time);
          uniqueData.push(d);
        }
      }

      if (type === 'line') {
        const lineData = uniqueData.map(d => ({ time: d.time, value: d.close }));
        seriesRef.current.setData(lineData);
      } else {
        seriesRef.current.setData(uniqueData);
      }
      
      chartRef.current.timeScale().fitContent();
    }
  }, [data, type]);

  return (
    <div ref={chartContainerRef} className={`w-full h-full relative ${className}`} />
  );
}

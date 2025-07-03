// src/hooks/useSvgTheming.js
import { useEffect } from 'react';

const useSvgTheming = (svgRef, viewBox, darkMode) => {
  useEffect(() => {
    const applyThemeToSvg = () => {
      const svg = svgRef.current?.contentDocument;
      if (svg) {
        const svgRoot = svg.documentElement;
        svgRoot.setAttribute('viewBox', viewBox);

        const rooms = svgRoot.querySelectorAll('rect');
        rooms.forEach((room) => {
          room.style.stroke = darkMode ? '#ffffff' : '#000000';
          room.style.fill = darkMode ? '#333333' : '#ffffff';
        });

        const texts = svgRoot.querySelectorAll('text');
        texts.forEach((text) => {
          text.setAttribute('fill', darkMode ? '#ffffff' : '#000000');
        });
      }
    };

    applyThemeToSvg();
  }, [svgRef, viewBox, darkMode]);
};

export default useSvgTheming;

import { useRef, useEffect } from 'react';

const usePanZoom = (svgRef, viewBox, setViewBox, entityToAdd) => {
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Guard against null/undefined svgRef or svgRef.current
    if (!svgRef || !svgRef.current) return;
    
    const svg = svgRef.current?.contentDocument || svgRef.current; // Adjust to work with both inline and embedded SVGs
    if (svg) {
      const svgRoot = svg.documentElement || svg; // Adjust to work with both inline and embedded SVGs

      const handlePanStart = (event) => {
        if (entityToAdd) return; // Prevent panning when an entity is selected

        isPanning.current = true;
        const { clientX, clientY } = event.touches ? event.touches[0] : event;
        panStart.current = { x: clientX, y: clientY };
      };

      const handlePanMove = (event) => {
        if (!isPanning.current || !svgRef.current) return;

        const { clientX, clientY } = event.touches ? event.touches[0] : event;
        const [x, y, width, height] = viewBox.split(' ').map(Number);
        const dx = (clientX - panStart.current.x) * (width / svgRef.current.clientWidth);
        const dy = (clientY - panStart.current.y) * (height / svgRef.current.clientHeight);

        setViewBox(`${x - dx} ${y - dy} ${width} ${height}`);
        panStart.current = { x: clientX, y: clientY };
      };

      const handlePanEnd = () => {
        isPanning.current = false;
      };

      svgRoot.addEventListener('mousedown', handlePanStart);
      svgRoot.addEventListener('mousemove', handlePanMove);
      svgRoot.addEventListener('mouseup', handlePanEnd);
      svgRoot.addEventListener('mouseleave', handlePanEnd);

      svgRoot.addEventListener('touchstart', handlePanStart);
      svgRoot.addEventListener('touchmove', handlePanMove);
      svgRoot.addEventListener('touchend', handlePanEnd);
      svgRoot.addEventListener('touchcancel', handlePanEnd);

      return () => {
        svgRoot.removeEventListener('mousedown', handlePanStart);
        svgRoot.removeEventListener('mousemove', handlePanMove);
        svgRoot.removeEventListener('mouseup', handlePanEnd);
        svgRoot.removeEventListener('mouseleave', handlePanEnd);

        svgRoot.removeEventListener('touchstart', handlePanStart);
        svgRoot.removeEventListener('touchmove', handlePanMove);
        svgRoot.removeEventListener('touchend', handlePanEnd);
        svgRoot.removeEventListener('touchcancel', handlePanEnd);
      };
    }
  }, [svgRef, viewBox, setViewBox, entityToAdd]);
};

export default usePanZoom;

// src/components/Map.js
import React, { useRef, useEffect } from 'react';
import './Map.css';
import HouseMap from '../assets/house-map.svg'; // Adjust the path if necessary

const Map = ({ addElement }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    const svg = svgRef.current.contentDocument; // Access the SVG's document

    // Ensure the SVG has loaded before accessing it
    if (svg) {
      const svgRoot = svg.getElementById('layer1'); // Assuming 'layer1' is your main group

      // Function to add a light at specified coordinates
      const addLight = (x, y) => {
        const newLight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        newLight.setAttribute('cx', x);
        newLight.setAttribute('cy', y);
        newLight.setAttribute('r', '5');
        newLight.setAttribute('fill', 'yellow');
        newLight.classList.add('map-light');

        if (svgRoot) {
          svgRoot.appendChild(newLight);
        }
      };

      // Pass the addLight function back to the parent component
      if (addElement) {
        addElement(() => addLight);
      }
    }
  }, [addElement]);

  return (
    <div className="map-container">
      <object ref={svgRef} type="image/svg+xml" data={HouseMap} className="house-map-svg">
        Your browser does not support SVG
      </object>
    </div>
  );
};

export default Map;

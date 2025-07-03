// // src/components/EntitySelector.js
// import React, { useEffect, useState, Suspense } from 'react';
// import AddIcon from '@mui/icons-material/Add';
// import SpeedDial from '@mui/material/SpeedDial';
// import SpeedDialAction from '@mui/material/SpeedDialAction';
// import { fetchDeviceTypes } from '../utils/deviceTypeUtils'; // Import your utility function

// const loadIcon = async (iconName) => {
//   try {
//     const iconModule = await import(`@mui/icons-material/${iconName}`);
//     return iconModule.default;
//   } catch (error) {
//     console.error(`Failed to load icon: ${iconName}`, error);
//     return AddIcon; // Fallback to AddIcon if the specific icon is not found
//   }
// };

// const EntitySelector = ({ setEntityToAdd }) => {
//   const [deviceTypes, setDeviceTypes] = useState([]);
//   const [loadedIcons, setLoadedIcons] = useState({});

//   useEffect(() => {
//     // Fetch device types from backend using the utility function
//     const loadDeviceTypes = async () => {
//       const types = await fetchDeviceTypes();
//       setDeviceTypes(types);
//     };

//     loadDeviceTypes();
//   }, []);

//   useEffect(() => {
//     // Load icons for each device type
//     const fetchIcons = async () => {
//       const icons = {};
//       for (const type of deviceTypes) {
//         icons[type.icon] = await loadIcon(type.icon);
//       }
//       setLoadedIcons(icons);
//     };

//     if (deviceTypes.length) {
//       fetchIcons();
//     }
//   }, [deviceTypes]);

//   return (
//     <SpeedDial
//       ariaLabel="Add Entity"
//       sx={{ position: 'fixed', bottom: 16, right: 16 }}
//       icon={<AddIcon />}
//       direction="up"
//     >
//       {deviceTypes.map((type) => {
//         const IconComponent = loadedIcons[type.icon] || AddIcon; // Fallback to AddIcon
//         return (
//           <Suspense fallback={<AddIcon />} key={type.id}>
//             <SpeedDialAction
//               icon={<IconComponent />}
//               tooltipTitle={`Add ${type.name}`}
//               onClick={() => setEntityToAdd(type.id)}
//             />
//           </Suspense>
//         );
//       })}
//     </SpeedDial>
//   );
// };

// export default EntitySelector;

// src/components/EntitySelector.js
import React, { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OutletIcon from '@mui/icons-material/Outlet';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HotTubIcon from '@mui/icons-material/HotTub';
import { fetchDeviceTypes } from '../utils/deviceTypeUtils';

const EntitySelector = ({ setEntityToAdd }) => {
  const [deviceTypes, setDeviceTypes] = useState([]);

  useEffect(() => {
    fetchDeviceTypes().then(setDeviceTypes);
  }, []);

  const iconMap = {
    Lightbulb: <LightbulbIcon />,
    Outlet: <OutletIcon />,
    Heater: <LocalFireDepartmentIcon />,
    Jacuzzi: <HotTubIcon />,
  };

  return (
    <SpeedDial
      ariaLabel="Add Entity"
      sx={{ position: 'fixed', bottom: 16, right: 16 }}
      icon={<AddIcon />}
      direction="up"
    >
      {deviceTypes.map((type) => (
        <SpeedDialAction
          key={type.id}
          icon={iconMap[type.icon] || <AddIcon />}
          tooltipTitle={`Add ${type.name}`}
          onClick={() => setEntityToAdd(type.name)}
        />
      ))}
    </SpeedDial>
  );
};

export default EntitySelector;


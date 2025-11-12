// src/utils/iconMapping.js
// Maps icon name strings to Material-UI icon components

import LightbulbIcon from '@mui/icons-material/Lightbulb';
import OutletIcon from '@mui/icons-material/Power';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import HotTubIcon from '@mui/icons-material/HotTub';
import AirIcon from '@mui/icons-material/Air';
import WaterIcon from '@mui/icons-material/Water';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';
import KitchenIcon from '@mui/icons-material/Kitchen';
import DeleteIcon from '@mui/icons-material/Delete';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import FloorIcon from '@mui/icons-material/Foundation';
import CoffeeMakerIcon from '@mui/icons-material/Coffee';
import TvIcon from '@mui/icons-material/Tv';
import ComputerIcon from '@mui/icons-material/Computer';
import PhoneIcon from '@mui/icons-material/Phone';
import RouterIcon from '@mui/icons-material/Router';
import BatteryIcon from '@mui/icons-material/BatteryChargingFull';
import SolarPowerIcon from '@mui/icons-material/SolarPower';
import ElectricBikeIcon from '@mui/icons-material/ElectricBike';
import ElectricCarIcon from '@mui/icons-material/ElectricCar';
import PoolIcon from '@mui/icons-material/Pool';
import SpaIcon from '@mui/icons-material/Spa';
import GarageIcon from '@mui/icons-material/Garage';
import LightModeIcon from '@mui/icons-material/LightMode';
import CableIcon from '@mui/icons-material/Cable';
import PowerIcon from '@mui/icons-material/Power';
import BoltIcon from '@mui/icons-material/Bolt';
import FlashOnIcon from '@mui/icons-material/FlashOn';

// Note: Using Kitchen icon for microwave (MicrowaveOutlined may not exist in all MUI versions)
const MicrowaveIcon = KitchenIcon;

/**
 * Map of icon name strings to Material-UI icon components
 */
export const iconMap = {
  // Basic electrical
  Lightbulb: LightbulbIcon,
  Outlet: OutletIcon,
  Power: PowerIcon,
  ToggleOn: ToggleOnIcon,
  ElectricalServices: ElectricalServicesIcon,
  Cable: CableIcon,
  Bolt: BoltIcon,
  FlashOn: FlashOnIcon,
  
  // Heating & Cooling
  LocalFireDepartment: LocalFireDepartmentIcon,
  Thermostat: ThermostatIcon,
  Air: AirIcon,
  AcUnit: AcUnitIcon,
  HeatPump: LocalFireDepartmentIcon,
  
  // Water & Plumbing
  Water: WaterIcon,
  HotTub: HotTubIcon,
  Pool: PoolIcon,
  Spa: SpaIcon,
  
  // Kitchen Appliances
  Kitchen: KitchenIcon,
  Microwave: MicrowaveIcon,
  Refrigerator: AcUnitIcon, // Using AC unit icon as alternative
  Dishwasher: KitchenIcon, // Using kitchen icon
  Oven: MicrowaveIcon, // Using microwave icon as alternative
  CoffeeMaker: CoffeeMakerIcon,
  Toaster: KitchenIcon, // Using kitchen icon as alternative
  Blender: KitchenIcon, // Using kitchen icon as alternative
  
  // Laundry
  LocalLaundryService: LocalLaundryServiceIcon,
  WashingMachine: LocalLaundryServiceIcon, // Using laundry icon
  Dryer: LocalLaundryServiceIcon, // Using laundry icon
  
  // Electronics
  Tv: TvIcon,
  Computer: ComputerIcon,
  Phone: PhoneIcon,
  Router: RouterIcon,
  
  // Power & Energy
  Battery: BatteryIcon,
  SolarPower: SolarPowerIcon,
  ElectricBike: ElectricBikeIcon,
  ElectricCar: ElectricCarIcon,
  
  // Other
  Delete: DeleteIcon,
  Floor: FloorIcon,
  Garage: GarageIcon,
  LightMode: LightModeIcon,
};

/**
 * Get icon component by name string
 * @param {string} iconName - Name of the icon
 * @returns {React.Component} Material-UI icon component or default
 */
export const getIconComponent = (iconName) => {
  if (!iconName) return LocalFireDepartmentIcon; // Default appliance icon
  return iconMap[iconName] || LocalFireDepartmentIcon;
};

/**
 * List of available icons for appliance selection
 * Organized by category
 */
export const availableIcons = [
  // Heating & Cooling
  { name: 'LocalFireDepartment', label: 'Heater/Fire', category: 'heating', id: 'heater-fire' },
  { name: 'Thermostat', label: 'Thermostat', category: 'heating', id: 'thermostat' },
  { name: 'Air', label: 'Air/Fan', category: 'cooling', id: 'air-fan' },
  { name: 'AcUnit', label: 'AC Unit', category: 'cooling', id: 'ac-unit' },
  
  // Water & Plumbing
  { name: 'Water', label: 'Water Heater', category: 'plumbing', id: 'water-heater' },
  { name: 'HotTub', label: 'Hot Tub', category: 'plumbing', id: 'hot-tub' },
  { name: 'Pool', label: 'Pool', category: 'plumbing', id: 'pool' },
  { name: 'Spa', label: 'Spa', category: 'plumbing', id: 'spa' },
  
  // Kitchen Appliances
  { name: 'Kitchen', label: 'Kitchen Appliance', category: 'kitchen', id: 'kitchen-appliance' },
  { name: 'Microwave', label: 'Microwave', category: 'kitchen', id: 'microwave' },
  { name: 'Refrigerator', label: 'Refrigerator', category: 'kitchen', id: 'refrigerator' },
  { name: 'Kitchen', label: 'Dishwasher', category: 'kitchen', id: 'dishwasher' },
  { name: 'Microwave', label: 'Oven', category: 'kitchen', id: 'oven' },
  { name: 'CoffeeMaker', label: 'Coffee Maker', category: 'kitchen', id: 'coffee-maker' },
  { name: 'Kitchen', label: 'Toaster', category: 'kitchen', id: 'toaster' },
  { name: 'Kitchen', label: 'Blender', category: 'kitchen', id: 'blender' },
  
  // Laundry
  { name: 'LocalLaundryService', label: 'Washer/Dryer', category: 'laundry', id: 'washer-dryer' },
  { name: 'LocalLaundryService', label: 'Washing Machine', category: 'laundry', id: 'washing-machine' },
  { name: 'LocalLaundryService', label: 'Dryer', category: 'laundry', id: 'dryer' },
  
  // Electronics
  { name: 'Tv', label: 'TV', category: 'electronics', id: 'tv' },
  { name: 'Computer', label: 'Computer', category: 'electronics', id: 'computer' },
  { name: 'Phone', label: 'Phone', category: 'electronics', id: 'phone' },
  { name: 'Router', label: 'Router', category: 'electronics', id: 'router' },
  
  // Power & Energy
  { name: 'Battery', label: 'Battery', category: 'power', id: 'battery' },
  { name: 'SolarPower', label: 'Solar Power', category: 'power', id: 'solar-power' },
  { name: 'ElectricBike', label: 'Electric Bike', category: 'power', id: 'electric-bike' },
  { name: 'ElectricCar', label: 'Electric Car', category: 'power', id: 'electric-car' },
  
  // Basic Electrical
  { name: 'Lightbulb', label: 'Light', category: 'electrical', id: 'light' },
  { name: 'Outlet', label: 'Outlet', category: 'electrical', id: 'outlet' },
  { name: 'Power', label: 'Power', category: 'electrical', id: 'power' },
  { name: 'Bolt', label: 'Bolt', category: 'electrical', id: 'bolt' },
  { name: 'FlashOn', label: 'Flash', category: 'electrical', id: 'flash' },
  
  // Other
  { name: 'Garage', label: 'Garage', category: 'other', id: 'garage' },
  { name: 'Floor', label: 'Floor Heating', category: 'other', id: 'floor-heating' },
];

/**
 * Get icons grouped by category
 */
export const getIconsByCategory = () => {
  const grouped = {};
  availableIcons.forEach(icon => {
    if (!grouped[icon.category]) {
      grouped[icon.category] = [];
    }
    grouped[icon.category].push(icon);
  });
  return grouped;
};


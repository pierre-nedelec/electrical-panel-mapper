// src/utils/floorPlanUtils.js
import config from '../config';

export const saveFloorPlanToServer = async (floorPlan) => {
  try {
    const response = await fetch(`${config.BACKEND_URL}/floor-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(floorPlan),
    });
    
    if (!response.ok) throw new Error('Failed to save floor plan');
    return await response.json();
  } catch (error) {
    console.error('Error saving floor plan:', error);
    return null;
  }
};

export const loadFloorPlansFromServer = async () => {
  try {
    const response = await fetch(`${config.BACKEND_URL}/floor-plans`);
    if (!response.ok) throw new Error('Failed to load floor plans');
    return await response.json();
  } catch (error) {
    console.error('Error loading floor plans:', error);
    return [];
  }
};

export const deleteFloorPlanFromServer = async (id) => {
  try {
    const response = await fetch(`${config.BACKEND_URL}/floor-plans/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) throw new Error('Failed to delete floor plan');
    return await response.json();
  } catch (error) {
    console.error('Error deleting floor plan:', error);
    return null;
  }
};

// Fallback functions for localStorage (in case server is down)
export const saveFloorPlanLocal = (floorPlan) => {
  const plans = JSON.parse(localStorage.getItem('floorPlans') || '[]');
  const newPlan = { ...floorPlan, id: Date.now() };
  plans.push(newPlan);
  localStorage.setItem('floorPlans', JSON.stringify(plans));
  return newPlan;
};

export const loadFloorPlansLocal = () => {
  return JSON.parse(localStorage.getItem('floorPlans') || '[]');
};

export const deleteFloorPlanLocal = (id) => {
  const plans = JSON.parse(localStorage.getItem('floorPlans') || '[]');
  const filtered = plans.filter(plan => plan.id !== id);
  localStorage.setItem('floorPlans', JSON.stringify(filtered));
  return filtered;
};

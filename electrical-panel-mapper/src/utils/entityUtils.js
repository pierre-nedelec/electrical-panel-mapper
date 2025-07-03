// src/utils/entityUtils.js
import config from '../config';

export const fetchEntities = async () => {
  try {
    const response = await fetch(`${config.BACKEND_URL}/entities`);
    if (!response.ok) throw new Error('Error fetching entities');
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const saveEntity = async (newEntity) => {
  try {
    const response = await fetch(`${config.BACKEND_URL}/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newEntity),
    });
    if (!response.ok) throw new Error('Error saving entity');
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
};

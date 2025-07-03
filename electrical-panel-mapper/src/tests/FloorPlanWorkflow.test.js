// Test suite for Floor Plan Workflow Issues
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FloorPlanDrawer from '../components/FloorPlanDrawer';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('Floor Plan Workflow Issues', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('Duplicate Save Issue', () => {
    test('should not create duplicate plans when saving multiple times', async () => {
      const mockSavedPlans = [
        { id: 1, name: 'Test house', rooms: [], createdAt: '2025-06-18T10:00:00Z' }
      ];
      
      // Mock server response for loading plans
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSavedPlans)
      });

      const { container } = render(<FloorPlanDrawer onSaveFloorPlan={jest.fn()} />);
      
      // Wait for plans to load
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3001/floor-plans');
      });

      // Test multiple save attempts
      const saveButton = container.querySelector('[data-testid="save-button"]');
      if (saveButton) {
        // Mock save response
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 2, name: 'New Plan' })
        });

        fireEvent.click(saveButton);
        fireEvent.click(saveButton); // Second click should not create duplicate
        
        await waitFor(() => {
          // Should only make one save call
          const saveCalls = fetch.mock.calls.filter(call => 
            call[0].includes('/floor-plans') && call[1]?.method === 'POST'
          );
          expect(saveCalls.length).toBeLessThanOrEqual(1);
        });
      }
    });

    test('should prevent rapid consecutive saves', async () => {
      const onSave = jest.fn();
      const { container } = render(<FloorPlanDrawer onSaveFloorPlan={onSave} />);
      
      // Simulate rapid clicking
      const saveButton = container.querySelector('[aria-label*="save"], [title*="Save"]');
      if (saveButton) {
        fireEvent.click(saveButton);
        fireEvent.click(saveButton);
        fireEvent.click(saveButton);
        
        // Should debounce or prevent multiple calls
        expect(onSave).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Floor Plan Loading and Electrical Integration', () => {
    test('should load existing floor plan and enable electrical mode', async () => {
      const existingPlan = {
        id: 1,
        name: 'Test House',
        rooms: [
          { id: 'room1', name: 'Living Room', x: 100, y: 100, width: 200, height: 150 }
        ]
      };

      const { container } = render(
        <FloorPlanDrawer 
          onSaveFloorPlan={jest.fn()} 
          initialFloorPlan={existingPlan}
        />
      );

      // Check if floor plan is loaded
      expect(screen.queryByDisplayValue('Test House')).toBeInTheDocument();
      
      // Check if electrical mode tab exists
      const electricalTab = screen.queryByText('Electrical');
      expect(electricalTab).toBeInTheDocument();

      // Switch to electrical mode
      fireEvent.click(electricalTab);
      
      // Check if electrical tools are visible
      await waitFor(() => {
        expect(screen.queryByText(/Select an electrical component/)).toBeInTheDocument();
      });
    });

    test('should maintain floor plan context when switching modes', async () => {
      const existingPlan = {
        id: 1,
        name: 'Test House',
        rooms: [
          { id: 'room1', name: 'Kitchen', x: 50, y: 50, width: 100, height: 100 }
        ]
      };

      const { container } = render(
        <FloorPlanDrawer 
          onSaveFloorPlan={jest.fn()} 
          initialFloorPlan={existingPlan}
        />
      );

      // Switch between modes
      const electricalTab = screen.queryByText('Electrical');
      const roomsTab = screen.queryByText('Rooms');
      
      if (electricalTab && roomsTab) {
        fireEvent.click(electricalTab);
        fireEvent.click(roomsTab);
        
        // Room should still be visible
        const kitchenRoom = container.querySelector('[id="room1"]');
        expect(kitchenRoom).toBeInTheDocument();
      }
    });
  });

  describe('API Call Analysis', () => {
    test('should track all API calls during floor plan workflow', async () => {
      const apiCallTracker = [];
      const originalFetch = fetch;
      
      fetch.mockImplementation(async (url, options) => {
        apiCallTracker.push({
          url,
          method: options?.method || 'GET',
          timestamp: Date.now()
        });
        
        // Mock responses based on endpoint
        if (url.includes('/floor-plans') && !options?.method) {
          return { ok: true, json: () => Promise.resolve([]) };
        }
        if (url.includes('/electrical/symbols')) {
          return { ok: true, json: () => Promise.resolve([
            { id: 1, name: 'Light', icon: 'Lightbulb' }
          ]) };
        }
        return { ok: true, json: () => Promise.resolve({}) };
      });

      render(<FloorPlanDrawer onSaveFloorPlan={jest.fn()} />);
      
      await waitFor(() => {
        expect(apiCallTracker.length).toBeGreaterThan(0);
      });

      // Analyze API call patterns
      const duplicateCalls = apiCallTracker.reduce((acc, call, index) => {
        const duplicate = apiCallTracker.slice(index + 1).find(
          other => other.url === call.url && other.method === call.method
        );
        if (duplicate) acc.push({ call, duplicate });
        return acc;
      }, []);

      console.log('API Call Analysis:', {
        totalCalls: apiCallTracker.length,
        uniqueEndpoints: [...new Set(apiCallTracker.map(call => call.url))],
        duplicateCalls: duplicateCalls.length,
        callDetails: apiCallTracker
      });

      fetch.mockRestore();
    });
  });

  describe('Auto-save Behavior', () => {
    test('should not trigger excessive auto-saves', (done) => {
      const saveCalls = [];
      localStorageMock.setItem.mockImplementation((key, value) => {
        if (key === 'floorPlanAutoSave') {
          saveCalls.push({ timestamp: Date.now(), value });
        }
      });

      render(<FloorPlanDrawer onSaveFloorPlan={jest.fn()} />);
      
      // Wait and check auto-save frequency
      setTimeout(() => {
        expect(saveCalls.length).toBeLessThan(5); // Should not auto-save too frequently
        done();
      }, 1000);
    });
  });

  describe('Electrical Component Integration', () => {
    test('should load electrical data when floor plan is loaded', async () => {
      fetch.mockImplementation(async (url) => {
        if (url.includes('/floor-plans/1/electrical')) {
          return {
            ok: true,
            json: () => Promise.resolve({
              components: [
                { id: 1, type: 'Light', x: 150, y: 125, floorPlanId: 1 }
              ],
              panels: [],
              circuits: []
            })
          };
        }
        return { ok: true, json: () => Promise.resolve([]) };
      });

      const existingPlan = { id: 1, name: 'Test House', rooms: [] };
      
      render(
        <FloorPlanDrawer 
          onSaveFloorPlan={jest.fn()} 
          initialFloorPlan={existingPlan}
        />
      );

      await waitFor(() => {
        const electricalDataCall = fetch.mock.calls.find(call => 
          call[0].includes('/floor-plans/1/electrical')
        );
        expect(electricalDataCall).toBeTruthy();
      });
    });
  });
});

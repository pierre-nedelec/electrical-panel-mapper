#!/usr/bin/env node

/**
 * Workflow Issue Analysis Tool
 * Analyzes the FloorPlanDrawer component for workflow issues
 */

const fs = require('fs');
const path = require('path');

// Read the FloorPlanDrawer component
const componentPath = path.join(__dirname, '../components/FloorPlanDrawer.js');
const componentCode = fs.readFileSync(componentPath, 'utf8');

console.log('🔍 ANALYZING FLOOR PLAN WORKFLOW ISSUES\n');

// 1. Analyze duplicate save issue
function analyzeDuplicateSaves() {
  console.log('1. 📋 DUPLICATE SAVE ANALYSIS');
  
  // Check for multiple save handlers
  const saveHandlers = [
    'handleSave',
    'handleSaveFloorPlan', 
    'handleSaveAs',
    'onSaveFloorPlan'
  ];
  
  saveHandlers.forEach(handler => {
    const matches = componentCode.match(new RegExp(`${handler}`, 'g'));
    if (matches) {
      console.log(`   - ${handler}: ${matches.length} occurrences`);
    }
  });

  // Check for debouncing/throttling
  const hasDebounce = componentCode.includes('debounce') || componentCode.includes('throttle');
  const hasLoadingState = componentCode.includes('loading') || componentCode.includes('saving');
  
  console.log(`   - Has debouncing: ${hasDebounce ? '✅' : '❌'}`);
  console.log(`   - Has loading state: ${hasLoadingState ? '✅' : '❌'}`);
  
  // Check auto-save frequency
  const autoSaveInterval = componentCode.match(/setInterval.*(\d+)/);
  if (autoSaveInterval) {
    const interval = parseInt(autoSaveInterval[1]);
    console.log(`   - Auto-save interval: ${interval}ms (${interval/1000}s)`);
    if (interval < 10000) {
      console.log(`   ⚠️  WARNING: Auto-save too frequent (< 10s)`);
    }
  }
  
  console.log('');
}

// 2. Analyze floor plan loading workflow
function analyzeLoadingWorkflow() {
  console.log('2. 📂 FLOOR PLAN LOADING ANALYSIS');
  
  // Check initialization flow
  const hasInitialFloorPlan = componentCode.includes('initialFloorPlan');
  const hasLoadEffect = componentCode.includes('useEffect') && componentCode.includes('loadFloorPlansFromServer');
  
  console.log(`   - Handles initial floor plan: ${hasInitialFloorPlan ? '✅' : '❌'}`);
  console.log(`   - Has load effect: ${hasLoadEffect ? '✅' : '❌'}`);
  
  // Check electrical data loading
  const hasElectricalLoad = componentCode.includes('loadElectricalData');
  const hasElectricalEffect = componentCode.includes('currentPlan') && componentCode.includes('useEffect');
  
  console.log(`   - Loads electrical data: ${hasElectricalLoad ? '✅' : '❌'}`);
  console.log(`   - Has electrical effect: ${hasElectricalEffect ? '✅' : '❌'}`);
  
  console.log('');
}

// 3. Analyze state management issues
function analyzeStateManagement() {
  console.log('3. 🏗️ STATE MANAGEMENT ANALYSIS');
  
  // Count useState hooks
  const stateHooks = componentCode.match(/useState/g) || [];
  console.log(`   - Total useState hooks: ${stateHooks.length}`);
  
  // Check for state conflicts
  const electricalStates = [
    'currentMode',
    'electricalComponents', 
    'selectedElectricalTool',
    'selectedComponent'
  ];
  
  electricalStates.forEach(state => {
    const hasState = componentCode.includes(state);
    console.log(`   - ${state}: ${hasState ? '✅' : '❌'}`);
  });
  
  // Check for proper cleanup
  const hasCleanup = componentCode.includes('return () =>') || componentCode.includes('cleanup');
  console.log(`   - Has cleanup functions: ${hasCleanup ? '✅' : '❌'}`);
  
  console.log('');
}

// 4. Analyze API call patterns
function analyzeAPICalls() {
  console.log('4. 🌐 API CALL ANALYSIS');
  
  // Find all fetch calls
  const fetchCalls = componentCode.match(/fetch\([^)]+\)/g) || [];
  console.log(`   - Total fetch calls: ${fetchCalls.length}`);
  
  fetchCalls.forEach((call, index) => {
    console.log(`   - Call ${index + 1}: ${call.substring(0, 50)}...`);
  });
  
  // Check for proper error handling
  const hasTryCatch = componentCode.includes('try {') && componentCode.includes('catch');
  const hasFallback = componentCode.includes('localStorage') && componentCode.includes('fallback');
  
  console.log(`   - Has try/catch: ${hasTryCatch ? '✅' : '❌'}`);
  console.log(`   - Has fallback to localStorage: ${hasFallback ? '✅' : '❌'}`);
  
  console.log('');
}

// 5. Identify specific issues
function identifyIssues() {
  console.log('5. 🚨 IDENTIFIED ISSUES');
  
  const issues = [];
  
  // Check for rapid save prevention
  if (!componentCode.includes('debounce') && !componentCode.includes('saving')) {
    issues.push('No debouncing or loading state for save operations');
  }
  
  // Check for duplicate plan prevention
  if (!componentCode.includes('find') || !componentCode.includes('duplicate')) {
    issues.push('No duplicate plan detection');
  }
  
  // Check for proper electrical integration
  if (!componentCode.includes('loadElectricalData') || !componentCode.includes('currentPlan.id')) {
    issues.push('Electrical data loading not properly tied to floor plan loading');
  }
  
  // Check for auto-save conflicts
  const autoSaveMatch = componentCode.match(/setInterval.*floorPlanAutoSave/);
  if (autoSaveMatch && !componentCode.includes('rooms.length === 0')) {
    issues.push('Auto-save may trigger on empty floor plans');
  }
  
  if (issues.length === 0) {
    console.log('   ✅ No obvious issues detected');
  } else {
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ❌ ${issue}`);
    });
  }
  
  console.log('');
}

// 6. Generate recommendations
function generateRecommendations() {
  console.log('6. 💡 RECOMMENDATIONS');
  
  console.log('   A. Fix Duplicate Saves:');
  console.log('      - Add saving state to prevent multiple clicks');
  console.log('      - Implement debouncing for save operations');
  console.log('      - Check for existing plans before creating new ones');
  
  console.log('   B. Improve Floor Plan Loading:');
  console.log('      - Ensure electrical data loads after floor plan loads');
  console.log('      - Add loading states for better UX');
  console.log('      - Implement proper error handling');
  
  console.log('   C. Optimize State Management:');
  console.log('      - Reduce unnecessary re-renders');
  console.log('      - Implement proper cleanup');
  console.log('      - Consider using useReducer for complex state');
  
  console.log('   D. Testing Strategy:');
  console.log('      - Add unit tests for save operations');
  console.log('      - Test floor plan loading scenarios');
  console.log('      - Mock API calls to test error cases');
  
  console.log('');
}

// Run analysis
analyzeDuplicateSaves();
analyzeLoadingWorkflow();
analyzeStateManagement();
analyzeAPICalls();
identifyIssues();
generateRecommendations();

console.log('🎯 ANALYSIS COMPLETE');
console.log('Run this script with: node src/analysis/workflow-analysis.js');

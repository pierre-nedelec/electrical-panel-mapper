# Electrician Use Cases - Electrical Panel Mapper

## Overview
This document outlines real-world scenarios where electricians would use the Electrical Panel Mapper application, helping guide feature development and user experience design.

---

## 🔧 **PRIMARY USE CASES**

### **1. TROUBLESHOOTING & MAINTENANCE**

#### **Scenario: "Which breaker controls this outlet?"**
**Context**: Homeowner calls electrician because an outlet isn't working. Need to identify which breaker to check.

**User Journey**:
1. Open floor plan for the house
2. Navigate to the room with the problem outlet
3. Click on the outlet component
4. See circuit assignment and breaker number
5. Go to panel and check that specific breaker

**Required Features**:
- ✅ Component selection shows circuit info
- ✅ Clear visual connection between component and panel
- 🔄 Quick search: "Find all components on Circuit 12"
- 🔄 Panel view showing which breaker corresponds to which circuit

#### **Scenario: "I need to turn off power to work on this light fixture"**
**Context**: Electrician needs to safely work on a light fixture and needs to know which breaker to turn off.

**User Journey**:
1. Find the light fixture on the floor plan
2. Check circuit assignment
3. Go to panel and turn off correct breaker
4. Verify power is off before starting work

**Required Features**:
- ✅ Component details show circuit/breaker info
- 🔄 "Safety mode" - highlight all components on same circuit
- 🔄 Print/export circuit information for reference

---

### **2. INSTALLATION & RENOVATION**

#### **Scenario: "Adding a new outlet in the kitchen"**
**Context**: Homeowner wants to add an outlet for a new appliance.

**User Journey**:
1. Open kitchen floor plan
2. Click where new outlet should go
3. Check available circuits with capacity
4. Assign outlet to appropriate circuit
5. Plan wire routing from panel to new location
6. Update panel schedule

**Required Features**:
- ✅ Add new components to floor plan
- 🔄 Circuit load calculation (show available capacity)
- 🔄 Wire routing suggestions
- 🔄 Code compliance checking (outlet spacing, GFCI requirements)

#### **Scenario: "Upgrading electrical panel"**
**Context**: Old panel needs to be replaced with larger capacity.

**User Journey**:
1. Document existing panel configuration
2. Plan new panel layout with more circuits
3. Reassign existing components to new circuit numbers
4. Update all component circuit assignments
5. Generate new panel schedule

**Required Features**:
- 🔄 Panel template library (different sizes/types)
- 🔄 Bulk circuit reassignment tools
- 🔄 Before/after comparison views
- 🔄 Export panel schedule for permit applications

---

### **3. PLANNING & DESIGN**

#### **Scenario: "New construction electrical layout"**
**Context**: Planning electrical system for new home construction.

**User Journey**:
1. Import architect's floor plan
2. Place all required outlets, lights, switches per code
3. Group components into logical circuits
4. Size panel based on total load
5. Generate materials list and cost estimate

**Required Features**:
- 🔄 Code compliance templates (minimum outlet requirements)
- 🔄 Load calculation tools
- 🔄 Materials list generation
- 🔄 Cost estimation integration

#### **Scenario: "Home inspection documentation"**
**Context**: Creating documentation of existing electrical system for inspection or sale.

**User Journey**:
1. Walk through house documenting all electrical components
2. Map each component to its circuit
3. Note any code violations or safety issues
4. Generate comprehensive report

**Required Features**:
- 🔄 Mobile/tablet interface for field use
- 🔄 Photo attachment to components
- 🔄 Violation/issue tracking
- 🔄 Professional report generation

---

## 🎯 **SECONDARY USE CASES**

### **4. COMMUNICATION & COLLABORATION**

#### **Scenario: "Explaining electrical system to homeowner"**
**Context**: Homeowner wants to understand their electrical system.

**User Journey**:
1. Show visual floor plan with electrical components
2. Explain how circuits are organized
3. Point out important safety features (GFCI, AFCI)
4. Provide printed reference for future use

**Required Features**:
- 🔄 "Homeowner mode" - simplified view
- 🔄 Educational tooltips and explanations
- 🔄 Print-friendly layouts

#### **Scenario: "Coordinating with other trades"**
**Context**: Need to share electrical layout with plumber, HVAC, etc.

**User Journey**:
1. Export electrical layout
2. Share with other contractors
3. Coordinate to avoid conflicts
4. Update plan based on feedback

**Required Features**:
- 🔄 Multiple export formats (PDF, DWG, etc.)
- 🔄 Layer visibility controls
- 🔄 Collaboration/commenting tools

---

### **5. CODE COMPLIANCE & SAFETY**

#### **Scenario: "Ensuring code compliance for inspection"**
**Context**: Preparing for electrical inspection by authority having jurisdiction.

**User Journey**:
1. Review all circuits for code compliance
2. Check outlet spacing requirements
3. Verify GFCI/AFCI protection
4. Generate inspection-ready documentation

**Required Features**:
- 🔄 Built-in code checking (NEC compliance)
- 🔄 Inspection checklist generation
- 🔄 Code reference integration

#### **Scenario: "Load analysis for service upgrade"**
**Context**: Determining if electrical service needs to be upgraded.

**User Journey**:
1. Catalog all electrical loads in house
2. Calculate total demand
3. Compare to service capacity
4. Recommend upgrade if needed

**Required Features**:
- 🔄 Load calculation tools
- 🔄 Demand factor calculations
- 🔄 Service sizing recommendations

---

## 📱 **USER INTERFACE REQUIREMENTS**

### **Map Modes (Based on Use Case)**

#### **1. "View Mode" (Default)**
- **Purpose**: Exploring, troubleshooting, reference
- **Features**: 
  - Pan and zoom freely
  - Click components to see info
  - Search and filter capabilities
  - Components locked in place (can't accidentally move)

#### **2. "Edit Mode"**
- **Purpose**: Adding, moving, configuring components
- **Features**:
  - Add new components
  - Move existing components
  - Edit component properties
  - Delete components
  - Circuit assignment

#### **3. "Circuit View Mode"**
- **Purpose**: Understanding circuit organization
- **Features**:
  - Toggle circuit visibility
  - Highlight all components on selected circuit
  - Show load per circuit
  - Circuit color coding

---

## 🚀 **FEATURE PRIORITY MATRIX**

### **HIGH PRIORITY (Must Have)**
- ✅ Component placement and editing
- ✅ Circuit assignment to components
- 🔄 Panel schedule view
- 🔄 Component search and filtering
- 🔄 Basic load calculations

### **MEDIUM PRIORITY (Should Have)**
- 🔄 Circuit visualization (wiring paths)
- 🔄 Code compliance checking
- 🔄 Mobile interface
- 🔄 Export/print functionality
- 🔄 Photo attachments

### **LOW PRIORITY (Nice to Have)**
- 🔄 3D visualization
- 🔄 Cost estimation
- 🔄 Materials list generation
- 🔄 Integration with other software
- 🔄 Advanced reporting

---

## 💡 **KEY INSIGHTS**

### **What Electricians Really Need**:
1. **Speed**: Quick access to "which breaker controls this?"
2. **Accuracy**: Reliable component-to-circuit mapping
3. **Safety**: Clear indication of what's on each circuit
4. **Flexibility**: Easy to update as systems change
5. **Professional**: Generate documentation for customers/inspectors

### **Common Pain Points to Solve**:
- Outdated or missing electrical drawings
- Incorrect panel labeling
- Time wasted hunting for the right breaker
- Difficulty explaining electrical systems to customers
- Code compliance uncertainty

### **Success Metrics**:
- Reduce troubleshooting time by 50%
- Eliminate "hunt and peck" breaker identification
- Improve customer communication and satisfaction
- Ensure 100% code compliance
- Generate professional documentation quickly

---

**Legend**: 
- ✅ Currently implemented
- 🔄 Planned/In development
- 📋 Future consideration 
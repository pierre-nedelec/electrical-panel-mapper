// src/templates/floorPlanTemplates.js
export const floorPlanTemplates = [
  {
    id: 'studio',
    name: 'Studio Apartment',
    description: 'Single room with bathroom and kitchenette',
    viewBox: '0 0 400 300',
    svg: `
      <rect id="main-room" x="50" y="50" width="200" height="150" fill="none" stroke="black" stroke-width="2"/>
      <rect id="bathroom" x="270" y="50" width="80" height="60" fill="none" stroke="black" stroke-width="2"/>
      <rect id="kitchen" x="270" y="130" width="80" height="70" fill="none" stroke="black" stroke-width="2"/>
      <text x="150" y="125" text-anchor="middle" fill="black">Main Room</text>
      <text x="310" y="85" text-anchor="middle" fill="black">Bathroom</text>
      <text x="310" y="170" text-anchor="middle" fill="black">Kitchen</text>
    `
  },
  {
    id: 'one-bedroom',
    name: 'One Bedroom Apartment',
    description: 'Bedroom, living room, kitchen, and bathroom',
    viewBox: '0 0 500 400',
    svg: `
      <rect id="living-room" x="50" y="50" width="180" height="120" fill="none" stroke="black" stroke-width="2"/>
      <rect id="bedroom" x="250" y="50" width="140" height="120" fill="none" stroke="black" stroke-width="2"/>
      <rect id="kitchen" x="50" y="190" width="120" height="100" fill="none" stroke="black" stroke-width="2"/>
      <rect id="bathroom" x="190" y="190" width="80" height="100" fill="none" stroke="black" stroke-width="2"/>
      <rect id="hallway" x="290" y="190" width="100" height="100" fill="none" stroke="black" stroke-width="2"/>
      <text x="140" y="115" text-anchor="middle" fill="black">Living Room</text>
      <text x="320" y="115" text-anchor="middle" fill="black">Bedroom</text>
      <text x="110" y="245" text-anchor="middle" fill="black">Kitchen</text>
      <text x="230" y="245" text-anchor="middle" fill="black">Bathroom</text>
      <text x="340" y="245" text-anchor="middle" fill="black">Hall</text>
    `
  },
  {
    id: 'house',
    name: 'Small House',
    description: 'Two bedrooms, living areas, kitchen, and bathrooms',
    viewBox: '0 0 600 500',
    svg: `
      <rect id="living-room" x="50" y="50" width="200" height="150" fill="none" stroke="black" stroke-width="2"/>
      <rect id="kitchen" x="270" y="50" width="120" height="100" fill="none" stroke="black" stroke-width="2"/>
      <rect id="dining" x="410" y="50" width="120" height="100" fill="none" stroke="black" stroke-width="2"/>
      <rect id="master-bedroom" x="50" y="220" width="180" height="140" fill="none" stroke="black" stroke-width="2"/>
      <rect id="bedroom2" x="250" y="220" width="140" height="140" fill="none" stroke="black" stroke-width="2"/>
      <rect id="bathroom1" x="410" y="170" width="80" height="80" fill="none" stroke="black" stroke-width="2"/>
      <rect id="bathroom2" x="410" y="270" width="80" height="90" fill="none" stroke="black" stroke-width="2"/>
      <rect id="hallway" x="270" y="170" width="120" height="30" fill="none" stroke="black" stroke-width="2"/>
      <text x="150" y="130" text-anchor="middle" fill="black">Living Room</text>
      <text x="330" y="105" text-anchor="middle" fill="black">Kitchen</text>
      <text x="470" y="105" text-anchor="middle" fill="black">Dining</text>
      <text x="140" y="295" text-anchor="middle" fill="black">Master Bedroom</text>
      <text x="320" y="295" text-anchor="middle" fill="black">Bedroom 2</text>
      <text x="450" y="215" text-anchor="middle" fill="black">Bath 1</text>
      <text x="450" y="320" text-anchor="middle" fill="black">Bath 2</text>
    `
  },
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start with an empty grid for custom design',
    viewBox: '0 0 500 400',
    svg: `
      <!-- Grid lines for reference -->
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    `
  }
];

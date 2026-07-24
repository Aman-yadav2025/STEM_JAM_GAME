import React from 'react';
const sprite1 = '/assets/media__1784921637176.png';
const sprite2 = '/assets/media__1784922267446.jpg';

export type PlanetName = 'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'moon';

interface PlanetIconProps {
  planet: PlanetName;
  size?: number;
  className?: string;
}

// Map planet name to its column and row in the sprite sheet
// Columns 0-3, Rows 0-1
const spriteMap: Record<PlanetName, { col: number, row: number, source: number }> = {
  pluto: { col: 0, row: 0, source: 1 },
  mercury: { col: 1, row: 0, source: 1 },
  mars: { col: 2, row: 0, source: 1 },
  venus: { col: 3, row: 0, source: 1 },
  earth: { col: 0, row: 1, source: 1 },
  saturn: { col: 1, row: 1, source: 1 },
  uranus: { col: 2, row: 1, source: 1 },
  neptune: { col: 3, row: 1, source: 1 },
  jupiter: { col: 3, row: 1, source: 2 }, // from the second image
  moon: { col: 0, row: 0, source: 1 }, // fallback to pluto for moon
};

export const PlanetIcon: React.FC<PlanetIconProps> = ({ planet, size = 64, className = '' }) => {
  const data = spriteMap[planet] || spriteMap['pluto'];
  
  const bgImage = data.source === 1 ? sprite1 : sprite2;
  
  const bgSizeX = size * 4;
  const bgSizeY = size * 4;

  const xOffset = -(data.col * size);
  const yOffset = -(data.row * size * 2) - (size * 0.05);

  return (
    <div 
      className={`rounded-full overflow-hidden inline-block ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: `${bgSizeX}px ${bgSizeY}px`,
        backgroundPosition: `${xOffset}px ${yOffset}px`,
        backgroundRepeat: 'no-repeat',
        // Optional: add a subtle drop shadow to make it pop
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
      }}
    />
  );
};

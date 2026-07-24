import React from 'react';
// @ts-ignore
import sprite1 from '@uploaded/media__1784921637176.png';
// @ts-ignore
import sprite2 from '@uploaded/media__1784922267446.jpg';

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
  
  // The sprite sheet has 4 columns and 2 rows.
  // Each cell is 256x512. The planet itself is centered in the top ~256x256 area of the cell.
  // We want to scale the 256x256 area down to `size` x `size`.
  
  // Total background size should be scaled based on the cell size.
  // We are viewing a window of `size` x `size`.
  // The whole image width should be 4 * size.
  // The whole image height should be 2 * (size * 2) = 4 * size, because the cell is twice as tall as it is wide.
  const bgSizeX = size * 4;
  const bgSizeY = size * 4;

  // Calculate pixel offsets.
  // Column offset: col * size
  // Row offset: row * (size * 2)
  // We might need to tweak the row offset slightly if the planet isn't perfectly at the top of the cell.
  // Typically, there's a small border. We can add a Y offset if needed.
  const xOffset = -(data.col * size);
  // Add a small Y offset because the planets are slightly padded from the top edge in the image
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

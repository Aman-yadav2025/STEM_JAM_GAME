import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { World } from './World';
import { CONSTANT_DT } from '../physics/constants'; //[cite: 1]

export const useGameLoop = () => {
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    // Cap delta to 0.1s to prevent the "spiral of death" if the user tabs out
    const safeDelta = Math.min(delta, 0.1);
    accumulator.current += safeDelta;

    // Run the physics step as many times as needed to catch up to real time[cite: 1]
    while (accumulator.current >= CONSTANT_DT) { //[cite: 1]
      World.tick(); // updates game
      accumulator.current -= CONSTANT_DT; //[cite: 1]
    }
  });
};
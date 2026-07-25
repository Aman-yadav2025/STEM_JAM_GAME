import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { World } from './World';
import { CONSTANT_DT, SIMULATION_TIME_SCALE } from '../physics/constants';
import { useStore } from '../state/store';

export const useGameLoop = () => {
  const isPaused = useStore((state) => state.isPaused);
  const accumulator = useRef(0);
  const ticks = useRef(0);

  useFrame((_, delta) => {
    if (isPaused) {
      accumulator.current = 0;
      return;
    }

    const safeDelta = Math.min(delta, 0.1);
    const dt = safeDelta * SIMULATION_TIME_SCALE;
    
    if (dt > 0) {
      World.tick(dt);
      ticks.current++;
      
      // Re-evaluate navigation path periodically to keep the green line updated 
      // as the ship manually flies toward the target.
      if (ticks.current % 30 === 0) {
        useStore.getState().refreshNavigationPath();
      }
    }
  });
};

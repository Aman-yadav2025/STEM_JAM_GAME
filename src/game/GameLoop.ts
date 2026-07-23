import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { World } from './World';
import { CONSTANT_DT, SIMULATION_TIME_SCALE } from '../physics/constants';
import { useStore } from '../state/store';

export const useGameLoop = () => {
  const isPaused = useStore((state) => state.isPaused);
  const accumulator = useRef(0);
  const ticks = useRef(0);
  const stepDt = CONSTANT_DT;

  useFrame((_, delta) => {
    if (isPaused) {
      accumulator.current = 0;
      return;
    }

    const safeDelta = Math.min(delta, 0.1);
    accumulator.current += safeDelta * SIMULATION_TIME_SCALE;

    while (accumulator.current >= stepDt) {
      World.tick(stepDt);
      accumulator.current -= stepDt;
      ticks.current++;
      
      // Re-evaluate navigation path periodically to keep the green line updated 
      // as the ship manually flies toward the target. 30 ticks = 0.5s real time.
      if (ticks.current % 30 === 0) {
        useStore.getState().refreshNavigationPath();
      }
    }
  });
};

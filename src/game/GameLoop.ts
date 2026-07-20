import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { World } from './World';
import { CONSTANT_DT, SIMULATION_TIME_SCALE } from '../physics/constants';

export const useGameLoop = () => {
  const accumulator = useRef(0);
  const stepDt = CONSTANT_DT * SIMULATION_TIME_SCALE;

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.1);
    accumulator.current += safeDelta;

    while (accumulator.current >= stepDt) {
      World.tick(stepDt);
      accumulator.current -= stepDt;
    }
  });
};
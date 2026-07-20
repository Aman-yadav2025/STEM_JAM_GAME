import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { World } from './World';
import { CONSTANT_DT } from '../physics/constants';

export const useGameLoop = () => {
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    const safeDelta = Math.min(delta, 0.1);
    accumulator.current += safeDelta;

    while (accumulator.current >= CONSTANT_DT) {
      World.tick();
      accumulator.current -= CONSTANT_DT;
    }
  });
};
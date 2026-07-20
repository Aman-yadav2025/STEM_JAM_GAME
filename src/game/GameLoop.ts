import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { World } from './World';
import { CONSTANT_DT } from '../physics/constants';
import { useStore } from '../state/store';

export const useGameLoop = () => {
  const isPaused = useStore((state) => state.isPaused);
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    if (isPaused) {
      accumulator.current = 0;
      return;
    }

    const safeDelta = Math.min(delta, 0.1);
    accumulator.current += safeDelta;

    while (accumulator.current >= CONSTANT_DT) {
      World.tick();
      accumulator.current -= CONSTANT_DT;
    }
  });
};

export interface RoboticFact {
  id: string;
  category: 'robotics' | 'aerospace' | 'cybernetics';
  title: string;
  fact: string;
}

export const ROBOTIC_FACTS: RoboticFact[] = [
  {
    id: 'f1',
    category: 'aerospace',
    title: 'Autonomous Orbital Rendezvous',
    fact: 'Modern space probes use optical navigation (OpNav) to track star backgrounds and autonomously correct trajectories millions of kilometers from Earth without human intervention.'
  },
  {
    id: 'f2',
    category: 'robotics',
    title: 'Actuator Resilience',
    fact: 'Space robotics leverage harmonic drive gears with zero backlash, allowing robotic arms to handle payloads heavier than the arm itself in microgravity.'
  },
  {
    id: 'f3',
    category: 'cybernetics',
    title: 'Radiation-Hardened AI',
    fact: 'Deep-space computers use triple-modular redundancy (TMR), voting across three separate processor pipelines to prevent cosmic ray bit-flips from corrupting critical code.'
  },
  {
    id: 'f4',
    category: 'robotics',
    title: 'Autonomous Soil Mechanics',
    fact: 'Planetary rovers analyze laser-induced breakdown spectroscopy (LIBS) data on-the-fly to autonomously select which rock samples warrant drilling.'
  },
  {
    id: 'f5',
    category: 'aerospace',
    title: 'Reaction Wheels',
    fact: 'Spacecraft orient themselves in total vacuum without expending fuel by spinning internal heavy metal flywheels called reaction wheels.'
  }
];
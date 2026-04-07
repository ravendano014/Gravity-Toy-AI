export type ParticleType = 
  | 'matter' 
  | 'antimatter' 
  | 'dark' 
  | 'neutron' 
  | 'blackhole' 
  | 'wormhole' 
  | 'pulsar' 
  | 'quasar' 
  | 'nebula' 
  | 'planet'
  | 'magnetar'
  | 'giant_star'
  | 'supermassive_star'
  | 'white_dwarf'
  | 'comet'
  | 'supernova'
  | 'sun'
  | 'blue_giant'
  | 'neutron_star'
  | 'red_dwarf'
  | 'asteroid'
  | 'spacecraft';
export type GravityMode = 'inverseSquare' | 'exponential' | 'arctanSquared' | 'sechSquared' | 'sech';
export type OrbitType = 'circular' | 'elliptical_low' | 'elliptical_high' | 'retrograde' | 'escape' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface Point {
  x: number;
  y: number;
}

export interface Color {
  0: number; // R
  1: number; // G
  2: number; // B
  3?: string; // Hex string representation
}

export interface ParticleState {
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  type: ParticleType;
  name: string;
  color: Color;
  age: number;
  lifetime: number;
  density: number;
  radius: number;
  isBlackHole: boolean;
  path: Point[];
  pathLength: number;
  collisionEnergy: number;
  collisionTimer: number;
  
  // Special properties
  magnetosphereRadius?: number;
  gravityInfluenceRadius?: number;
  eventHorizonRadius?: number;
  accretionDiskRadius?: number;
  jetRadius?: number;
  rotationSpeed?: number;
  pulsePhase?: number;
}

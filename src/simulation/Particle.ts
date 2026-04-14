import { ParticleType, Color, Point } from '../types';

export class Particle {
  id: string;
  realMass: number;
  realDensity: number;
  realDiameter?: number;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number = 0;
  ay: number = 0;
  type: ParticleType;
  name: string;
  color: Color;
  age: number = 0;
  lifetime: number = Infinity;
  density: number;
  radius: number = 0;
  isBlackHole: boolean;
  path: Point[] = [];
  pathLength: number = 1000;
  collisionEnergy: number = 0;
  collisionTimer: number = 0;
  showHillSphere: boolean = false;

  // Special properties
  magnetosphereRadius?: number;
  gravityInfluenceRadius?: number;
  eventHorizonRadius?: number;
  accretionDiskRadius?: number;
  jetRadius?: number;
  rotationSpeed?: number;
  pulsePhase?: number;
  thrust?: { ax: number; ay: number; duration: number };
  onUpdate?: (p: Particle, h: number) => void;

  constructor(
    t: number, // mass (real kg)
    s: number, // x
    h: number, // y
    i: number, // vx
    o: number, // vy
    a: ParticleType = 'matter',
    n: string = '',
    d: number = 1, // density (real g/cm3)
    c?: Color,
    diameter?: number // diameter (real km)
  ) {
    this.id = Math.random().toString(36).substring(2, 9);
    
    this.realMass = t;
    this.realDensity = d;
    this.realDiameter = diameter;

    // SCALE FACTOR: 1 Solar Mass (1.989e30 kg) = 1e7 Sim Units
    const MASS_SCALE = 1e7 / 1.989e30;
    this.mass = t * MASS_SCALE;
    
    this.x = s;
    this.y = h;
    this.vx = i;
    this.vy = o;
    this.type = a;
    this.name = n;
    this.color = c !== undefined ? { ...c } : [255, 255, 255] as unknown as Color;
    this.density = d;

    this.isBlackHole = this.type === 'blackhole' || this.type === 'quasar';

    // Simulation constants for relativistic scaling
    const C_SQUARED = 1e18; // Increased speed of light squared for better stability with supermassive objects

    if (this.type === 'dark') {
      this.radius = Math.sqrt(this.mass) * 0.5;
      this.name = 'Dark Matter';
      this.color = [100, 100, 255] as unknown as Color;
    } else {
      // Physical radius calculation: R = scale * (M / D)^(1/3)
      // We use a sim-relative scale factor to keep objects visible
      const baseScale = 0.4;
      
      if (this.type === 'matter') {
        this.density = d === 1 ? 1.41 : d; // Default to Sun-like density
        this.color = [
          255,
          Math.round(256 / (1 + Math.pow(this.mass / 1e5, 1))),
          Math.round(256 / (1 + Math.pow(this.mass / 1e4, 1)))
        ] as unknown as Color;
      } else if (this.type === 'antimatter') {
        this.density = d === 1 ? 1.41 : d;
        this.color = [
          Math.round(256 / (1 + Math.pow(this.mass / 1e4, 1))),
          Math.round(256 / (1 + Math.pow(this.mass / 1e5, 1))),
          255
        ] as unknown as Color;
      }

      // Default radius calculation for most objects
      this.radius = baseScale * Math.pow(this.mass / this.density, 1/3);

      // If diameter is provided in km, we can use it to scale the radius
      // 1 Solar Diameter (1,392,700 km) should be roughly the radius of the Sun in sim units
      // Sun radius in sim: 0.4 * (1e7 / 1.41)^(1/3) = 0.4 * 192 = 76.8
      if (diameter) {
        const DIAMETER_SCALE = 76.8 / 1392700;
        this.radius = (diameter / 2) * DIAMETER_SCALE;
      }

      if (this.type === 'neutron' || this.type === 'magnetar' || this.type === 'neutron_star') {
        // Neutron stars are extremely dense
        this.density = d === 1 ? 1e6 : d; 
        this.radius = baseScale * Math.pow(this.mass / this.density, 1/3);
        if (diameter) this.radius = (diameter / 2) * (76.8 / 1392700);
        
        this.magnetosphereRadius = this.radius * (this.type === 'magnetar' ? 200 : 50);
        this.gravityInfluenceRadius = this.radius * 150;
        this.eventHorizonRadius = 0;
        this.accretionDiskRadius = this.radius * 15;
        this.pulsePhase = 0;
        this.name = n || (this.type === 'magnetar' ? 'Magnetar' : 'Neutron Star');
        if (this.type === 'magnetar') {
          this.color = [180, 220, 255] as unknown as Color;
        }
      }

      if (this.type === 'white_dwarf') {
        this.density = d === 1 ? 1e5 : d;
        this.radius = baseScale * Math.pow(this.mass / this.density, 1/3);
        if (diameter) this.radius = (diameter / 2) * (76.8 / 1392700);
        this.color = [240, 248, 255] as unknown as Color;
        this.name = n || 'White Dwarf';
      }

      if (this.type === 'blackhole' || this.type === 'quasar') {
        // Schwarzschild Radius: Rs = 2GM / c^2
        // Using G=800 and C_SQUARED = 1e9
        this.eventHorizonRadius = (2 * 800 * this.mass) / C_SQUARED;
        this.radius = this.eventHorizonRadius; 
        this.accretionDiskRadius = this.radius * 12;
        this.gravityInfluenceRadius = this.radius * 50;
        
        // Black holes are the densest objects
        this.density = d === 1 ? 1e8 : d;

        if (this.type === 'quasar') {
          this.accretionDiskRadius = this.radius * 30;
          this.jetRadius = this.radius * 80;
          this.name = n || `Quasar (${Math.round(this.mass / 1e6)}M☉)`;
        } else {
          this.name = n || `Black Hole (${Math.round(this.mass / 1e4)}M☉)`;
        }
      }

      if (this.type === 'pulsar') {
        this.density = d === 1 ? 1e6 : d;
        this.radius = baseScale * Math.pow(this.mass / this.density, 1/3);
        if (diameter) this.radius = (diameter / 2) * (76.8 / 1392700);
        this.magnetosphereRadius = this.radius * 80;
        this.gravityInfluenceRadius = this.radius * 180;
        this.accretionDiskRadius = this.radius * 10;
        this.pulsePhase = 0;
        this.rotationSpeed = 0.5 + Math.random() * 2;
        this.name = n || 'Pulsar';
      }

      if (this.type === 'spacecraft') {
        this.radius = diameter ? (diameter / 2) * (76.8 / 1392700) : 0.05; 
        if (this.radius < 0.01) this.radius = 0.01; // Minimum radius for stability
        this.density = 1;
        this.name = n || 'Spacecraft';
        // Default color if not provided
        if (!c) {
          this.color = [200, 200, 200] as unknown as Color;
        }
      }

      if (this.type === 'nebula' || this.type === 'supernova') {
        // Nebulae are diffuse, radius scales differently
        this.radius = Math.sqrt(this.mass) * (this.type === 'supernova' ? 1.5 : 0.8);
        this.name = n || (this.type === 'supernova' ? 'Supernova Remnant' : 'Nebula');
        this.color = (this.type === 'supernova' ? [255, 100, 50] : [100, 50, 200]) as unknown as Color;
        if (this.type === 'supernova') {
          this.lifetime = 500 + Math.random() * 500;
        }
      }

      if (this.type === 'planet' || this.type === 'comet' || this.type === 'asteroid') {
        // Small bodies
        this.density = d === 1 ? (this.type === 'planet' ? 5 : (this.type === 'asteroid' ? 3 : 2)) : d;
        this.radius = baseScale * Math.pow(this.mass / this.density, 1/3);
        if (diameter) this.radius = (diameter / 2) * (76.8 / 1392700);
        this.name = n || (this.type === 'comet' ? 'Comet' : (this.type === 'asteroid' ? 'Asteroid' : 'Planet'));
        if (this.type === 'comet') {
          this.color = [200, 230, 255] as unknown as Color;
        } else if (this.type === 'asteroid') {
          this.color = [150, 150, 150] as unknown as Color;
        }
        if (this.type === 'planet' && this.mass > 1000) {
          this.magnetosphereRadius = this.radius * 10;
        }
      }

      if (this.type === 'sun' || this.type === 'blue_giant' || this.type === 'red_dwarf') {
        // Stars
        this.density = d === 1 ? (this.type === 'sun' ? 1.41 : (this.type === 'blue_giant' ? 0.1 : 5)) : d;
        this.radius = baseScale * Math.pow(this.mass / this.density, 1/3);
        if (diameter) this.radius = (diameter / 2) * (76.8 / 1392700);
        this.name = n || (this.type === 'sun' ? 'Sun' : (this.type === 'blue_giant' ? 'Blue Giant' : 'Red Dwarf'));
        if (this.type === 'blue_giant') this.color = [100, 150, 255] as unknown as Color;
        else if (this.type === 'red_dwarf') this.color = [255, 100, 100] as unknown as Color;
        else if (this.type === 'sun') this.color = [255, 255, 150] as unknown as Color;
        this.magnetosphereRadius = this.radius * 25;
      }

      if (this.type === 'giant_star' || this.type === 'supermassive_star') {
        // Stars are less dense than planets but much more massive
        this.density = d === 1 ? 1.4 : d;
        this.radius = baseScale * Math.pow(this.mass / this.density, 1/3) * (this.type === 'supermassive_star' ? 3 : 1.5);
        if (diameter) this.radius = (diameter / 2) * (76.8 / 1392700);
        this.name = n || (this.type === 'supermassive_star' ? 'Supermassive Star' : 'Giant Star');
        this.color = (this.type === 'supermassive_star' ? [150, 200, 255] : [255, 150, 50]) as unknown as Color;
        this.magnetosphereRadius = this.radius * 30;
      }

      if (this.type === 'white_dwarf') {
        this.density = d === 1 ? 1000 : d;
        this.radius = baseScale * Math.pow(this.mass / this.density, 1/3);
        if (diameter) this.radius = (diameter / 2) * (76.8 / 1392700);
        this.name = n || 'White Dwarf';
        this.color = [240, 240, 255] as unknown as Color;
      }

      if (this.type === 'wormhole') {
        this.radius = 15;
        this.mass = 0; // Wormholes might not have mass in this sim
        this.name = n || 'Wormhole';
        this.color = [0, 255, 255] as unknown as Color;
      }
    }

    // Override with custom values if provided
    if (c !== undefined) {
      this.color = { ...c };
    }
    this.density = d;
    
    // Recalculate radius if density was changed and it's not a special type that handles radius differently
    if (this.type !== 'nebula' && this.type !== 'wormhole' && !this.isBlackHole && this.type !== 'dark' && !diameter) {
        const baseScale = 0.4;
        this.radius = baseScale * Math.pow(this.mass / this.density, 1/3);
        
        // Apply type-specific scaling if needed
        if (this.type === 'supermassive_star') this.radius *= 3;
        else if (this.type === 'giant_star') this.radius *= 1.5;
    }

    // Hex string for quick reference
    const r = this.color[0];
    const g = this.color[1];
    const b = this.color[2];
    this.color[3] = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }
}

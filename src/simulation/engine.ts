import { Particle } from './Particle';
import { GravityMode, Color, ParticleType } from '../types';

export class GravityEngine {
  particles: Particle[] = [];
  h: number = 0.002; // Smaller time step for better precision
  G: number = 800;
  gravityMode: GravityMode = 'inverseSquare';
  darkMatterInteractionFactor: number = 0.01;
  collisionRestitution: number = 0.8;

  // Visualization flags
  showOrbits: boolean = false;
  showMagnetospheres: boolean = false;
  showGravityWells: boolean = false;
  showGravitationalLensing: boolean = false;
  showMagneticFields: boolean = false;
  showHillSpheres: boolean = false;
  showGravityInfluence: boolean = false;

  constructor() {}

  addParticle(p: Particle) {
    this.particles.push(p);
  }

  removeParticle(p: Particle) {
    const index = this.particles.indexOf(p);
    if (index !== -1) {
      this.particles.splice(index, 1);
    }
  }

  getDominantSource(p: Particle): Particle | null {
    let dominantOther = null;
    let maxForceFactor = -1;

    for (const other of this.particles) {
      if (other === p || other.mass <= p.mass) continue;
      
      const dx = other.x - p.x;
      const dy = other.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 1) continue;

      // Force factor M/r^2 (G and m are constant for p)
      const forceFactor = other.mass / distSq;
      if (forceFactor > maxForceFactor) {
        maxForceFactor = forceFactor;
        dominantOther = other;
      }
    }
    return dominantOther;
  }

  getLagrangePoints(p1: Particle, p2: Particle) {
    // p1 is primary, p2 is secondary
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / r;
    const uy = dy / r;
    const vx = -uy;
    const vy = ux;

    const m1 = p1.mass;
    const m2 = p2.mass;
    const totalM = m1 + m2;
    const q = m2 / m1;

    // Barycenter
    const bx = (m1 * p1.x + m2 * p2.x) / totalM;
    const by = (m1 * p1.y + m2 * p2.y) / totalM;
    const bvx = (m1 * p1.vx + m2 * p2.vx) / totalM;
    const bvy = (m1 * p1.vy + m2 * p2.vy) / totalM;

    // Angular velocity of the system
    const r_rel_x = p2.x - p1.x;
    const r_rel_y = p2.y - p1.y;
    const v_rel_x = p2.vx - p1.vx;
    const v_rel_y = p2.vy - p1.vy;
    const angular_momentum = r_rel_x * v_rel_y - r_rel_y * v_rel_x;
    const omega = angular_momentum / (r * r);

    const hillRadius = r * Math.pow(q / 3, 1/3);

    const points: { [key: string]: { x: number, y: number, vx: number, vy: number } } = {};

    // L1: Between P1 and P2
    const d1 = r - hillRadius;
    points.L1 = {
      x: p1.x + ux * d1,
      y: p1.y + uy * d1,
      vx: bvx + (p1.x + ux * d1 - bx) * (-omega * uy / ux) * 0, // Placeholder for velocity logic
      vy: bvy + (p1.y + uy * d1 - by) * (omega * ux / uy) * 0  // Placeholder
    };
    // Correct velocity for L1-L5: v = v_barycenter + omega * (r_point - r_barycenter) rotated by 90 deg
    const calcVel = (px: number, py: number) => {
      const rx = px - bx;
      const ry = py - by;
      return {
        vx: bvx - omega * ry,
        vy: bvy + omega * rx
      };
    };

    points.L1 = { x: p1.x + ux * (r - hillRadius), y: p1.y + uy * (r - hillRadius), ...calcVel(p1.x + ux * (r - hillRadius), p1.y + uy * (r - hillRadius)) };
    points.L2 = { x: p1.x + ux * (r + hillRadius), y: p1.y + uy * (r + hillRadius), ...calcVel(p1.x + ux * (r + hillRadius), p1.y + uy * (r + hillRadius)) };
    points.L3 = { x: p1.x - ux * (r * (1 + 5/12 * q)), y: p1.y - uy * (r * (1 + 5/12 * q)), ...calcVel(p1.x - ux * (r * (1 + 5/12 * q)), p1.y - uy * (r * (1 + 5/12 * q))) };
    
    // L4: Equilateral triangle
    const l4x = p1.x + r * (Math.cos(Math.PI/3) * ux - Math.sin(Math.PI/3) * uy);
    const l4y = p1.y + r * (Math.sin(Math.PI/3) * ux + Math.cos(Math.PI/3) * uy);
    points.L4 = { x: l4x, y: l4y, ...calcVel(l4x, l4y) };

    // L5: Equilateral triangle
    const l5x = p1.x + r * (Math.cos(-Math.PI/3) * ux - Math.sin(-Math.PI/3) * uy);
    const l5y = p1.y + r * (Math.sin(-Math.PI/3) * ux + Math.cos(-Math.PI/3) * uy);
    points.L5 = { x: l5x, y: l5y, ...calcVel(l5x, l5y) };

    return points;
  }

  clear() {
    this.particles = [];
  }

  sech(x: number) {
    return 1 / Math.cosh(x);
  }

  integrate() {
    // Calculate accelerations
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      p1.ax = 0;
      p1.ay = 0;

      for (let j = 0; j < this.particles.length; j++) {
        if (i === j) continue;
        const p2 = this.particles[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > 1e-5) {
          let force = 0;
          const scaledDist = dist / 100;
          const rs = p2.eventHorizonRadius || 0;

          if (p2.isBlackHole && dist > rs) {
            // Paczyński–Wiita potential: F = GM / (r - Rs)^2
            // Cap the distance to prevent infinite force near the event horizon
            const effectiveDist = Math.max(dist, rs + 0.1);
            force = (this.G * p2.mass) / Math.pow(effectiveDist - rs, 2);
          } else if (p2.type === 'nebula') {
            // Softened gravity for nebulae to simulate distributed mass
            const softening = p2.radius * 0.5;
            force = (this.G * p2.mass) / (distSq + softening * softening);
            
            // Nebula Drag: Slows down particles passing through
            if (dist < p2.radius) {
              const dragFactor = 0.05 * (1 - dist / p2.radius);
              p1.vx *= (1 - dragFactor * this.h);
              p1.vy *= (1 - dragFactor * this.h);
            }
          } else {
            switch (this.gravityMode) {
              case 'inverseSquare':
                // Reduced softening for more realistic scientific attraction
                // Only enough to prevent division by zero
                const softening = (p1.radius + p2.radius) * 0.05;
                force = (this.G * p2.mass) / (distSq + softening * softening);
                break;
              case 'exponential':
                force = this.G * p2.mass * Math.exp(-scaledDist);
                break;
              case 'arctanSquared':
                const arctanDist = Math.atan(scaledDist);
                force = (this.G * p2.mass) / (arctanDist * arctanDist);
                break;
              case 'sechSquared':
                force = this.G * p2.mass * Math.pow(this.sech(scaledDist), 2);
                break;
              case 'sech':
                force = this.G * p2.mass * this.sech(scaledDist);
                break;
            }

            // Radiation Pressure from stars
            const starTypes = ['matter', 'giant_star', 'supermassive_star', 'white_dwarf'];
            if (starTypes.includes(p2.type) && p2.mass > 1e5) {
              // Luminosity scaling: L ~ M^3.5 for small stars, L ~ M for very massive stars
              const relMass = p2.mass / 1e7;
              let luminosity;
              if (relMass < 10) {
                luminosity = Math.pow(relMass, 3.5) * 5e6;
              } else {
                // Linear scaling for very massive stars to prevent radiation pressure from dominating gravity
                luminosity = Math.pow(10, 3.5) * 5e6 * (relMass / 10);
              }
              
              const radForce = luminosity / (distSq + 100);
              
              // Affects particles based on surface area to mass ratio (R^2 / M)
              const radAccel = (radForce * p1.radius * p1.radius) / p1.mass;
              
              // Cap radiation pressure so it never exceeds gravity (keep it attractive)
              const gravAccel = (force * 1); // force is already (G * M) / distSq
              const finalRadAccel = Math.min(radAccel, gravAccel * 0.9);
              
              p1.ax -= (finalRadAccel * dx) / dist;
              p1.ay -= (finalRadAccel * dy) / dist;
            }

            // Atmospheric Drag for planets
            if (p2.type === 'planet' && dist < p2.radius * 1.5) {
              const altitude = dist - p2.radius;
              if (altitude > 0) {
                // Exponential decay of atmospheric density
                const dragFactor = 0.2 * Math.exp(-altitude / (p2.radius * 0.1));
                p1.vx *= (1 - dragFactor * this.h);
                p1.vy *= (1 - dragFactor * this.h);
              }
            }
          }

          // Magnetic Field Force (Simplified)
          if ((p2.type === 'pulsar' || p2.type === 'magnetar') && dist < p2.magnetosphereRadius!) {
            const magStrength = p2.type === 'magnetar' ? 10 : 2;
            const magForce = (magStrength * p2.mass) / (distSq + 100);
            
            // Lorentz-like effect: tangential acceleration
            const tx = -dy / dist;
            const ty = dx / dist;
            p1.ax += tx * magForce * 0.1;
            p1.ay += ty * magForce * 0.1;
          }

          // Interaction rules for types
          if (!p2.isBlackHole) {
            if (p1.type === 'dark' && p2.type === 'dark') {
              force *= this.darkMatterInteractionFactor;
            }
            // SCIENTIFIC CORRECTION: Antimatter has positive mass and is attracted by gravity.
            // Gravity is always attractive for mass/energy (Weak Equivalence Principle).
          }

          p1.ax += (force * dx) / dist;
          p1.ay += (force * dy) / dist;

          // Magnetic Field Force (Lorentz-like)
        }
      }
    }

    // Update velocities and positions
    const particlesToRemove = new Set<Particle>();
    const newParticles: Particle[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.lifetime <= 0) {
        particlesToRemove.add(p);
        continue;
      }

      p.vx += p.ax * this.h;
      p.vy += p.ay * this.h;
      p.x += p.vx * this.h;
      p.y += p.vy * this.h;
      p.age += this.h;

      if (this.showOrbits) {
        p.path.push({ x: p.x, y: p.y });
        if (p.path.length > p.pathLength) {
          p.path.shift();
        }
      }

      if (p.age > p.lifetime) {
        particlesToRemove.add(p);
      }

      if (p.collisionTimer > 0) {
        p.collisionTimer -= this.h;
        p.collisionEnergy *= 0.95;
      }
    }

    // Handle collisions
    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i];
      if (particlesToRemove.has(p1)) continue;

      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        if (particlesToRemove.has(p2)) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Collision threshold: physical contact
        if (dist < (p1.radius + p2.radius)) {
          // Dark matter doesn't collide with anything except itself (very weakly)
          if ((p1.type === 'dark' || p2.type === 'dark') && p1.type !== p2.type) {
            continue;
          }

          let newMass: number;
          let newType: ParticleType;
          let annihilation = false;

          const isP1Matter = p1.type === 'matter';
          const isP2Matter = p2.type === 'matter';
          const isP1Antimatter = p1.type === 'antimatter';
          const isP2Antimatter = p2.type === 'antimatter';

          // Matter vs Antimatter annihilation logic
          if ((isP1Matter && isP2Antimatter) || (isP1Antimatter && isP2Matter)) {
            annihilation = true;
            const matterPart = isP1Matter ? p1 : p2;
            const antiPart = isP1Antimatter ? p1 : p2;
            
            const diff = matterPart.mass - antiPart.mass;
            if (diff > 0) {
              newMass = diff;
              newType = 'matter';
            } else if (diff < 0) {
              newMass = Math.abs(diff);
              newType = 'antimatter';
            } else {
              newMass = 0;
              newType = 'matter'; // Mass is 0, will be removed
            }
          } else {
            // Standard collision: sum masses
            newMass = p1.mass + p2.mass;
            // Resulting type is the one with higher density
            newType = p1.density >= p2.density ? p1.type : p2.type;
          }

          if (newMass > 0) {
            // Conserve momentum
            const totalMassForMomentum = p1.mass + p2.mass;
            const newVx = (p1.vx * p1.mass + p2.vx * p2.mass) / totalMassForMomentum;
            const newVy = (p1.vy * p1.mass + p2.vy * p2.mass) / totalMassForMomentum;
            
            // Center of mass position
            const newX = (p1.x * p1.mass + p2.x * p2.mass) / totalMassForMomentum;
            const newY = (p1.y * p1.mass + p2.y * p2.mass) / totalMassForMomentum;

            // Use the density of the "winner" (higher density particle)
            const winner = p1.density >= p2.density ? p1 : p2;
            const newDensity = winner.density;
            
            // Blended color based on mass contribution
            const newColor: Color = {
              0: Math.round((p1.color[0] * p1.mass + p2.color[0] * p2.mass) / totalMassForMomentum),
              1: Math.round((p1.color[1] * p1.mass + p2.color[1] * p2.mass) / totalMassForMomentum),
              2: Math.round((p1.color[2] * p1.mass + p2.color[2] * p2.mass) / totalMassForMomentum)
            };

            const merged = new Particle(
              newMass,
              newX,
              newY,
              newVx,
              newVy,
              newType,
              `New Particle - ${Math.floor(100000 + Math.random() * 900000)}`,
              newDensity,
              newColor
            );
            
            merged.collisionEnergy = annihilation ? 1.0 : 0.5;
            merged.collisionTimer = annihilation ? 0.8 : 0.3;
            newParticles.push(merged);
          }

          particlesToRemove.add(p1);
          particlesToRemove.add(p2);
          break; // Stop checking for p1 as it is now removed
        }
      }
    }

    this.particles = this.particles.filter((p) => !particlesToRemove.has(p)).concat(newParticles);
  }

  runExperiment(id: string, cx: number, cy: number) {
    switch (id) {
      case 'cosmic_web': {
        // Large scale structure with dark matter filaments and galaxies
        for (let i = 0; i < 400; i++) {
          const x = cx + (Math.random() - 0.5) * 2000;
          const y = cy + (Math.random() - 0.5) * 2000;
          // Create filaments by biasing positions
          const bias = Math.sin(x * 0.005) * Math.cos(y * 0.005);
          if (Math.random() < Math.abs(bias) * 0.8) {
            this.addParticle(new Particle(2000, x, y, bias * 10, -bias * 10, 'dark', 'DM Filament'));
          }
        }
        for (let i = 0; i < 15; i++) {
          const x = cx + (Math.random() - 0.5) * 1500;
          const y = cy + (Math.random() - 0.5) * 1500;
          this.addParticle(new Particle(5e6, x, y, 0, 0, 'blackhole', 'Galaxy Node'));
          for (let j = 0; j < 20; j++) {
            const r = 20 + Math.random() * 50;
            const a = Math.random() * Math.PI * 2;
            const v = Math.sqrt((this.G * 5e6) / r);
            this.addParticle(new Particle(100, x + r * Math.cos(a), y + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter', 'Star'));
          }
        }
        break;
      }
      case 'supernova_nucleosynthesis': {
        // Dying star exploding and creating diverse heavy elements
        const coreM = 50000;
        this.addParticle(new Particle(coreM, cx, cy, 0, 0, 'pulsar', 'Neutron Star Core'));
        const types: ParticleType[] = ['matter', 'antimatter', 'dark', 'neutron', 'nebula', 'supernova', 'asteroid', 'comet'];
        for (let i = 0; i < 300; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 150 + Math.random() * 300;
          const r = 5 + Math.random() * 20;
          const type = types[Math.floor(Math.random() * types.length)];
          const p = new Particle(10, cx + r * Math.cos(a), cy + r * Math.sin(a), v * Math.cos(a), v * Math.sin(a), type, 'Ejecta');
          p.lifetime = 10 + Math.random() * 15;
          this.addParticle(p);
        }
        break;
      }
      case 'agn_feedback': {
        // Quasar interacting with nebula and triggering star formation
        const qm = 5e7;
        this.addParticle(new Particle(qm, cx, cy, 0, 0, 'quasar', 'Active Nucleus'));
        // Surrounding gas
        for (let i = 0; i < 400; i++) {
          const r = 100 + Math.random() * 600;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * qm) / r) * 0.5;
          this.addParticle(new Particle(50, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'nebula', 'Gas Cloud'));
        }
        // Triggered star formation in compressed regions
        for (let i = 0; i < 30; i++) {
          const r = 300 + Math.random() * 100;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(1e5, cx + r * Math.cos(a), cy + r * Math.sin(a), 0, 0, 'blue_giant', 'New Star'));
        }
        break;
      }
      case 'kilonova_event': {
        // Neutron star merger with heavy elements and GW emission
        const m = 40000;
        const dist = 40;
        const v = Math.sqrt((this.G * m) / (4 * dist));
        this.addParticle(new Particle(m, cx - dist, cy, 0, v, 'neutron', 'NS Alpha'));
        this.addParticle(new Particle(m, cx + dist, cy, 0, -v, 'magnetar', 'NS Beta'));
        // Debris disk
        for (let i = 0; i < 100; i++) {
          const r = 60 + Math.random() * 40;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(5, cx + r * Math.cos(a), cy + r * Math.sin(a), 0, 0, 'supernova', 'Heavy Element'));
        }
        break;
      }
      case 'primordial_galaxy': {
        // Gas collapse with dark matter halo
        const dm_mass = 1e7;
        this.addParticle(new Particle(dm_mass, cx, cy, 0, 0, 'dark', 'DM Halo Core'));
        for (let i = 0; i < 200; i++) {
          const r = 50 + Math.random() * 800;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * dm_mass) / r) * 0.7;
          this.addParticle(new Particle(1000, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'dark', 'DM Subhalo'));
        }
        for (let i = 0; i < 300; i++) {
          const r = Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(10, cx + r * Math.cos(a), cy + r * Math.sin(a), 0, 0, 'nebula', 'Primordial Gas'));
        }
        break;
      }
      case 'triple_instability': {
        // Complex 3-star system with planets being ejected
        const m1 = 2e6;
        const m2 = 1.5e6;
        const m3 = 1e6;
        this.addParticle(new Particle(m1, cx, cy, 0, 0, 'sun', 'Star A'));
        this.addParticle(new Particle(m2, cx + 300, cy, 0, 80, 'blue_giant', 'Star B'));
        this.addParticle(new Particle(m3, cx - 400, cy + 200, 50, -30, 'red_dwarf', 'Star C'));
        
        // Planets around Star A
        for (let i = 1; i <= 3; i++) {
          const r = i * 60;
          const v = Math.sqrt((this.G * m1) / r);
          this.addParticle(new Particle(10, cx + r, cy, 0, v, 'planet', `Planet ${i}`));
        }
        break;
      }
      case 'bh_accretion_jets': {
        // BH consuming star with relativistic jets
        const bhm = 1e7;
        this.addParticle(new Particle(bhm, cx, cy, 0, 0, 'blackhole', 'SMBH'));
        const starM = 1e6;
        const starX = cx + 250;
        const starV = Math.sqrt((this.G * bhm) / 250);
        this.addParticle(new Particle(starM, starX, cy, 0, starV, 'giant_star', 'Victim Star'));
        
        // Accretion flow
        for (let i = 0; i < 100; i++) {
          const r = 30 + Math.random() * 100;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(5, cx + r * Math.cos(a), cy + r * Math.sin(a), 0, 0, 'nebula', 'Accretion Flow'));
        }
        break;
      }
      case 'dm_halo_merger': {
        // Two dark matter halos colliding
        const createHalo = (x: number, y: number, vx: number, vy: number) => {
          this.addParticle(new Particle(5e6, x, y, vx, vy, 'dark', 'Halo Core'));
          for (let i = 0; i < 100; i++) {
            const r = Math.random() * 300;
            const a = Math.random() * Math.PI * 2;
            this.addParticle(new Particle(1000, x + r * Math.cos(a), y + r * Math.sin(a), vx, vy, 'dark', 'DM Particle'));
          }
          // Visible matter
          for (let i = 0; i < 20; i++) {
            const r = Math.random() * 100;
            const a = Math.random() * Math.PI * 2;
            this.addParticle(new Particle(100, x + r * Math.cos(a), y + r * Math.sin(a), vx, vy, 'matter', 'Star'));
          }
        };
        createHalo(cx - 400, cy, 40, 0);
        createHalo(cx + 400, cy, -40, 0);
        break;
      }
      case 'cluster_evaporation': {
        // Dense cluster with ejections
        const centralM = 1e6;
        this.addParticle(new Particle(centralM, cx, cy, 0, 0, 'blackhole', 'Cluster Core'));
        for (let i = 0; i < 200; i++) {
          const r = 20 + Math.random() * 300;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * centralM) / r) * (0.8 + Math.random() * 0.4);
          const type: ParticleType = Math.random() > 0.9 ? 'neutron' : 'matter';
          this.addParticle(new Particle(100, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), type, 'Cluster Star'));
        }
        break;
      }
      case 'wormhole_bridge': {
        // Wormhole between two distant star systems
        const system1X = cx - 600;
        const system2X = cx + 600;
        
        // System 1
        this.addParticle(new Particle(5e6, system1X, cy, 0, 0, 'sun', 'Star 1'));
        this.addParticle(new Particle(1000, system1X + 100, cy, 0, 0, 'wormhole', 'Entrance'));
        
        // System 2
        this.addParticle(new Particle(8e6, system2X, cy, 0, 0, 'blue_giant', 'Star 2'));
        this.addParticle(new Particle(1000, system2X - 100, cy, 0, 0, 'wormhole', 'Exit'));
        
        // Probe
        this.addParticle(new Particle(10, system1X - 200, cy, 150, 0, 'matter', 'Interstellar Probe'));
        break;
      }
      case 'dark_matter_subhalo_interaction': {
        // Visible galaxy interacting with a dark matter subhalo
        const m_gal = 5000000;
        this.addParticle(new Particle(m_gal, cx, cy, 0, 0, 'blackhole', 'Galaxy Core'));
        
        for (let i = 0; i < 100; i++) {
          const r = 100 + Math.random() * 200;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m_gal) / r);
          this.addParticle(new Particle(10, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter'));
        }
        
        // Dark matter subhalo
        const subM = 1000000;
        const subX = cx + 400;
        const subY = cy + 400;
        const subV = Math.sqrt((this.G * m_gal) / 565); // Approx orbital v
        this.addParticle(new Particle(subM, subX, subY, -subV * 0.7, subV * 0.7, 'dark', 'DM Subhalo'));
        break;
      }
      case 'primordial_black_holes': {
        // Field of small black holes
        for (let i = 0; i < 50; i++) {
          const x = cx + (Math.random() - 0.5) * 1000;
          const y = cy + (Math.random() - 0.5) * 1000;
          const vx = (Math.random() - 0.5) * 50;
          const vy = (Math.random() - 0.5) * 50;
          this.addParticle(new Particle(5000, x, y, vx, vy, 'blackhole', 'PBH'));
        }
        break;
      }
      case 'binary_white_dwarf_collision': {
        // Type Ia supernova progenitor setup
        const m1 = 100000;
        const m2 = 90000;
        const dist = 30;
        const v = Math.sqrt((this.G * (m1 + m2)) / dist);
        
        this.addParticle(new Particle(m1, cx - 15, cy, 0, v * 0.5, 'white_dwarf', 'WD 1'));
        this.addParticle(new Particle(m2, cx + 15, cy, 0, -v * 0.5, 'white_dwarf', 'WD 2'));
        break;
      }
      case 'galaxy_merger': {
        // Collision of two galactic disks
        const createGalaxy = (x: number, y: number, vx: number, vy: number, mass: number, color: Color, count: number) => {
          this.addParticle(new Particle(mass, x, y, vx, vy, 'blackhole', 'SMBH'));
          for (let i = 0; i < count; i++) {
            const r = 40 + Math.random() * 120;
            const a = Math.random() * Math.PI * 2;
            const orbV = Math.sqrt((this.G * mass) / r);
            this.addParticle(new Particle(5, x + r * Math.cos(a), y + r * Math.sin(a), vx - orbV * Math.sin(a), vy + orbV * Math.cos(a), 'matter', 'Star', 1, color));
          }
        };
        
        createGalaxy(cx - 250, cy - 100, 40, 20, 1500000, {0: 100, 1: 150, 2: 255}, 80);
        createGalaxy(cx + 250, cy + 100, -40, -20, 1200000, {0: 255, 1: 150, 2: 100}, 80);
        break;
      }
      case 'kozai_lidov': {
        // Kozai-Lidov mechanism: High inclination perturber
        const m_star = 2000000;
        const m_planet = 10;
        const m_perturber = 500000;
        
        this.addParticle(new Particle(m_star, cx, cy, 0, 0, 'sun', 'Central Star'));
        
        // Inner planet
        const r_p = 100;
        const v_p = Math.sqrt((this.G * m_star) / r_p);
        this.addParticle(new Particle(m_planet, cx + r_p, cy, 0, v_p, 'planet', 'Inner Planet'));
        
        // Distant massive perturber on an inclined/offset orbit
        const r_ext = 450;
        const v_ext = Math.sqrt((this.G * (m_star + m_perturber)) / r_ext);
        this.addParticle(new Particle(m_perturber, cx, cy + r_ext, -v_ext, 0, 'neutron_star', 'Perturber'));
        break;
      }
      case 'globular_cluster': {
        // Dense stellar cluster with central IMBH
        const centralM = 500000;
        this.addParticle(new Particle(centralM, cx, cy, 0, 0, 'blackhole', 'IMBH'));
        
        for (let i = 0; i < 150; i++) {
          const r = 50 + Math.pow(Math.random(), 0.5) * 250;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * centralM) / r) * (0.9 + Math.random() * 0.2);
          const type: ParticleType = Math.random() > 0.8 ? 'white_dwarf' : 'matter';
          this.addParticle(new Particle(100, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), type));
        }
        break;
      }
      case 'tidal_disruption': {
        // Tidal Disruption Event (TDE): Star being shredded by SMBH
        const bhMass = 10000000;
        this.addParticle(new Particle(bhMass, cx, cy, 0, 0, 'blackhole', 'SMBH'));
        
        // Create a "star" made of multiple bound particles to see it shred
        const starX = cx - 500;
        const starY = cy + 40;
        const starVx = 180;
        const starVy = 0;
        
        for (let i = 0; i < 40; i++) {
          const rx = (Math.random() - 0.5) * 10;
          const ry = (Math.random() - 0.5) * 10;
          this.addParticle(new Particle(50, starX + rx, starY + ry, starVx, starVy, 'matter', 'Stellar Fragment'));
        }
        break;
      }
      case 'lagrange': {
        // L4 and L5 stability in the restricted three-body problem
        const m1 = 5000000;
        const m2 = 150000;
        const r = 300;
        const totalM = m1 + m2;
        const r1 = (m2 / totalM) * r;
        const r2 = (m1 / totalM) * r;
        const v = Math.sqrt((this.G * totalM) / r);
        const v1 = (m2 / totalM) * v;
        const v2 = (m1 / totalM) * v;
        
        this.addParticle(new Particle(m1, cx - r1, cy, 0, v1, 'sun', 'Primary'));
        this.addParticle(new Particle(m2, cx + r2, cy, 0, -v2, 'planet', 'Secondary'));
        
        const baryX = cx;
        const baryY = cy;
        
        const placeTrojan = (angle: number, name: string) => {
          const tx = baryX + r2 * Math.cos(angle);
          const ty = baryY + r2 * Math.sin(angle);
          const tv = v2; 
          this.addParticle(new Particle(1, tx, ty, -tv * Math.sin(angle), tv * Math.cos(angle), 'matter', name));
        };
        
        placeTrojan(Math.PI / 3, 'L4 Trojan');
        placeTrojan(-Math.PI / 3, 'L5 Trojan');
        break;
      }
      case 'klemperer': {
        // Klemperer Rosette: A complex balanced configuration
        const n = 8;
        const m = 50000;
        const r = 200;
        const v = Math.sqrt((this.G * m * 2.5) / r); 
        for (let i = 0; i < n; i++) {
          const angle = (i / n) * Math.PI * 2;
          this.addParticle(new Particle(m, cx + r * Math.cos(angle), cy + r * Math.sin(angle), -v * Math.sin(angle), v * Math.cos(angle), 'neutron_star'));
          
          const midAngle = ((i + 0.5) / n) * Math.PI * 2;
          const midR = r * 1.2;
          const midV = Math.sqrt((this.G * m * 3) / midR);
          this.addParticle(new Particle(100, cx + midR * Math.cos(midAngle), cy + midR * Math.sin(midAngle), -midV * Math.sin(midAngle), midV * Math.cos(midAngle), 'planet'));
        }
        break;
      }
      case 'supernova_remnant': {
        // Post-supernova expansion
        const coreM = 40000;
        this.addParticle(new Particle(coreM, cx, cy, 0, 0, 'pulsar', 'Neutron Star Core'));
        
        for (let i = 0; i < 200; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 100 + Math.random() * 200;
          const r = 10 + Math.random() * 30;
          const p = new Particle(5, cx + r * Math.cos(a), cy + r * Math.sin(a), v * Math.cos(a), v * Math.sin(a), 'nebula', 'Ejecta');
          p.lifetime = 5 + Math.random() * 10;
          this.addParticle(p);
        }
        break;
      }
      case 'asteroid_belt_resonance': {
        // Kirkwood Gaps / Resonance simulation
        const sunM = 10000000;
        const jupM = 1000000;
        this.addParticle(new Particle(sunM, cx, cy, 0, 0, 'sun', 'Sun'));
        
        const jupR = 500;
        const jupV = Math.sqrt((this.G * sunM) / jupR);
        this.addParticle(new Particle(jupM, cx + jupR, cy, 0, jupV, 'planet', 'Jupiter'));
        
        for (let i = 0; i < 300; i++) {
          const r = 150 + Math.random() * 300;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * sunM) / r);
          this.addParticle(new Particle(1, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'asteroid'));
        }
        break;
      }
      case 'pulsar_binary': {
        // Relativistic pulsar binary with extreme magnetic interactions
        const m = 50000;
        const dist = 80;
        const v = Math.sqrt((this.G * m) / (4 * dist));
        const p1 = new Particle(m, cx - dist, cy, 0, v, 'pulsar', 'PSR J0737-3039A');
        const p2 = new Particle(m, cx + dist, cy, 0, -v, 'pulsar', 'PSR J0737-3039B');
        this.addParticle(p1);
        this.addParticle(p2);
        break;
      }
      case 'quasar_accretion': {
        // Quasar with relativistic jet and massive accretion disk
        const qm = 20000000;
        this.addParticle(new Particle(qm, cx, cy, 0, 0, 'quasar', 'Quasar Core'));
        
        for (let i = 0; i < 150; i++) {
          const r = 60 + Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * qm) / r);
          this.addParticle(new Particle(20, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter', 'Accretion Disk'));
        }
        break;
      }
      case 'dark_halo': {
        // Galaxy core embedded in a dark matter halo
        const m = 5000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'blackhole', 'Galaxy Core'));
        
        for (let i = 0; i < 60; i++) {
          const r = 100 + Math.random() * 200;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m) / r) * 1.2; 
          this.addParticle(new Particle(100, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter', 'Star'));
        }
        
        for (let i = 0; i < 100; i++) {
          const r = 50 + Math.random() * 500;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m) / r) * 0.8;
          this.addParticle(new Particle(1000, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'dark', 'Dark Matter'));
        }
        break;
      }
      case 'planetary_nebula_formation': {
        // Binary system where one star sheds mass
        const m1 = 1500000;
        const m2 = 800000;
        const dist = 150;
        const v = Math.sqrt((this.G * (m1+m2)) / dist);
        
        this.addParticle(new Particle(m1, cx - 50, cy, 0, v * 0.3, 'sun', 'Dying Star'));
        this.addParticle(new Particle(m2, cx + 100, cy, 0, -v * 0.7, 'white_dwarf', 'Companion'));
        
        for (let i = 0; i < 100; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 20 + Math.random() * 20;
          const ev = 30 + Math.random() * 20;
          const p = new Particle(10, cx - 50 + r * Math.cos(a), cy + r * Math.sin(a), ev * Math.cos(a), ev * Math.sin(a), 'nebula', 'Gas Shell');
          p.lifetime = 15;
          this.addParticle(p);
        }
        break;
      }
      case 'antimatter_collision': {
        for (let i = 0; i < 50; i++) {
          this.addParticle(new Particle(100, cx - 200 + Math.random() * 100, cy - 50 + Math.random() * 100, 50, 0, 'matter'));
          this.addParticle(new Particle(100, cx + 200 - Math.random() * 100, cy - 50 + Math.random() * 100, -50, 0, 'antimatter'));
        }
        break;
      }
      case 'neutron_merger': {
        const m = 30000;
        const dist = 50;
        const v = Math.sqrt((this.G * m) / (4 * dist));
        this.addParticle(new Particle(m, cx - dist, cy, 0, v, 'neutron', 'NS 1'));
        this.addParticle(new Particle(m, cx + dist, cy, 0, -v, 'magnetar', 'Magnetar'));
        break;
      }
      case 'wormhole_transit': {
        this.addParticle(new Particle(1000, cx - 200, cy, 0, 0, 'wormhole', 'Entry'));
        this.addParticle(new Particle(1000, cx + 200, cy, 0, 0, 'wormhole', 'Exit'));
        this.addParticle(new Particle(10, cx - 350, cy, 100, 0, 'matter', 'Probe'));
        break;
      }
      case 'protoplanetary': {
        const sm = 1000000;
        this.addParticle(new Particle(sm, cx, cy, 0, 0, 'matter', 'Protostar'));
        for (let i = 0; i < 150; i++) {
          const r = 100 + Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * sm) / r) * (0.9 + Math.random() * 0.2);
          this.addParticle(new Particle(1, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter'));
        }
        break;
      }
      case 'slingshot': {
        const pm = 500000;
        this.addParticle(new Particle(pm, cx, cy, 0, 0, 'planet', 'Jupiter'));
        this.addParticle(new Particle(1, cx - 400, cy - 200, 120, 40, 'matter', 'Voyager'));
        break;
      }
      case 'roche_lobe': {
        const m1 = 200000;
        const m2 = 100000;
        const dist = 120;
        const v = Math.sqrt((this.G * (m1 + m2)) / dist);
        this.addParticle(new Particle(m1, cx - 40, cy, 0, v * 0.3, 'giant_star', 'Giant'));
        this.addParticle(new Particle(m2, cx + 80, cy, 0, -v * 0.7, 'white_dwarf', 'WD'));
        break;
      }
      case 'einstein_ring': {
        const m = 2000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'blackhole', 'Lens'));
        this.addParticle(new Particle(1000, cx, cy - 800, 0, 0, 'matter', 'Source'));
        break;
      }
      case 'frame_dragging': {
        const m = 10000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'blackhole', 'Kerr BH'));
        for (let i = 0; i < 30; i++) {
          const r = 50 + i * 5;
          const v = Math.sqrt((this.G * m) / r) * 1.2;
          this.addParticle(new Particle(1, cx + r, cy, 0, v, 'matter'));
        }
        break;
      }
      case 'oort_cloud': {
        const m = 1e7;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'matter', 'Sun'));
        for (let i = 0; i < 100; i++) {
          const r = 800 + Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m) / r) * (0.8 + Math.random() * 0.4);
          this.addParticle(new Particle(0.1, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter'));
        }
        break;
      }
      case 'trojans': {
        const m1 = 1e7;
        const m2 = 100000;
        const r = 300;
        const v2 = Math.sqrt((this.G * m1) / r);
        this.addParticle(new Particle(m1, cx, cy, 0, 0, 'matter', 'Sun'));
        this.addParticle(new Particle(m2, cx + r, cy, 0, v2, 'planet', 'Jupiter'));
        for (let i = 0; i < 20; i++) {
          const da = (Math.random() - 0.5) * 0.2;
          const dr = (Math.random() - 0.5) * 20;
          const a = Math.PI / 3 + da;
          const tr = r + dr;
          const tv = Math.sqrt((this.G * m1) / tr);
          this.addParticle(new Particle(0.1, cx + tr * Math.cos(a), cy + tr * Math.sin(a), -tv * Math.sin(a), tv * Math.cos(a), 'matter'));
        }
        break;
      }
      case 'disk_gap': {
        const m = 2000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'matter', 'Star'));
        this.addParticle(new Particle(5000, cx + 250, cy, 0, Math.sqrt((this.G * m) / 250), 'planet', 'Gap Clearer'));
        for (let i = 0; i < 200; i++) {
          const r = 100 + Math.random() * 400;
          if (Math.abs(r - 250) < 30) continue;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m) / r);
          this.addParticle(new Particle(1, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter'));
        }
        break;
      }
      case 'supernova_remnant': {
        this.addParticle(new Particle(50000, cx, cy, 0, 0, 'pulsar', 'Pulsar Core'));
        for (let i = 0; i < 100; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = 100 + Math.random() * 50;
          this.addParticle(new Particle(100, cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, Math.cos(a) * v, Math.sin(a) * v, 'supernova'));
        }
        break;
      }
      case 'wormhole_network': {
        this.addParticle(new Particle(1000, cx - 200, cy - 200, 0, 0, 'wormhole', 'A'));
        this.addParticle(new Particle(1000, cx + 200, cy - 200, 0, 0, 'wormhole', 'B'));
        this.addParticle(new Particle(1000, cx + 200, cy + 200, 0, 0, 'wormhole', 'C'));
        this.addParticle(new Particle(1000, cx - 200, cy + 200, 0, 0, 'wormhole', 'D'));
        this.addParticle(new Particle(10, cx, cy, 50, 50, 'matter', 'Traveler'));
        break;
      }
      case 'dark_filament': {
        for (let i = 0; i < 20; i++) {
          this.addParticle(new Particle(5000, cx - 500 + i * 50, cy, 0, 0, 'dark'));
        }
        for (let i = 0; i < 100; i++) {
          this.addParticle(new Particle(10, cx + (Math.random() - 0.5) * 1000, cy + (Math.random() - 0.5) * 200, 0, 0, 'matter'));
        }
        break;
      }
      case 'binary_quasar': {
        const m = 5000000;
        this.addParticle(new Particle(m, cx - 200, cy, 0, 40, 'quasar', 'Q1'));
        this.addParticle(new Particle(m, cx + 200, cy, 0, -40, 'quasar', 'Q2'));
        break;
      }
      case 'planetary_migration': {
        const m = 2000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'matter', 'Star'));
        this.addParticle(new Particle(10000, cx + 400, cy, 0, Math.sqrt((this.G * m) / 400) * 0.8, 'planet', 'Migrator'));
        for (let i = 0; i < 100; i++) {
          const r = 100 + Math.random() * 500;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m) / r);
          this.addParticle(new Particle(1, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter'));
        }
        break;
      }
      case 'inner_solar': {
        const m = 1e7;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'matter', 'Sun'));
        const p = [
          { n: 'Mercury', d: 60, m: 1000, c: {0:150,1:150,2:150} },
          { n: 'Venus', d: 100, m: 15000, c: {0:200,1:180,2:100} },
          { n: 'Earth', d: 150, m: 18000, c: {0:50,1:100,2:255} },
          { n: 'Mars', d: 210, m: 2000, c: {0:255,1:100,2:50} }
        ];
        p.forEach(plan => {
          const v = Math.sqrt((this.G * m) / plan.d);
          this.addParticle(new Particle(plan.m, cx + plan.d, cy, 0, v, 'planet', plan.n, 1, plan.c as any));
        });
        break;
      }
      case 'chaos_three_body': {
        const m = 1000000;
        const dist = 200;
        this.addParticle(new Particle(m, cx, cy - dist, 50, 0, 'matter', 'Body A'));
        this.addParticle(new Particle(m, cx - dist * 0.866, cy + dist * 0.5, -25, -43, 'matter', 'Body B'));
        this.addParticle(new Particle(m, cx + dist * 0.866, cy + dist * 0.5, -25, 43, 'matter', 'Body C'));
        break;
      }
      case 'galactic_cannibalism': {
        const m1 = 5000000;
        const m2 = 500000;
        this.addParticle(new Particle(m1, cx - 300, cy, 0, 10, 'blackhole', 'Large Core'));
        this.addParticle(new Particle(m2, cx + 300, cy, 0, -30, 'blackhole', 'Small Core'));
        for (let i = 0; i < 100; i++) {
          const r = 50 + Math.random() * 150;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m1) / r);
          this.addParticle(new Particle(10, cx - 300 + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a) + 10, 'matter'));
        }
        for (let i = 0; i < 30; i++) {
          const r = 30 + Math.random() * 60;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m2) / r);
          this.addParticle(new Particle(5, cx + 300 + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a) - 30, 'antimatter'));
        }
        break;
      }
      case 'bh_vs_magnetar': {
        const m1 = 2000000;
        const m2 = 500000;
        const dist = 150;
        const v = Math.sqrt((this.G * (m1 + m2)) / dist);
        this.addParticle(new Particle(m1, cx - 50, cy, 0, v * 0.3, 'blackhole', 'BH'));
        this.addParticle(new Particle(m2, cx + 100, cy, 0, -v * 0.7, 'magnetar', 'Magnetar'));
        break;
      }
      case 'dark_matter_web': {
        for (let i = 0; i < 5; i++) {
          const nx = cx + (Math.random() - 0.5) * 1000;
          const ny = cy + (Math.random() - 0.5) * 1000;
          this.addParticle(new Particle(1000000, nx, ny, 0, 0, 'dark', 'DM Node'));
          for (let j = 0; j < 20; j++) {
            this.addParticle(new Particle(100, nx + (Math.random() - 0.5) * 200, ny + (Math.random() - 0.5) * 200, 0, 0, 'matter'));
          }
        }
        break;
      }
      case 'rogue_planet': {
        const m = 2000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'matter', 'Sun'));
        for (let i = 1; i <= 5; i++) {
          const r = i * 100;
          const v = Math.sqrt((this.G * m) / r);
          this.addParticle(new Particle(100, cx + r, cy, 0, v, 'planet', `Planet ${i}`));
        }
        this.addParticle(new Particle(50000, cx - 800, cy + 100, 150, -20, 'planet', 'ROGUE'));
        break;
      }
      case 'binary_star_planetary': {
        const m = 500000;
        const dist = 60;
        const v = Math.sqrt((this.G * m) / (4 * dist));
        this.addParticle(new Particle(m, cx - dist, cy, 0, v, 'matter', 'Star A'));
        this.addParticle(new Particle(m, cx + dist, cy, 0, -v, 'matter', 'Star B'));
        const pr = 400;
        const pv = Math.sqrt((this.G * 2 * m) / pr);
        this.addParticle(new Particle(100, cx + pr, cy, 0, pv, 'planet', 'Tatooine'));
        break;
      }
      case 'quasar_vs_quasar': {
        const m = 10000000;
        this.addParticle(new Particle(m, cx - 400, cy, 0, 20, 'quasar', 'Q1'));
        this.addParticle(new Particle(m, cx + 400, cy, 0, -20, 'quasar', 'Q2'));
        break;
      }
      case 'supernova_chain': {
        for (let i = 0; i < 10; i++) {
          const x = cx + (Math.random() - 0.5) * 600;
          const y = cy + (Math.random() - 0.5) * 600;
          const p = new Particle(100000, x, y, 0, 0, 'supermassive_star');
          p.lifetime = 100 + Math.random() * 500;
          this.addParticle(p);
        }
        break;
      }
      case 'neutron_accretion': {
        const m1 = 500000;
        const m2 = 100000;
        const dist = 150;
        const v = Math.sqrt((this.G * (m1 + m2)) / dist);
        this.addParticle(new Particle(m1, cx - 50, cy, 0, v * 0.2, 'giant_star', 'Donor Giant'));
        this.addParticle(new Particle(m2, cx + 100, cy, 0, -v * 0.8, 'neutron', 'Accretor NS'));
        for (let i = 0; i < 50; i++) {
          this.addParticle(new Particle(1, cx - 20, cy + (Math.random() - 0.5) * 20, 20, 0, 'matter'));
        }
        break;
      }
      case 'comet_swarm': {
        const m = 2000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'matter', 'Sun'));
        for (let i = 0; i < 100; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 600 + Math.random() * 400;
          const v = Math.sqrt((this.G * m) / r) * (0.5 + Math.random() * 0.5);
          this.addParticle(new Particle(0.01, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a) * 1.5, v * Math.cos(a) * 0.5, 'comet'));
        }
        break;
      }
      case 'triple_bh_chaos': {
        const m = 1000000;
        this.addParticle(new Particle(m, cx - 150, cy, 0, 40, 'blackhole', 'BH A'));
        this.addParticle(new Particle(m, cx + 150, cy, 0, -40, 'blackhole', 'BH B'));
        this.addParticle(new Particle(m, cx, cy + 200, 40, 0, 'blackhole', 'BH C'));
        break;
      }
      case 'dark_matter_bullet': {
        // Cluster 1
        this.addParticle(new Particle(2000000, cx - 400, cy, 60, 0, 'dark', 'DM 1'));
        for (let i = 0; i < 50; i++) {
          this.addParticle(new Particle(100, cx - 400 + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 100, 60, 0, 'matter'));
        }
        // Cluster 2
        this.addParticle(new Particle(2000000, cx + 400, cy, -60, 0, 'dark', 'DM 2'));
        for (let i = 0; i < 50; i++) {
          this.addParticle(new Particle(100, cx + 400 + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 100, -60, 0, 'matter'));
        }
        break;
      }
      case 'planetary_billiards': {
        const m = 2000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'matter', 'Sun'));
        for (let i = 0; i < 8; i++) {
          const r = 100 + i * 40;
          const v = Math.sqrt((this.G * m) / r) * (0.95 + Math.random() * 0.1);
          this.addParticle(new Particle(500, cx + r, cy, 0, v, 'planet'));
        }
        break;
      }
      case 'star_vs_bh_cluster': {
        const bhm = 5000000;
        this.addParticle(new Particle(bhm, cx, cy, 0, 0, 'blackhole', 'The Void'));
        for (let i = 0; i < 100; i++) {
          const r = 200 + Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * bhm) / r);
          const type = Math.random() > 0.8 ? 'giant_star' : 'matter';
          this.addParticle(new Particle(1000, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), type));
        }
        break;
      }
      case 'antimatter_nebula': {
        this.addParticle(new Particle(2000000, cx, cy, 0, 0, 'matter', 'Matter Star'));
        for (let i = 0; i < 200; i++) {
          const r = 100 + Math.random() * 300;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(1, cx + r * Math.cos(a), cy + r * Math.sin(a), 0, 0, 'antimatter'));
        }
        break;
      }
      case 'binary_white_dwarf': {
        const m = 1000000;
        const dist = 40;
        const v = Math.sqrt((this.G * m) / (4 * dist));
        this.addParticle(new Particle(m, cx - dist, cy, 0, v, 'white_dwarf', 'WD 1'));
        this.addParticle(new Particle(m, cx + dist, cy, 0, -v, 'white_dwarf', 'WD 2'));
        break;
      }
      case 'magnetar_flare': {
        this.addParticle(new Particle(500000, cx, cy, 0, 0, 'magnetar', 'SGR'));
        for (let i = 0; i < 50; i++) {
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(1, cx, cy, Math.cos(a) * 200, Math.sin(a) * 200, 'matter'));
        }
        break;
      }
      case 'galactic_jet_impact': {
        const qm = 10000000;
        this.addParticle(new Particle(qm, cx - 600, cy, 0, 0, 'quasar', 'Quasar'));
        const gm = 1000000;
        this.addParticle(new Particle(gm, cx + 200, cy, 0, 0, 'blackhole', 'Target Galaxy'));
        for (let i = 0; i < 50; i++) {
          const r = 50 + Math.random() * 100;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * gm) / r);
          this.addParticle(new Particle(100, cx + 200 + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter'));
        }
        break;
      }
      case 'stellar_collision': {
        this.addParticle(new Particle(1000000, cx - 200, cy, 40, 0, 'supermassive_star', 'Star 1'));
        this.addParticle(new Particle(1000000, cx + 200, cy, -40, 0, 'supermassive_star', 'Star 2'));
        break;
      }
      case 'versus_all': {
        const types: ParticleType[] = [
          'blackhole', 'quasar', 'magnetar', 'pulsar', 'neutron', 
          'white_dwarf', 'supermassive_star', 'giant_star', 'wormhole',
          'matter', 'antimatter', 'dark', 'nebula', 'supernova', 'planet', 'comet'
        ];
        types.forEach((t, i) => {
          const a = (i / types.length) * Math.PI * 2;
          const r = 400;
          const mass = t === 'blackhole' || t === 'quasar' ? 1000000 : 500000;
          this.addParticle(new Particle(mass, cx + r * Math.cos(a), cy + r * Math.sin(a), -Math.sin(a) * 60, Math.cos(a) * 60, t, t.toUpperCase()));
        });
        break;
      }
      case 'dark_matter_capture': {
        const m = 5000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'blackhole', 'Attractor'));
        for (let i = 0; i < 200; i++) {
          const x = cx + (Math.random() - 0.5) * 2000;
          const y = cy + (Math.random() - 0.5) * 2000;
          this.addParticle(new Particle(10, x, y, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 'dark'));
        }
        break;
      }
      case 'binary_system_chaos': {
        const starSpecs: {type: ParticleType, mass: number, name: string, color: Color}[] = [
          { type: 'matter', mass: 1e7, name: 'Yellow Dwarf', color: {0:255,1:215,2:0} },
          { type: 'red_dwarf', mass: 2e6, name: 'Red Dwarf', color: {0:255,1:69,2:0} },
          { type: 'blue_giant', mass: 8e7, name: 'Blue Giant', color: {0:0,1:191,2:255} },
          { type: 'giant_star', mass: 3e7, name: 'Red Giant', color: {0:255,1:99,2:71} },
          { type: 'white_dwarf', mass: 9e6, name: 'White Dwarf', color: {0:240,1:248,2:255} },
          { type: 'neutron', mass: 1.2e7, name: 'Neutron Star', color: {0:173,1:216,2:230} },
          { type: 'blackhole', mass: 2e7, name: 'Black Hole', color: {0:20,1:20,2:20} },
          { type: 'supermassive_star', mass: 2e8, name: 'Hypergiant', color: {0:150,1:200,2:255} },
          { type: 'pulsar', mass: 1.4e7, name: 'Pulsar', color: {0:200,1:230,2:255} },
          { type: 'magnetar', mass: 1.5e7, name: 'Magnetar', color: {0:255,1:100,2:255} },
          { type: 'quasar', mass: 5e7, name: 'Quasar', color: {0:255,1:255,2:200} }
        ];

        const s1 = starSpecs[Math.floor(Math.random() * starSpecs.length)];
        const s2 = starSpecs[Math.floor(Math.random() * starSpecs.length)];
        
        const m1 = s1.mass * (0.8 + Math.random() * 0.4);
        const m2 = s2.mass * (0.8 + Math.random() * 0.4);
        
        // Distance scales with the square root of total mass
        const baseDist = 160;
        const totalMassFactor = Math.sqrt((m1 + m2) / 2e7);
        const dist = baseDist * totalMassFactor * (0.7 + Math.random() * 0.6);
        
        // Center of mass calculation
        const r1 = (dist * m2) / (m1 + m2);
        const r2 = (dist * m1) / (m1 + m2);
        
        // Orbital velocity for circular orbit around center of mass
        // v = sqrt(G * M_total * r_self / d^2)
        // Adding a slight eccentricity (0.95 to 1.05 of circular velocity)
        const ecc = 0.95 + Math.random() * 0.1;
        const v1 = ecc * Math.sqrt((this.G * m2 * r1)) / dist;
        const v2 = ecc * Math.sqrt((this.G * m1 * r2)) / dist;
        
        this.addParticle(new Particle(m1, cx - r1, cy, 0, v1, s1.type, `${s1.name} A`, 1, s1.color));
        this.addParticle(new Particle(m2, cx + r2, cy, 0, -v2, s2.type, `${s2.name} B`, 1, s2.color));
        
        // Add circumbinary debris/planets with mixed orbital directions
        const mTotal = m1 + m2;
        const numObjects = 15 + Math.floor(Math.random() * 20);
        for (let i = 0; i < numObjects; i++) {
          const pr = dist * (2.5 + Math.random() * 6); 
          const pa = Math.random() * Math.PI * 2;
          const pv = Math.sqrt((this.G * mTotal) / pr) * (0.95 + Math.random() * 0.1);
          
          const pType: ParticleType = Math.random() > 0.4 ? 'planet' : (Math.random() > 0.5 ? 'asteroid' : 'comet');
          const pMass = pType === 'planet' ? 100 + Math.random() * 1500 : 1 + Math.random() * 30;
          
          // Randomly choose orbital direction (Prograde vs Retrograde)
          const isRetrograde = Math.random() > 0.7; // 30% chance for retrograde
          const dir = isRetrograde ? -1 : 1;
          const namePrefix = isRetrograde ? 'Retro ' : '';
          
          this.addParticle(new Particle(
            pMass, 
            cx + pr * Math.cos(pa), 
            cy + pr * Math.sin(pa), 
            -dir * pv * Math.sin(pa), 
            dir * pv * Math.cos(pa), 
            pType,
            `${namePrefix}${pType.charAt(0).toUpperCase() + pType.slice(1)}`
          ));
        }
        break;
      }
      case 'nebula_collapse': {
        for (let i = 0; i < 300; i++) {
          const r = Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(100, cx + r * Math.cos(a), cy + r * Math.sin(a), (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 'nebula'));
        }
        break;
      }
      case 'antimatter_bullet': {
        const m = 10000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'blackhole', 'Target'));
        for (let i = 0; i < 100; i++) {
          this.addParticle(new Particle(100, cx - 800 + Math.random() * 100, cy + (Math.random() - 0.5) * 50, 200, 0, 'antimatter'));
        }
        break;
      }
      case 'triple_quasar_dance': {
        const m = 5000000;
        const r = 300;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          this.addParticle(new Particle(m, cx + r * Math.cos(a), cy + r * Math.sin(a), -Math.sin(a) * 60, Math.cos(a) * 60, 'quasar'));
        }
        break;
      }
      case 'planet_shredder': {
        const m = 10000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'blackhole', 'Shredder'));
        this.addParticle(new Particle(10000, cx - 300, cy, 0, 180, 'planet', 'Victim'));
        break;
      }
      case 'gravity_well_arena': {
        this.addParticle(new Particle(2000000, cx - 300, cy - 300, 0, 0, 'blackhole'));
        this.addParticle(new Particle(2000000, cx + 300, cy - 300, 0, 0, 'blackhole'));
        this.addParticle(new Particle(2000000, cx + 300, cy + 300, 0, 0, 'blackhole'));
        this.addParticle(new Particle(2000000, cx - 300, cy + 300, 0, 0, 'blackhole'));
        for (let i = 0; i < 50; i++) {
          this.addParticle(new Particle(100, cx + (Math.random() - 0.5) * 200, cy + (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, 'matter'));
        }
        break;
      }
      case 'kerr_bh_accretion': {
        const m = 10000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'blackhole', 'Kerr BH'));
        for (let j = 0; j < 3; j++) {
          const baseR = 100 + j * 100;
          const angleOffset = (j * Math.PI) / 4;
          for (let i = 0; i < 40; i++) {
            const a = (i / 40) * Math.PI * 2;
            const r = baseR + (Math.random() - 0.5) * 20;
            const v = Math.sqrt((this.G * m) / r) * 1.1;
            // Rotate velocity for inclined rings
            const vx = -v * Math.sin(a);
            const vy = v * Math.cos(a) * Math.cos(angleOffset);
            this.addParticle(new Particle(1, cx + r * Math.cos(a), cy + r * Math.sin(a) * Math.cos(angleOffset), vx, vy, 'matter'));
          }
        }
        break;
      }
      case 'versus_titans': {
        const m = 5000000;
        this.addParticle(new Particle(m, cx - 300, cy - 300, 20, 20, 'blackhole', 'TITAN BH'));
        this.addParticle(new Particle(m, cx + 300, cy - 300, -20, 20, 'quasar', 'TITAN QUASAR'));
        this.addParticle(new Particle(m, cx + 300, cy + 300, -20, -20, 'magnetar', 'TITAN MAGNETAR'));
        this.addParticle(new Particle(m, cx - 300, cy + 300, 20, -20, 'supermassive_star', 'TITAN STAR'));
        break;
      }
      case 'chaos_cluster': {
        for (let i = 0; i < 200; i++) {
          const r = Math.random() * 300;
          const a = Math.random() * Math.PI * 2;
          const type = (['matter', 'antimatter', 'dark', 'neutron', 'planet'])[Math.floor(Math.random() * 5)] as ParticleType;
          this.addParticle(new Particle(100, cx + r * Math.cos(a), cy + r * Math.sin(a), (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, type));
        }
        break;
      }
      case 'solar_system_vs_bh': {
        // Solar System
        const sm = 1e7;
        this.addParticle(new Particle(sm, cx - 400, cy, 0, 0, 'matter', 'Sun'));
        const planetData = [
          { r: 80, m: 1000 },
          { r: 160, m: 18000 },
          { r: 240, m: 2000 },
          { r: 320, m: 500000 }
        ];
        planetData.forEach(p => {
          const v = Math.sqrt((this.G * sm) / p.r);
          this.addParticle(new Particle(p.m, cx - 400 + p.r, cy, 0, v, 'planet'));
        });
        // Rogue BH
        this.addParticle(new Particle(5e7, cx + 800, cy + 200, -100, 0, 'blackhole', 'ROGUE BH'));
        break;
      }
      case 'nebula_war': {
        // Matter Nebula
        for (let i = 0; i < 100; i++) {
          const r = Math.random() * 200;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(10, cx - 300 + r * Math.cos(a), cy + r * Math.sin(a), 30, 0, 'nebula'));
        }
        // Antimatter Nebula
        for (let i = 0; i < 100; i++) {
          const r = Math.random() * 200;
          const a = Math.random() * Math.PI * 2;
          const p = new Particle(10, cx + 300 + r * Math.cos(a), cy + r * Math.sin(a), -30, 0, 'nebula');
          p.type = 'antimatter'; // Force type to antimatter for collision effect
          p.color = [255, 50, 50] as unknown as Color;
          this.addParticle(p);
        }
        break;
      }
      case 'laplace_resonance': {
        // Io, Europa, Ganymede 1:2:4 resonance
        const m_jupiter = 10000000;
        this.addParticle(new Particle(m_jupiter, cx, cy, 0, 0, 'planet', 'Jupiter'));
        
        const moons = [
          { name: 'Io', r: 100, m: 100, period: 1 },
          { name: 'Europa', r: 158.7, m: 80, period: 2 }, // r ~ T^(2/3)
          { name: 'Ganymede', r: 252, m: 150, period: 4 }
        ];
        
        moons.forEach(m => {
          const v = Math.sqrt((this.G * m_jupiter) / m.r);
          this.addParticle(new Particle(m.m, cx + m.r, cy, 0, v, 'planet', m.name));
        });
        break;
      }
      case 'penrose_process': {
        // Kerr Black Hole ergosphere simulation
        const m = 10000000;
        const bh = new Particle(m, cx, cy, 0, 0, 'blackhole', 'Kerr BH');
        this.addParticle(bh);
        
        // Particles entering ergosphere and splitting
        for (let i = 0; i < 20; i++) {
          const r = 150;
          const a = (i / 20) * Math.PI * 2;
          const v = Math.sqrt((this.G * m) / r) * 0.9;
          this.addParticle(new Particle(100, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter', 'Infalling Matter'));
        }
        break;
      }
      case 'tidal_tail_formation': {
        // Formation of tidal tails during galaxy interaction
        const createDisk = (x: number, y: number, vx: number, vy: number, m: number, color: Color) => {
          this.addParticle(new Particle(m, x, y, vx, vy, 'blackhole', 'Core'));
          for (let i = 0; i < 100; i++) {
            const r = 30 + Math.random() * 100;
            const a = Math.random() * Math.PI * 2;
            const v = Math.sqrt((this.G * m) / r);
            this.addParticle(new Particle(5, x + r * Math.cos(a), y + r * Math.sin(a), vx - v * Math.sin(a), vy + v * Math.cos(a), 'matter', 'Star', 1, color));
          }
        };
        createDisk(cx - 300, cy, 0, 30, 2000000, [100, 200, 255] as any);
        createDisk(cx + 300, cy, 0, -30, 2000000, [255, 200, 100] as any);
        break;
      }
      case 'stellar_stream': {
        // Globular cluster being stripped by a galaxy
        const m_gal = 10000000;
        this.addParticle(new Particle(m_gal, cx, cy, 0, 0, 'blackhole', 'Galaxy'));
        
        const clusterX = cx + 400;
        const clusterY = cy;
        const clusterV = Math.sqrt((this.G * m_gal) / 400);
        
        for (let i = 0; i < 100; i++) {
          const rx = (Math.random() - 0.5) * 30;
          const ry = (Math.random() - 0.5) * 30;
          this.addParticle(new Particle(100, clusterX + rx, clusterY + ry, 0, clusterV, 'matter', 'Cluster Star'));
        }
        break;
      }
      case 'nova_explosion': {
        // White dwarf accreting and then exploding
        const m_wd = 1000000;
        const m_giant = 500000;
        const dist = 100;
        const v = Math.sqrt((this.G * (m_wd + m_giant)) / dist);
        
        this.addParticle(new Particle(m_wd, cx - 33, cy, 0, v * 0.33, 'white_dwarf', 'WD'));
        this.addParticle(new Particle(m_giant, cx + 67, cy, 0, -v * 0.67, 'giant_star', 'Donor'));
        
        // Ejecta
        for (let i = 0; i < 100; i++) {
          const a = Math.random() * Math.PI * 2;
          const ev = 150 + Math.random() * 50;
          const p = new Particle(10, cx - 33, cy, ev * Math.cos(a), ev * Math.sin(a), 'supernova', 'Nova Ejecta');
          p.lifetime = 20;
          this.addParticle(p);
        }
        break;
      }
      case 'hierarchical_sextuple': {
        // Three binary systems orbiting each other
        const createBinary = (x: number, y: number, vx: number, vy: number, m: number, dist: number) => {
          const v = Math.sqrt((this.G * m) / (4 * dist));
          this.addParticle(new Particle(m, x - dist, y, vx, vy + v, 'sun', 'Star'));
          this.addParticle(new Particle(m, x + dist, y, vx, vy - v, 'sun', 'Star'));
        };
        
        const r = 500;
        const v = Math.sqrt((this.G * 3000000) / r);
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          createBinary(cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 500000, 20);
        }
        break;
      }
      case 'dark_matter_stripping': {
        // DM halo stripping during merger
        const m1 = 5000000;
        const m2 = 1000000;
        this.addParticle(new Particle(m1, cx - 200, cy, 20, 0, 'blackhole', 'Main Galaxy'));
        this.addParticle(new Particle(m2, cx + 400, cy, -60, 0, 'dark', 'Satellite Halo'));
        
        for (let i = 0; i < 100; i++) {
          const r = 50 + Math.random() * 50;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(10, cx + 400 + r * Math.cos(a), cy + r * Math.sin(a), -60, 0, 'dark'));
        }
        break;
      }
      case 'galactic_center_cluster': {
        // Multiple S-stars orbiting Sgr A*
        const m_bh = 20000000;
        this.addParticle(new Particle(m_bh, cx, cy, 0, 0, 'blackhole', 'Sgr A*'));
        
        for (let i = 0; i < 15; i++) {
          const peri = 30 + Math.random() * 50;
          const apo = 200 + Math.random() * 400;
          const a = (peri + apo) / 2;
          const e = (apo - peri) / (apo + peri);
          const v_peri = Math.sqrt((this.G * m_bh * (1 + e)) / (a * (1 - e)));
          const angle = Math.random() * Math.PI * 2;
          
          const x = cx + peri * Math.cos(angle);
          const y = cy + peri * Math.sin(angle);
          const vx = -v_peri * Math.sin(angle);
          const vy = v_peri * Math.cos(angle);
          
          this.addParticle(new Particle(1000, x, y, vx, vy, 'blue_giant', `S-${i+1}`));
        }
        break;
      }
      case 'kilonova_merger': {
        // Neutron star merger with kilonova ejecta
        const m = 40000;
        const dist = 40;
        const v = Math.sqrt((this.G * m) / (4 * dist));
        this.addParticle(new Particle(m, cx - dist, cy, 0, v, 'neutron_star', 'NS 1'));
        this.addParticle(new Particle(m, cx + dist, cy, 0, -v, 'neutron_star', 'NS 2'));
        
        for (let i = 0; i < 150; i++) {
          const a = Math.random() * Math.PI * 2;
          const ev = 80 + Math.random() * 120;
          const p = new Particle(1, cx, cy, ev * Math.cos(a), ev * Math.sin(a), 'nebula', 'Kilonova Ejecta');
          p.color = [255, 150, 50] as any;
          p.lifetime = 30;
          this.addParticle(p);
        }
        break;
      }
      case 'imbh_cluster_interaction': {
        // Intermediate Mass Black Hole in a cluster
        const m_imbh = 1000000;
        this.addParticle(new Particle(m_imbh, cx, cy, 0, 0, 'blackhole', 'IMBH'));
        
        for (let i = 0; i < 100; i++) {
          const r = 100 + Math.random() * 300;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m_imbh) / r);
          this.addParticle(new Particle(500, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter'));
        }
        break;
      }
      case 'planetary_system_perturbation': {
        // Passing star disrupts a stable system
        const m_sun = 5000000;
        this.addParticle(new Particle(m_sun, cx, cy, 0, 0, 'sun', 'Sun'));
        for (let i = 1; i <= 5; i++) {
          const r = i * 80;
          const v = Math.sqrt((this.G * m_sun) / r);
          this.addParticle(new Particle(100, cx + r, cy, 0, v, 'planet', `Planet ${i}`));
        }
        
        this.addParticle(new Particle(4000000, cx - 800, cy + 300, 120, -40, 'blue_giant', 'Perturber'));
        break;
      }
      case 'oort_cloud_shower': {
        // Passing star sends comets inward
        const m_sun = 10000000;
        this.addParticle(new Particle(m_sun, cx, cy, 0, 0, 'sun', 'Sun'));
        for (let i = 0; i < 300; i++) {
          const r = 600 + Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m_sun) / r);
          this.addParticle(new Particle(0.1, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'comet'));
        }
        this.addParticle(new Particle(5000000, cx + 1200, cy + 200, -150, 0, 'red_dwarf', 'Passing Star'));
        break;
      }
      case 'double_degenerate_merger': {
        // Two white dwarfs merging
        const m1 = 1200000;
        const m2 = 1000000;
        const dist = 30;
        const v = Math.sqrt((this.G * (m1 + m2)) / dist);
        this.addParticle(new Particle(m1, cx - 15, cy, 0, v * 0.45, 'white_dwarf', 'WD 1'));
        this.addParticle(new Particle(m2, cx + 15, cy, 0, -v * 0.55, 'white_dwarf', 'WD 2'));
        break;
      }
      case 'bipolar_nebula_outflow': {
        // Binary system creating bipolar nebula
        const m1 = 2000000;
        const m2 = 1000000;
        const dist = 40;
        const v = Math.sqrt((this.G * (m1 + m2)) / dist);
        this.addParticle(new Particle(m1, cx - 13, cy, 0, v * 0.33, 'sun', 'Primary'));
        this.addParticle(new Particle(m2, cx + 27, cy, 0, -v * 0.67, 'white_dwarf', 'Companion'));
        
        for (let i = 0; i < 200; i++) {
          const vz = (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 100);
          const vx = (Math.random() - 0.5) * 20;
          const p = new Particle(5, cx, cy, vx, vz, 'nebula', 'Outflow');
          p.lifetime = 25;
          this.addParticle(p);
        }
        break;
      }
      case 'dark_matter_halo_merger': {
        // Two DM halos merging
        const createHalo = (x: number, y: number, vx: number, vy: number, m: number) => {
          this.addParticle(new Particle(m, x, y, vx, vy, 'dark', 'Halo Core'));
          for (let i = 0; i < 100; i++) {
            const r = Math.random() * 200;
            const a = Math.random() * Math.PI * 2;
            this.addParticle(new Particle(10, x + r * Math.cos(a), y + r * Math.sin(a), vx, vy, 'dark'));
          }
        };
        createHalo(cx - 300, cy, 30, 0, 5000000);
        createHalo(cx + 300, cy, -30, 0, 5000000);
        break;
      }
      case 'relativistic_jet_cloud': {
        // Jet hitting a dense cloud
        const qm = 20000000;
        this.addParticle(new Particle(qm, cx - 500, cy, 0, 0, 'quasar', 'Quasar'));
        
        // The cloud
        for (let i = 0; i < 200; i++) {
          const r = Math.random() * 100;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(10, cx + 200 + r * Math.cos(a), cy + r * Math.sin(a), 0, 0, 'nebula', 'Cloud Particle'));
        }
        
        // The jet (simulated as fast particles)
        for (let i = 0; i < 50; i++) {
          this.addParticle(new Particle(1, cx - 500, cy + (Math.random() - 0.5) * 10, 500, 0, 'matter', 'Jet Particle'));
        }
        break;
      }
      case 'mercury_instability': {
        // Solar system with unstable Mercury (amplified)
        const m_sun = 20000000;
        this.addParticle(new Particle(m_sun, cx, cy, 0, 0, 'sun', 'Sun'));
        
        const planets = [
          { n: 'Mercury', r: 60, m: 100, e: 0.205 },
          { n: 'Venus', r: 110, m: 15000, e: 0.007 },
          { n: 'Earth', r: 160, m: 18000, e: 0.017 },
          { n: 'Jupiter', r: 500, m: 5000000, e: 0.048 }
        ];
        
        planets.forEach(p => {
          const a = p.r;
          const e = p.e;
          const v_peri = Math.sqrt((this.G * m_sun * (1 + e)) / (a * (1 - e)));
          this.addParticle(new Particle(p.m, cx + a * (1 - e), cy, 0, v_peri, 'planet', p.n));
        });
        break;
      }
      case 'lisa_source_multi': {
        // Multi-body compact system (LISA target)
        const m_bh = 5000000;
        this.addParticle(new Particle(m_bh, cx, cy, 0, 0, 'blackhole', 'SMBH'));
        
        for (let i = 0; i < 3; i++) {
          const r = 100 + i * 100;
          const v = Math.sqrt((this.G * m_bh) / r);
          const type = i === 0 ? 'neutron_star' : (i === 1 ? 'white_dwarf' : 'blackhole');
          this.addParticle(new Particle(50000, cx + r, cy, 0, v, type, `Compact ${i+1}`));
        }
        break;
      }
      case 'gravitational_lens_grid': {
        // Grid of stars behind a massive cluster
        const m_cluster = 15000000;
        this.addParticle(new Particle(m_cluster, cx, cy, 0, 0, 'blackhole', 'Cluster Core'));
        
        for (let x = -3; x <= 3; x++) {
          for (let y = -3; y <= 3; y++) {
            this.addParticle(new Particle(1000, cx + x * 200, cy - 800 + y * 50, 0, 0, 'matter', 'Source Star'));
          }
        }
        break;
      }
      case 'accretion_disk_instability': {
        // Disk with gaps and clumps
        const m = 10000000;
        this.addParticle(new Particle(m, cx, cy, 0, 0, 'sun', 'Protostar'));
        
        for (let i = 0; i < 400; i++) {
          const r = 100 + Math.random() * 500;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m) / r) * (0.98 + Math.random() * 0.04);
          const mass = Math.random() > 0.95 ? 5000 : 10;
          this.addParticle(new Particle(mass, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'matter'));
        }
        break;
      }
      case 'binary_bh_kick': {
        // Post-merger recoil kick simulation
        const m1 = 5000000;
        const m2 = 5000000;
        this.addParticle(new Particle(m1, cx - 10, cy, 0, 100, 'blackhole', 'BH 1'));
        this.addParticle(new Particle(m2, cx + 10, cy, 0, -100, 'blackhole', 'BH 2'));
        
        // The "kick" will happen naturally if they merge with asymmetric momentum, 
        // but here we simulate the environment.
        for (let i = 0; i < 50; i++) {
          const r = 200 + Math.random() * 100;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(100, cx + r * Math.cos(a), cy + r * Math.sin(a), 0, 0, 'matter'));
        }
        break;
      }
      case 'stellar_nursery_collapse': {
        // Large molecular cloud collapsing into stars
        for (let i = 0; i < 500; i++) {
          const r = Math.random() * 400;
          const a = Math.random() * Math.PI * 2;
          const p = new Particle(50, cx + r * Math.cos(a), cy + r * Math.sin(a), (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 'nebula');
          this.addParticle(p);
        }
        break;
      }
      case 'galactic_jet_precession': {
        // Precessing relativistic jet
        const qm = 30000000;
        this.addParticle(new Particle(qm, cx, cy, 0, 0, 'quasar', 'Precessing Quasar'));
        
        // We'll simulate the jet over time by adding particles in a cone that rotates
        // This is a static setup, so we'll just show the "snapshot" of a precessing jet
        for (let i = 0; i < 100; i++) {
          const t = i / 100;
          const angle = t * Math.PI * 4; // Precession
          const dist = t * 1000;
          const vx = 400 * Math.cos(angle);
          const vy = 400 * Math.sin(angle);
          this.addParticle(new Particle(1, cx + dist * Math.cos(angle), cy + dist * Math.sin(angle), vx, vy, 'matter', 'Jet'));
        }
        break;
      }
      case 'planet_migration_resonance': {
        // Planets migrating and getting trapped in resonance
        const m_sun = 15000000;
        this.addParticle(new Particle(m_sun, cx, cy, 0, 0, 'sun', 'Sun'));
        
        // Outer planet migrating inward
        const m1 = 50000;
        const r1 = 400;
        const v1 = Math.sqrt((this.G * m_sun) / r1) * 0.95; // Slightly slower to migrate
        this.addParticle(new Particle(m1, cx + r1, cy, 0, v1, 'planet', 'Migrator'));
        
        // Inner planet
        const m2 = 20000;
        const r2 = 200;
        const v2 = Math.sqrt((this.G * m_sun) / r2);
        this.addParticle(new Particle(m2, cx + r2, cy, 0, v2, 'planet', 'Inner'));
        break;
      }
      case 'asteroid_belt_kirkwood': {
        // Kirkwood gaps in the asteroid belt due to Jupiter
        const m_sun = 20000000;
        const m_jup = 2000000;
        this.addParticle(new Particle(m_sun, cx, cy, 0, 0, 'sun', 'Sun'));
        this.addParticle(new Particle(m_jup, cx + 600, cy, 0, Math.sqrt((this.G * m_sun) / 600), 'planet', 'Jupiter'));
        
        for (let i = 0; i < 500; i++) {
          const r = 200 + Math.random() * 300;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * m_sun) / r);
          this.addParticle(new Particle(1, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'asteroid'));
        }
        break;
      }
      case 'binary_pulsar_periastron_shift': {
        // Hulse-Taylor like system with visible periastron shift
        const m = 100000;
        const a = 100;
        const e = 0.6;
        const v_peri = Math.sqrt((this.G * 2 * m * (1 + e)) / (a * (1 - e)));
        
        this.addParticle(new Particle(m, cx + a * (1 - e), cy, 0, v_peri, 'pulsar', 'Pulsar 1'));
        this.addParticle(new Particle(m, cx - a * (1 - e), cy, 0, -v_peri, 'pulsar', 'Pulsar 2'));
        break;
      }
      case 'dark_matter_subhalo_stripping_detailed': {
        // Detailed satellite stripping in a DM halo
        const m_main = 10000000;
        this.addParticle(new Particle(m_main, cx, cy, 0, 0, 'blackhole', 'Main Halo'));
        
        const m_sat = 500000;
        const satX = cx + 500;
        const satV = Math.sqrt((this.G * m_main) / 500) * 0.8;
        this.addParticle(new Particle(m_sat, satX, cy, 0, satV, 'dark', 'Satellite'));
        
        for (let i = 0; i < 200; i++) {
          const r = Math.random() * 40;
          const a = Math.random() * Math.PI * 2;
          this.addParticle(new Particle(5, satX + r * Math.cos(a), cy + r * Math.sin(a), 0, satV, 'dark'));
        }
        break;
      }
      case 'primordial_bh_cluster_evaporation': {
        // Cluster of small primordial BHs
        for (let i = 0; i < 50; i++) {
          const r = Math.random() * 200;
          const a = Math.random() * Math.PI * 2;
          const v = Math.sqrt((this.G * 100000) / r) * 0.5;
          this.addParticle(new Particle(5000, cx + r * Math.cos(a), cy + r * Math.sin(a), -v * Math.sin(a), v * Math.cos(a), 'blackhole', 'PBH'));
        }
        break;
      }
      case 'white_dwarf_binary_gw': {
        // Very close WD binary (GW source)
        const m = 1000000;
        const dist = 20;
        const v = Math.sqrt((this.G * m) / (4 * dist));
        this.addParticle(new Particle(m, cx - dist, cy, 0, v, 'white_dwarf', 'WD 1'));
        this.addParticle(new Particle(m, cx + dist, cy, 0, -v, 'white_dwarf', 'WD 2'));
        break;
      }
      case 'neutron_star_magnetar_collision': {
        // Collision between a NS and a Magnetar
        this.addParticle(new Particle(50000, cx - 100, cy, 100, 0, 'neutron_star', 'NS'));
        this.addParticle(new Particle(60000, cx + 100, cy, -100, 0, 'magnetar', 'Magnetar'));
        break;
      }
    }
  }
}

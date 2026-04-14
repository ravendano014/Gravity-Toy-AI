import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Particle } from './simulation/Particle';
import { GravityEngine } from './simulation/engine';
import { GravityMode, ParticleType, Color, OrbitType } from './types';
import { 
  Play, 
  Pause, 
  Trash2, 
  HelpCircle, 
  Settings, 
  Maximize, 
  Minimize, 
  Crosshair,
  Info,
  Layers,
  Zap,
  Globe,
  Sun,
  Moon as MoonIcon,
  FastForward,
  Rewind,
  Save,
  FolderOpen,
  X,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

const G = 800;

const STAR_PRESETS: Record<string, { type: ParticleType; mass: number; density: number; diameter: number; name: string; color: string }> = {
  sirius: { type: 'matter', mass: 4.017e30, density: 0.71, diameter: 2400000, name: 'Sirius A', color: '#ffffff' },
  canopus: { type: 'giant_star', mass: 1.591e31, density: 0.0001, diameter: 100000000, name: 'Canopus', color: '#ffffff' },
  arcturus: { type: 'giant_star', mass: 2.148e30, density: 0.0001, diameter: 35000000, name: 'Arcturus', color: '#ffcc00' },
  vega: { type: 'matter', mass: 4.176e30, density: 0.5, diameter: 2700000, name: 'Vega', color: '#f0f8ff' },
  capella: { type: 'giant_star', mass: 4.972e30, density: 0.01, diameter: 12000000, name: 'Capella', color: '#ffff00' },
  rigel: { type: 'supermassive_star', mass: 4.176e31, density: 0.000001, diameter: 100000000, name: 'Rigel', color: '#87ceeb' },
  procyon: { type: 'matter', mass: 2.983e30, density: 0.5, diameter: 2000000, name: 'Procyon A', color: '#f5f5f5' },
  betelgeuse: { type: 'supermassive_star', mass: 2.307e31, density: 0.00000001, diameter: 1200000000, name: 'Betelgeuse', color: '#ff4500' },
  achernar: { type: 'matter', mass: 1.332e31, density: 0.1, diameter: 8000000, name: 'Achernar', color: '#add8e6' },
  hadar: { type: 'supermassive_star', mass: 1.989e31, density: 0.01, diameter: 15000000, name: 'Hadar', color: '#0000ff' },
  altair: { type: 'matter', mass: 3.580e30, density: 0.8, diameter: 2200000, name: 'Altair', color: '#ffffff' },
  acrux: { type: 'supermassive_star', mass: 3.580e31, density: 0.01, diameter: 20000000, name: 'Acrux', color: '#0000ff' },
  aldebaran: { type: 'giant_star', mass: 2.307e30, density: 0.00001, diameter: 60000000, name: 'Aldebaran', color: '#ff8c00' },
  antares: { type: 'supermassive_star', mass: 2.386e31, density: 0.00000001, diameter: 1100000000, name: 'Antares', color: '#ff0000' },
  spica: { type: 'supermassive_star', mass: 2.267e31, density: 0.001, diameter: 10000000, name: 'Spica', color: '#0000ff' },
  pollux: { type: 'giant_star', mass: 3.779e30, density: 0.01, diameter: 12000000, name: 'Pollux', color: '#ffcc66' },
  deneb: { type: 'supermassive_star', mass: 3.779e31, density: 0.000001, diameter: 200000000, name: 'Deneb', color: '#ffffff' },
  planet: { type: 'planet', mass: 5.972e24, density: 5.51, diameter: 12742, name: 'Generic Planet', color: '#228b22' },
  sun: { type: 'matter', mass: 1.989e30, density: 1.41, diameter: 1392700, name: 'Yellow Star (Sun)', color: '#ffd700' },
  black_hole: { type: 'blackhole', mass: 1.989e32, density: 10, diameter: 295, name: 'Black Hole', color: '#000000' },
  nebula: { type: 'nebula', mass: 9.945e30, density: 0.001, diameter: 1000000000, name: 'Nebula', color: '#6432c8' },
  asteroid: { type: 'planet', mass: 1e18, density: 2.5, diameter: 100, name: 'Asteroid', color: '#696969' },
  comet: { type: 'comet', mass: 1e15, density: 0.5, diameter: 10, name: 'Comet', color: '#e0ffff' },
  red_dwarf: { type: 'matter', mass: 1.989e29, density: 10, diameter: 500000, name: 'Red Dwarf', color: '#ff4500' },
  red_giant: { type: 'giant_star', mass: 3.978e30, density: 0.001, diameter: 100000000, name: 'Red Giant', color: '#ff6347' },
  blue_giant: { type: 'supermassive_star', mass: 1.989e31, density: 0.1, diameter: 10000000, name: 'Blue Giant', color: '#00bfff' },
  supermassive_star: { type: 'supermassive_star', mass: 9.945e31, density: 0.5, diameter: 20000000, name: 'Supermassive Star', color: '#96c8ff' },
  white_dwarf: { type: 'white_dwarf', mass: 1.989e30, density: 1000, diameter: 12000, name: 'White Dwarf', color: '#f0f8ff' },
  neutron_star: { type: 'neutron', mass: 5.967e31, density: 5000, diameter: 20, name: 'Neutron Star', color: '#e6e6fa' },
  magnetar: { type: 'magnetar', mass: 8.950e31, density: 5000, diameter: 20, name: 'Magnetar', color: '#b4dcff' },
  pulsar: { type: 'pulsar', mass: 7.956e31, density: 3000, diameter: 20, name: 'Pulsar', color: '#da70d6' },
  supernova: { type: 'supernova', mass: 1.989e31, density: 0.001, diameter: 100000000, name: 'Supernova', color: '#ff6432' },
  quasar: { type: 'quasar', mass: 1.989e41, density: 12, diameter: 1000000000, name: 'Quasar', color: '#ffffff' },
  wormhole: { type: 'wormhole', mass: 0, density: 1, diameter: 1000, name: 'Wormhole', color: '#00ffff' },
  mercury: { type: 'planet', mass: 3.301e23, density: 5.43, diameter: 4879, name: 'Mercury', color: '#a5a5a5' },
  venus: { type: 'planet', mass: 4.867e24, density: 5.24, diameter: 12104, name: 'Venus', color: '#e3bb76' },
  earth: { type: 'planet', mass: 5.972e24, density: 5.51, diameter: 12742, name: 'Earth', color: '#2271b3' },
  mars: { type: 'planet', mass: 6.390e23, density: 3.93, diameter: 6779, name: 'Mars', color: '#e27b58' },
  jupiter: { type: 'planet', mass: 1.898e27, density: 1.33, diameter: 139820, name: 'Jupiter', color: '#d39c7e' },
  saturn: { type: 'planet', mass: 5.683e26, density: 0.69, diameter: 116460, name: 'Saturn', color: '#c5ab6e' },
  uranus: { type: 'planet', mass: 8.681e25, density: 1.27, diameter: 50724, name: 'Uranus', color: '#bbe1e4' },
  neptune: { type: 'planet', mass: 1.024e26, density: 1.64, diameter: 49244, name: 'Neptune', color: '#6081ff' },
  pluto: { type: 'planet', mass: 1.309e22, density: 1.86, diameter: 2377, name: 'Pluto', color: '#ffdab9' },
  moon: { type: 'planet', mass: 7.342e22, density: 3.34, diameter: 3474, name: 'The Moon (Earth)', color: '#d3d3d3' },
  io: { type: 'planet', mass: 8.932e22, density: 3.53, diameter: 3643, name: 'Io (Jupiter)', color: '#ffff00' },
  europa: { type: 'planet', mass: 4.800e22, density: 3.01, diameter: 3122, name: 'Europa (Jupiter)', color: '#f5f5dc' },
  ganymede: { type: 'planet', mass: 1.482e23, density: 1.94, diameter: 5268, name: 'Ganymede (Jupiter)', color: '#8b8b8b' },
  callisto: { type: 'planet', mass: 1.076e23, density: 1.83, diameter: 4821, name: 'Callisto (Jupiter)', color: '#8b4513' },
  phobos: { type: 'planet', mass: 1.066e16, density: 1.87, diameter: 22, name: 'Phobos (Mars)', color: '#a9a9a9' },
  deimos: { type: 'planet', mass: 1.476e15, density: 1.47, diameter: 12, name: 'Deimos (Mars)', color: '#d3d3d3' },
  mimas: { type: 'planet', mass: 3.750e19, density: 1.15, diameter: 396, name: 'Mimas (Saturn)', color: '#d3d3d3' },
  enceladus: { type: 'planet', mass: 1.080e20, density: 1.61, diameter: 504, name: 'Enceladus (Saturn)', color: '#ffffff' },
  tethys: { type: 'planet', mass: 6.170e20, density: 0.98, diameter: 1062, name: 'Tethys (Saturn)', color: '#d3d3d3' },
  dione: { type: 'planet', mass: 1.095e21, density: 1.48, diameter: 1122, name: 'Dione (Saturn)', color: '#d3d3d3' },
  rhea: { type: 'planet', mass: 2.306e21, density: 1.23, diameter: 1527, name: 'Rhea (Saturn)', color: '#d3d3d3' },
  titan: { type: 'planet', mass: 1.345e23, density: 1.88, diameter: 5150, name: 'Titan (Saturn)', color: '#ffcc00' },
  iapetus: { type: 'planet', mass: 1.805e21, density: 1.08, diameter: 1469, name: 'Iapetus (Saturn)', color: '#d3d3d3' },
  miranda: { type: 'planet', mass: 6.590e19, density: 1.2, diameter: 471, name: 'Miranda (Uranus)', color: '#d3d3d3' },
  ariel: { type: 'planet', mass: 1.353e21, density: 1.66, diameter: 1158, name: 'Ariel (Uranus)', color: '#d3d3d3' },
  umbriel: { type: 'planet', mass: 1.172e21, density: 1.39, diameter: 1169, name: 'Umbriel (Uranus)', color: '#d3d3d3' },
  titania: { type: 'planet', mass: 3.527e21, density: 1.71, diameter: 1578, name: 'Titania (Uranus)', color: '#d3d3d3' },
  oberon: { type: 'planet', mass: 3.014e21, density: 1.63, diameter: 1522, name: 'Oberon (Uranus)', color: '#d3d3d3' },
  triton: { type: 'planet', mass: 2.140e22, density: 2.06, diameter: 2706, name: 'Triton (Neptune)', color: '#add8e6' },
  charon: { type: 'planet', mass: 1.586e21, density: 1.7, diameter: 1212, name: 'Charon (Pluto)', color: '#d3d3d3' },
  voyager: { type: 'spacecraft', mass: 722, density: 1, diameter: 0.004, name: 'Voyager 1/2', color: '#c0c0c0' },
  sls: { type: 'spacecraft', mass: 2.6e6, density: 1, diameter: 0.008, name: 'NASA SLS', color: '#ff8c00' },
  apollo: { type: 'spacecraft', mass: 4.5e4, density: 1, diameter: 0.004, name: 'Apollo CSM', color: '#ffffff' },
  spacex_starship: { type: 'spacecraft', mass: 5e6, density: 1, diameter: 0.009, name: 'SpaceX Starship', color: '#b0b0b0' },
  blue_moon: { type: 'spacecraft', mass: 1.5e4, density: 1, diameter: 0.007, name: 'Blue Moon Lander', color: '#add8e6' },
  shuttle: { type: 'spacecraft', mass: 2e6, density: 1, diameter: 0.037, name: 'Space Shuttle', color: '#ffffff' },
  iss: { type: 'spacecraft', mass: 4.5e5, density: 1, diameter: 0.109, name: 'ISS', color: '#ffffff' },
  hubble: { type: 'spacecraft', mass: 1.1e4, density: 1, diameter: 0.013, name: 'Hubble Telescope', color: '#c0c0c0' },
  jwst: { type: 'spacecraft', mass: 6.5e3, density: 1, diameter: 0.02, name: 'James Webb (JWST)', color: '#ffd700' },
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GravityEngine>(new GravityEngine());
  const [isPaused, setIsPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showExtraOptions, setShowExtraOptions] = useState(false);
  const [particleCount, setParticleCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [zoom, setZoom] = useState(0.12);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const lastTransformRef = useRef({ pan: { x: 0, y: 0 }, zoom: 0.12 });
  const [simulationTime, setSimulationTime] = useState(0);
  const startDateRef = useRef(new Date());

  const currentSimDate = useMemo(() => {
    // Earth's orbital period in simulation units:
    // T = 2 * PI * sqrt(r^3 / (G * M))
    // r = AU_IN_SIM_UNITS (approx 16520.6)
    // G = 800
    // M = 1e7 (Sun mass)
    const SIM_YEAR_UNITS = 149.17; 
    const years = simulationTime / SIM_YEAR_UNITS;
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    return new Date(startDateRef.current.getTime() + years * msPerYear);
  }, [simulationTime]);
  const [gravityMode, setGravityMode] = useState<GravityMode>('inverseSquare');
  const [newMass, setNewMass] = useState(1.989e30);
  const [newDensity, setNewDensity] = useState(1.41);
  const [newDiameter, setNewDiameter] = useState(1392700);
  const [newColor, setNewColor] = useState('#ffffff');
  const [particleType, setParticleType] = useState<ParticleType>('matter');
  const [orbiterDistance, setOrbiterDistance] = useState(149600000); // 1 AU in km
  const [orbiterOrbitType, setOrbiterOrbitType] = useState<OrbitType>('circular');
  const [particleName, setParticleName] = useState('New Particle');
  const [trailsEnabled, setTrailsEnabled] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [showMass, setShowMass] = useState(false);
  const [showMagnetospheres, setShowMagnetospheres] = useState(false);
  const [showOrbits, setShowOrbits] = useState(false);
  const [showGravityWells, setShowGravityWells] = useState(false);
  const [showMagneticFields, setShowMagneticFields] = useState(false);
  const [showSpacetimeGrid, setShowSpacetimeGrid] = useState(false);
  const [showLensing, setShowLensing] = useState(false);
  const [showLagrange, setShowLagrange] = useState(false);
  const [showHillSpheres, setShowHillSpheres] = useState(false);
  const [showGravityInfluence, setShowGravityInfluence] = useState(false);
  const [rulerEnabled, setRulerEnabled] = useState(false);
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [rulerMeasurements, setRulerMeasurements] = useState<{p1: {x: number, y: number}, p2: {x: number, y: number}, color: string}[]>([]);
  const [rulerPoints, setRulerPoints] = useState<{x: number, y: number}[]>([]);
  const [rulerColor, setRulerColor] = useState('#ffff00');
  const [rulerUnit, setRulerUnit] = useState<'km' | 'mi' | 'AU' | 'ly'>('km');
  const [scaleUnit, setScaleUnit] = useState<'AU' | 'Mmi' | 'Mkm' | 'lm'>('AU');
  const [selectedExperiment, setSelectedExperiment] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('');
  const [selectedParticleId, setSelectedParticleId] = useState<string | null>(null);
  const [followSelected, setFollowSelected] = useState(false);
  const [showParticleList, setShowParticleList] = useState(false);
  const [particleSearch, setParticleSearch] = useState('');
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [simSpeed, setSimSpeed] = useState(0.002);
  const [saveName, setSaveName] = useState('');
  const [savedSystems, setSavedSystems] = useState<string[]>([]);
  const [showReferenceTrajectory, setShowReferenceTrajectory] = useState(true);
  const [orbitTracerEnabled, setOrbitTracerEnabled] = useState(false);
  const [orbitPlannerEnabled, setOrbitPlannerEnabled] = useState(false);
  const [plannedOrbits, setPlannedOrbits] = useState<{x: number, y: number, vx: number, vy: number, color: string}[]>([]);

  useEffect(() => {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('gravity_sim_'));
    setSavedSystems(keys.map(key => key.replace('gravity_sim_', '')));
  }, []);

  const saveCurrentSystem = () => {
    if (!saveName.trim()) return;
    const state = {
      particles: engine.particles.map(p => ({
        mass: p.mass,
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        type: p.type,
        name: p.name,
        density: p.density,
        color: p.color,
        id: p.id
      })),
      zoom,
      pan,
      gravityMode,
      simulationTime,
      settings: {
        trailsEnabled,
        showNames,
        showMass,
        showMagnetospheres,
        showOrbits,
        showGravityWells,
        showMagneticFields,
        showSpacetimeGrid,
        showLensing,
        showLagrange,
        showHillSpheres,
        showGravityInfluence
      }
    };
    localStorage.setItem(`gravity_sim_${saveName}`, JSON.stringify(state));
    if (!savedSystems.includes(saveName)) {
      setSavedSystems([...savedSystems, saveName]);
    }
    setSaveName('');
  };

  const loadSystem = (name: string) => {
    const data = localStorage.getItem(`gravity_sim_${name}`);
    if (!data) return;
    try {
      const state = JSON.parse(data);
      engine.clear();
      state.particles.forEach((pData: any) => {
        const p = new Particle(
          pData.mass,
          pData.x,
          pData.y,
          pData.vx,
          pData.vy,
          pData.type,
          pData.name,
          pData.density,
          pData.color,
          pData.diameter
        );
        p.id = pData.id || p.id;
        engine.addParticle(p);
      });
      setZoom(state.zoom || 0.12);
      setPan(state.pan || { x: 0, y: 0 });
      setGravityMode(state.gravityMode || 'inverseSquare');
      setSimulationTime(state.simulationTime || 0);
      if (state.settings) {
        setTrailsEnabled(!!state.settings.trailsEnabled);
        setShowNames(!!state.settings.showNames);
        setShowMass(!!state.settings.showMass);
        setShowMagnetospheres(!!state.settings.showMagnetospheres);
        setShowOrbits(!!state.settings.showOrbits);
        setShowGravityWells(!!state.settings.showGravityWells);
        setShowMagneticFields(!!state.settings.showMagneticFields);
        setShowSpacetimeGrid(!!state.settings.showSpacetimeGrid);
        setShowLensing(!!state.settings.showLensing);
        setShowLagrange(!!state.settings.showLagrange);
        setShowHillSpheres(!!state.settings.showHillSpheres);
        setShowGravityInfluence(!!state.settings.showGravityInfluence);
      }
    } catch (e) {
      console.error("Failed to load system", e);
    }
  };

  const deleteSystem = (name: string) => {
    localStorage.removeItem(`gravity_sim_${name}`);
    setSavedSystems(savedSystems.filter(s => s !== name));
  };

  // Constants for scale
  const SOLAR_RADIUS = 0.4 * Math.pow(10000000 / 1.41, 1/3);
  const SOLAR_DIAMETER = SOLAR_RADIUS * 2;
  const AU_IN_SOLAR_DIAMETERS = 107.5;
  const AU_IN_SIM_UNITS = SOLAR_DIAMETER * AU_IN_SOLAR_DIAMETERS;

  const UNIT_CONVERSIONS = {
    AU: 1,
    Mmi: 92.9558,
    Mkm: 149.5978,
    lm: 8.3167
  };

  const UNIT_LABELS = {
    AU: 'AU',
    Mmi: 'M mi',
    Mkm: 'M km',
    lm: 'lm'
  };

  // Drag state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragEndRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);

  const engine = engineRef.current;
  
  const handleClear = useCallback(() => {
    engine.clear();
    engine.h = 0.002;
    setSimSpeed(0.002);
    setSimulationTime(0);
    startDateRef.current = new Date();
    setZoom(0.12);
    setPan({ x: 0, y: 0 });
    setRulerPoints([]);
    setRulerMeasurements([]);
  }, [engine]);

  const addOrbiter = (
    parent: Particle, 
    mass?: number, 
    type?: ParticleType, 
    name?: string, 
    density?: number, 
    color?: string,
    diameter?: number
  ) => {
    const m = mass ?? newMass;
    const t = type ?? particleType;
    const n = name ?? `${parent.name}'s Moon`;
    const d = density ?? newDensity;
    const c = color ? hexToColor(color) : hexToColor(newColor);
    const diam = diameter ?? newDiameter;

    let ox, oy, ovx, ovy;

    if (['L1', 'L2', 'L3', 'L4', 'L5'].includes(orbiterOrbitType)) {
      const p1 = engine.getDominantSource(parent);
      if (p1) {
        const points = engine.getLagrangePoints(p1, parent);
        const pos = points[orbiterOrbitType];
        if (pos) {
          ox = pos.x;
          oy = pos.y;
          ovx = pos.vx;
          ovy = pos.vy;
        } else {
          // Fallback to circular if point not found
          const dist = parent.radius * orbiterDistance + 20;
          const angle = Math.random() * Math.PI * 2;
          ox = parent.x + Math.cos(angle) * dist;
          oy = parent.y + Math.sin(angle) * dist;
          let v = Math.sqrt((G * parent.mass) / dist);
          ovx = parent.vx - v * Math.sin(angle);
          ovy = parent.vy + v * Math.cos(angle);
        }
      } else {
        // Fallback if no primary found
        const dist = parent.radius * orbiterDistance + 20;
        const angle = Math.random() * Math.PI * 2;
        ox = parent.x + Math.cos(angle) * dist;
        oy = parent.y + Math.sin(angle) * dist;
        let v = Math.sqrt((G * parent.mass) / dist);
        ovx = parent.vx - v * Math.sin(angle);
        ovy = parent.vy + v * Math.cos(angle);
      }
    } else {
      // Distance: radius multiplier + some padding
      const dist = parent.radius * orbiterDistance + 20;
      const angle = Math.random() * Math.PI * 2;
      
      ox = parent.x + Math.cos(angle) * dist;
      oy = parent.y + Math.sin(angle) * dist;
      
      // Orbital velocity: v = sqrt(G * M / r)
      let v = Math.sqrt((G * parent.mass) / dist);
      
      // Adjust velocity based on orbit type
      switch (orbiterOrbitType) {
        case 'elliptical_low': v *= 0.7; break;
        case 'elliptical_high': v *= 1.2; break;
        case 'retrograde': v *= -1; break;
        case 'escape': v *= Math.sqrt(2); break;
        default: break; // circular
      }
      
      // Relative velocity to parent
      ovx = parent.vx - v * Math.sin(angle);
      ovy = parent.vy + v * Math.cos(angle);
    }
    
    const orbiter = new Particle(
      m, 
      ox, 
      oy, 
      ovx, 
      ovy, 
      t, 
      n, 
      d, 
      c,
      diam
    );
    engine.addParticle(orbiter);
  };

  const handleZoom = useCallback((delta: number, centerX: number, centerY: number) => {
    const worldX = (centerX - pan.x) / zoom;
    const worldY = (centerY - pan.y) / zoom;
    const newZoom = Math.max(0.0001, Math.min(10000, zoom * delta));
    setZoom(newZoom);
    setPan({
      x: centerX - worldX * newZoom,
      y: centerY - worldY * newZoom
    });
  }, [zoom, pan]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      const key = e.key.toLowerCase();
      switch (key) {
        case 'p': setIsPaused(prev => !prev); break;
        case 'c': handleClear(); break;
        case 't': setTrailsEnabled(prev => !prev); break;
        case 'o': setShowOrbits(prev => !prev); break;
        case 'n': setShowNames(prev => !prev); break;
        case 'm': setShowMass(prev => !prev); break;
        case 'h': setShowHelp(prev => !prev); break;
        case 'g': setShowGravityWells(prev => !prev); break;
        case 'f': setShowSpacetimeGrid(prev => !prev); break;
        case 'd': generateRandomSystem(); break;
        case 'arrowup': setPan(prev => ({ ...prev, y: prev.y + 30 })); break;
        case 'arrowdown': setPan(prev => ({ ...prev, y: prev.y - 30 })); break;
        case 'arrowleft': setPan(prev => ({ ...prev, x: prev.x + 30 })); break;
        case 'arrowright': setPan(prev => ({ ...prev, x: prev.x - 30 })); break;
        case '0': setNewMass(1); break;
        case '1': setNewMass(100); break;
        case '2': setNewMass(1000); break;
        case '3': setNewMass(10000); break;
        case '4': setNewMass(100000); break;
        case '5': setNewMass(1000000); break;
        case ' ': setIsPaused(prev => !prev); break;
        case '+':
        case '=':
          handleZoom(1.1, window.innerWidth / 2, window.innerHeight / 2);
          break;
        case '-':
        case '_':
          handleZoom(1 / 1.1, window.innerWidth / 2, window.innerHeight / 2);
          break;
        case '[':
        case '<':
        case ',':
          engine.h /= 1.2;
          break;
        case ']':
        case '>':
        case '.':
          engine.h *= 1.2;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, handleZoom]);
  useEffect(() => {
    engine.gravityMode = gravityMode;
    engine.showOrbits = showOrbits;
    engine.showMagnetospheres = showMagnetospheres;
    engine.showGravityWells = showGravityWells;
    engine.showMagneticFields = showMagneticFields;
    engine.showGravitationalLensing = showLensing;
    engine.showHillSpheres = showHillSpheres;
    engine.showGravityInfluence = showGravityInfluence;
  }, [gravityMode, showOrbits, showMagnetospheres, showGravityWells, showMagneticFields, showLensing, showHillSpheres, showGravityInfluence]);

  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Simulation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();

    const loop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      // Update FPS
      frameCount++;
      if (time - lastFpsUpdate >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastFpsUpdate)));
        frameCount = 0;
        lastFpsUpdate = time;
      }

      if (!isPaused) {
        engine.integrate();
        setSimulationTime(prev => prev + engine.h);
      }

      // Follow selected particle
      if (followSelected && selectedParticleId) {
        const selected = engine.particles.find(p => p.id === selectedParticleId);
        if (selected) {
          setPan({
            x: window.innerWidth / 2 - selected.x * zoom,
            y: window.innerHeight / 2 - selected.y * zoom
          });
        } else {
          setFollowSelected(false);
          setSelectedParticleId(null);
        }
      }

      draw();
      setParticleCount(engine.particles.length);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, zoom, pan, trailsEnabled, showNames, showMass, showLagrange, showHillSpheres, showGravityInfluence, showOrbits, showMagnetospheres, showGravityWells, showSpacetimeGrid, showMagneticFields, showLensing, rulerEnabled, rulerPoints, rulerUnit]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const transformChanged = pan.x !== lastTransformRef.current.pan.x || 
                             pan.y !== lastTransformRef.current.pan.y || 
                             zoom !== lastTransformRef.current.zoom;

    if (trailsEnabled && !transformChanged) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    lastTransformRef.current = { pan: { ...pan }, zoom };

    ctx.save();
    try {
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Draw Spacetime Grid
      if (showSpacetimeGrid) {
        const step = 40;
        const margin = 80;
        const left = (-pan.x / zoom) - margin;
        const right = ((canvas.width - pan.x) / zoom) + margin;
        const top = (-pan.y / zoom) - margin;
        const bottom = ((canvas.height - pan.y) / zoom) + margin;

        const startX = Math.floor(left / step) * step;
        const startY = Math.floor(top / step) * step;

        const massiveParticles = engine.particles
          .filter(p => p.mass > 500)
          .sort((a, b) => b.mass - a.mass)
          .slice(0, 15);

        const getWarpedPoint = (x: number, y: number) => {
          let dx = 0;
          let dy = 0;
          massiveParticles.forEach(p => {
            const distDX = p.x - x;
            const distDY = p.y - y;
            const distSq = distDX * distDX + distDY * distDY;
            const dist = Math.sqrt(distSq);
            if (dist < 1) return;
            const warpFactor = 0.15;
            const softening = 30;
            const warp = (p.mass * warpFactor) / (dist + softening);
            const angle = Math.atan2(distDY, distDX);
            dx += Math.cos(angle) * Math.min(dist * 0.9, warp);
            dy += Math.sin(angle) * Math.min(dist * 0.9, warp);
          });
          return { x: x + dx, y: y + dy };
        };

        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
        ctx.lineWidth = 0.5 / zoom;

        for (let y = startY; y <= bottom; y += step) {
          let first = true;
          for (let x = startX; x <= right; x += step / 2) {
            const p = getWarpedPoint(x, y);
            if (first) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
            first = false;
          }
        }

        for (let x = startX; x <= right; x += step) {
          let first = true;
          for (let y = startY; y <= bottom; y += step / 2) {
            const p = getWarpedPoint(x, y);
            if (first) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
            first = false;
          }
        }
        ctx.stroke();
      }

    // Draw Orbits
    if (showOrbits) {
      ctx.lineWidth = 1 / zoom;
      engine.particles.forEach(p => {
        if (p.path.length > 1) {
          let currentType = p.path[0].thrustType || 'none';
          ctx.beginPath();
          ctx.moveTo(p.path[0].x, p.path[0].y);
          
          const getStrokeStyle = (type: string) => {
            if (type === 'accelerating') return "rgba(255, 100, 0, 0.8)"; // Orange/Red for acceleration
            if (type === 'decelerating') return "rgba(0, 200, 255, 0.8)"; // Cyan/Blue for deceleration
            return `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.5)`;
          };

          ctx.strokeStyle = getStrokeStyle(currentType);

          for (let i = 1; i < p.path.length; i++) {
            const pt = p.path[i];
            const type = pt.thrustType || 'none';
            
            if (type !== currentType) {
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(p.path[i-1].x, p.path[i-1].y);
              ctx.strokeStyle = getStrokeStyle(type);
              currentType = type;
            }
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
        }
      });
    }

    // Draw Magnetic Fields
    if (showMagneticFields) {
      engine.particles.forEach(p => {
        const magneticTypes = ['neutron', 'pulsar', 'magnetar', 'neutron_star', 'sun', 'giant_star', 'supermassive_star'];
        if (magneticTypes.includes(p.type)) {
          const magRadius = p.magnetosphereRadius || (p.radius * 20);
          const numLines = (p.type === 'pulsar' || p.type === 'magnetar') ? 24 : 12;
          const time = Date.now() / 1000;
          const rotSpeed = p.rotationSpeed || (p.type === 'pulsar' ? 2 : 0.5);
          
          for (let i = 0; i < numLines; i++) {
            const baseAngle = (i / numLines) * Math.PI * 2 + time * rotSpeed;
            
            // Draw dipole field lines
            ctx.beginPath();
            const steps = 30;
            for (let j = 0; j <= steps; j++) {
              const t = (j / steps) * 2 - 1; // -1 to 1
              const angle = baseAngle + Math.sin(t * Math.PI * 0.5) * 0.3;
              const r = p.radius + (magRadius - p.radius) * (1 - t * t);
              const x = p.x + Math.cos(angle) * r;
              const y = p.y + Math.sin(angle) * r;
              if (j === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            
            let color;
            if (p.type === 'pulsar') color = `rgba(200, 100, 255, ${0.6 * (1 - Math.sin(time * 5 + i) * 0.2)})`;
            else if (p.type === 'magnetar') color = `rgba(180, 220, 255, ${0.8 * (1 - Math.sin(time * 8 + i) * 0.3)})`;
            else color = `rgba(100, 200, 255, ${0.4 * (1 - Math.sin(time * 2 + i) * 0.2)})`;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = (p.type === 'pulsar' || p.type === 'magnetar' ? 1.5 : 1) / zoom;
            ctx.stroke();
          }
        }
      });
    }

    // Draw Gravity Wells
    if (showGravityWells) {
      engine.particles.forEach(p => {
        if (p.mass > 0) {
          const intensityMultiplier = p.isBlackHole ? 4 : 1;
          const rs = p.eventHorizonRadius || 0;
          const maxRadius = (p.radius * 10 + Math.log(p.mass) * 5) * intensityMultiplier;
          const numCircles = p.isBlackHole ? 30 : 10;
          
          for (let j = 1; j <= numCircles; j++) {
            const currentRadius = p.isBlackHole 
              ? rs + (maxRadius - rs) * (j / numCircles)
              : maxRadius * (j / numCircles);
              
            const alpha = (p.isBlackHole ? 0.5 : 0.2) * (1 - j / numCircles);
            ctx.beginPath();
            ctx.arc(p.x, p.y, currentRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha})`;
            ctx.lineWidth = (p.isBlackHole ? 1.5 : 1) / zoom;
            ctx.stroke();
          }
        }
      });
    }

    // Draw Particles
    engine.particles.forEach(p => {
      // Selection Indicator
      if (selectedParticleId === p.id) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 5 / zoom, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Pulse effect for selection
        const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 8 / zoom, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(0, 255, 255, ${pulse * 0.3})`;
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      }

      // Draw Magnetosphere
      const magnetosphereTypes = ['matter', 'neutron', 'magnetar', 'pulsar', 'neutron_star', 'sun', 'giant_star', 'supermassive_star', 'planet'];
      if (showMagnetospheres && magnetosphereTypes.includes(p.type) && p.mass > 1000) {
        const magRadius = p.magnetosphereRadius || (p.radius * 15);
        const gradient = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, magRadius);
        let colorStr = '0, 100, 255';
        if (p.type === 'neutron' || p.type === 'neutron_star') colorStr = '0, 200, 255';
        if (p.type === 'magnetar' || p.type === 'pulsar') colorStr = '180, 220, 255';
        if (p.type === 'sun' || p.type === 'giant_star') colorStr = '255, 200, 100';
        
        gradient.addColorStop(0, `rgba(${colorStr}, 0.25)`);
        gradient.addColorStop(0.5, `rgba(${colorStr}, 0.1)`);
        gradient.addColorStop(1, `rgba(${colorStr}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, magRadius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add a subtle border for the magnetopause
        ctx.beginPath();
        ctx.arc(p.x, p.y, magRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(${colorStr}, 0.15)`;
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
      }

      // Draw Particle
      if (p.isBlackHole) {
        // Accretion disk
        const innerRadius = (p.eventHorizonRadius || 10) * 1.2;
        const outerRadius = (p.accretionDiskRadius || 30);
        const diskGrad = ctx.createRadialGradient(p.x, p.y, innerRadius, p.x, p.y, outerRadius);
        
        if (p.type === 'quasar') {
          diskGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
          diskGrad.addColorStop(0.2, "rgba(0, 200, 255, 0.8)");
          diskGrad.addColorStop(0.6, "rgba(0, 50, 255, 0.5)");
          diskGrad.addColorStop(1, "rgba(0, 0, 100, 0.1)");
          
          // Quasar Jets
          const jetLen = p.jetRadius || 500;
          const jetWidth = p.radius * 2;
          const time = Date.now() / 1000;
          
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(time * 0.1); // Slow rotation of jets
          
          const jetGrad = ctx.createLinearGradient(0, -jetLen, 0, jetLen);
          jetGrad.addColorStop(0, "rgba(0, 0, 255, 0)");
          jetGrad.addColorStop(0.4, "rgba(0, 200, 255, 0.8)");
          jetGrad.addColorStop(0.5, "rgba(255, 255, 255, 1)");
          jetGrad.addColorStop(0.6, "rgba(0, 200, 255, 0.8)");
          jetGrad.addColorStop(1, "rgba(0, 0, 255, 0)");
          
          ctx.fillStyle = jetGrad;
          ctx.fillRect(-jetWidth/2, -jetLen, jetWidth, jetLen * 2);
          ctx.restore();
        } else {
          diskGrad.addColorStop(0, "rgba(255, 50, 0, 0.9)");
          diskGrad.addColorStop(0.5, "rgba(255, 150, 0, 0.7)");
          diskGrad.addColorStop(1, "rgba(255, 255, 0, 0.2)");
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, outerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = diskGrad;
        ctx.fill();

        // Event horizon
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.eventHorizonRadius || 10, 0, 2 * Math.PI);
        ctx.fillStyle = "black";
        ctx.fill();
      } else if (p.type === 'nebula' || p.type === 'supernova') {
        const nebulaGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        const alpha = p.type === 'supernova' ? 0.6 : 0.4;
        nebulaGrad.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha})`);
        nebulaGrad.addColorStop(0.5, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${alpha/2})`);
        nebulaGrad.addColorStop(1, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fillStyle = nebulaGrad;
        ctx.fill();
      } else if (p.type === 'comet') {
        // Find nearest star to determine tail direction
        let nearestStar = null;
        let minDist = Infinity;
        const starTypes = ['matter', 'giant_star', 'supermassive_star', 'white_dwarf', 'pulsar', 'quasar', 'magnetar'];
        
        engine.particles.forEach(other => {
          if (starTypes.includes(other.type) && other !== p) {
            const dx = other.x - p.x;
            const dy = other.y - p.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) {
              minDist = d;
              nearestStar = other;
            }
          }
        });

        // Draw tail if a star is relatively close (influence range)
        if (nearestStar && minDist < 5000) {
          const star = nearestStar as Particle;
          const dx = p.x - star.x;
          const dy = p.y - star.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ux = dx / dist;
          const uy = dy / dist;
          
          // Tail length depends on proximity to star AND comet mass
          const massFactor = 1 + Math.log10(Math.max(1, p.mass)) / 3;
          const tailLen = Math.max(0, (5000 - dist) / 100) * massFactor;
          const tailGrad = ctx.createLinearGradient(p.x, p.y, p.x + ux * tailLen, p.y + uy * tailLen);
          tailGrad.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.8)`);
          tailGrad.addColorStop(0.3, `rgba(200, 230, 255, 0.4)`);
          tailGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
          
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          const perpX = -uy * p.radius;
          const perpY = ux * p.radius;
          ctx.lineTo(p.x + perpX, p.y + perpY);
          ctx.lineTo(p.x + ux * tailLen, p.y + uy * tailLen);
          ctx.lineTo(p.x - perpX, p.y - perpY);
          ctx.closePath();
          ctx.fillStyle = tailGrad;
          ctx.fill();
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})`;
        ctx.fill();
      } else if (p.type === 'reference_point') {
        if (showReferenceTrajectory) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2 / zoom, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
          ctx.fill();
        }
      } else if (p.type === 'wormhole') {
        const time = Date.now() / 1000;
        const wormGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        wormGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
        wormGrad.addColorStop(0.7, "rgba(0, 255, 255, 0.8)");
        wormGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(time * 2);
        
        // Draw spiral pattern
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const startAngle = (i / 3) * Math.PI * 2;
          ctx.moveTo(0, 0);
          for (let a = 0; a < Math.PI * 2; a += 0.1) {
            const r = (a / (Math.PI * 2)) * p.radius;
            ctx.lineTo(Math.cos(startAngle + a) * r, Math.sin(startAngle + a) * r);
          }
        }
        ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fillStyle = wormGrad;
        ctx.fill();
      } else {
        // Add a glow for stars
        if (p.mass > 1e5 && (p.type === 'matter' || p.type === 'giant_star' || p.type === 'supermassive_star' || p.type === 'white_dwarf')) {
          const glowRadius = p.radius * (p.type === 'supermassive_star' ? 4 : 2);
          const glowGrad = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, glowRadius);
          glowGrad.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.3)`);
          glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowRadius, 0, 2 * Math.PI);
          ctx.fillStyle = glowGrad;
          ctx.fill();
        }

        const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.75, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 1)`);
        grad.addColorStop(1, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
        ctx.fillStyle = p.radius < 3 ? `#${p.color[3]}` : grad;
        ctx.fill();
      }

      // Draw Collision Flash
      if (p.collisionTimer > 0) {
        const flashRadius = p.radius * (1 + p.collisionEnergy * 10);
        const flashGrad = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, flashRadius);
        const alpha = p.collisionTimer * 0.8;
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        flashGrad.addColorStop(0.5, `rgba(255, 200, 100, ${alpha * 0.5})`);
        flashGrad.addColorStop(1, "rgba(255, 50, 0, 0)");
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, flashRadius, 0, 2 * Math.PI);
        ctx.fillStyle = flashGrad;
        ctx.fill();
        
        // Lens flare effect for high energy collisions
        if (p.collisionEnergy > 0.8) {
           ctx.beginPath();
           ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
           ctx.lineWidth = 2 / zoom;
           ctx.moveTo(p.x - flashRadius * 2, p.y);
           ctx.lineTo(p.x + flashRadius * 2, p.y);
           ctx.moveTo(p.x, p.y - flashRadius * 2);
           ctx.lineTo(p.x, p.y + flashRadius * 2);
           ctx.stroke();
        }
      }

      // Labels
      if (showNames && p.name) {
        ctx.fillStyle = "white";
        ctx.font = `${10 / zoom}px Courier New`;
        ctx.textAlign = "center";
        ctx.fillText(p.name, p.x, p.y - p.radius - 5 / zoom);
      }
      if (showMass) {
        ctx.fillStyle = "white";
        ctx.font = `${8 / zoom}px Courier New`;
        ctx.textAlign = "center";
        const massText = p.mass < 10000 ? p.mass.toFixed(0) : p.mass.toExponential(1);
        ctx.fillText(`M: ${massText}`, p.x, p.y + p.radius + (showNames ? 15 / zoom : 5 / zoom));
      }
    });

    // Draw Orbit Tracer
    if (orbitTracerEnabled && selectedParticleId) {
      const p = engine.particles.find(p => p.id === selectedParticleId);
      if (p) {
        const result = engine.projectOrbit(p, 1200);
        const projection = result.path;
        
        if (projection.length > 0) {
          ctx.beginPath();
          ctx.setLineDash([5 / zoom, 5 / zoom]);
          ctx.moveTo(p.x, p.y);
          projection.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.strokeStyle = "rgba(168, 85, 247, 0.6)";
          ctx.lineWidth = 1.5 / zoom;
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw Markers
          projection.forEach((pt, idx) => {
            // Time markers every 100 units of simulation time
            if (Math.floor(pt.time / 100) > Math.floor((projection[idx-1]?.time || 0) / 100)) {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 3 / zoom, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
              ctx.fill();
              ctx.font = `${8 / zoom}px Courier New`;
              ctx.fillText(`T+${Math.floor(pt.time)}`, pt.x + 5 / zoom, pt.y);
            }

            if (pt.isPeriapsis) {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 5 / zoom, 0, 2 * Math.PI);
              ctx.strokeStyle = "#00ffcc";
              ctx.lineWidth = 2 / zoom;
              ctx.stroke();
              ctx.fillStyle = "#00ffcc";
              ctx.font = `bold ${10 / zoom}px Courier New`;
              ctx.fillText("PERIAPSIS", pt.x + 8 / zoom, pt.y - 8 / zoom);
            }

            if (pt.collided) {
              ctx.beginPath();
              ctx.moveTo(pt.x - 10 / zoom, pt.y - 10 / zoom);
              ctx.lineTo(pt.x + 10 / zoom, pt.y + 10 / zoom);
              ctx.moveTo(pt.x + 10 / zoom, pt.y - 10 / zoom);
              ctx.lineTo(pt.x - 10 / zoom, pt.y + 10 / zoom);
              ctx.strokeStyle = "#ff3333";
              ctx.lineWidth = 3 / zoom;
              ctx.stroke();
              ctx.fillStyle = "#ff3333";
              ctx.font = `bold ${12 / zoom}px Courier New`;
              ctx.fillText("IMPACT", pt.x + 15 / zoom, pt.y);
            }
          });

          // Display Telemetry for Tracer
          const dominant = engine.getDominantSource(p);
          if (dominant) {
            const dx = p.x - dominant.x;
            const dy = p.y - dominant.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            
            ctx.fillStyle = "rgba(168, 85, 247, 0.9)";
            ctx.font = `${10 / zoom}px Courier New`;
            ctx.textAlign = "left";
            let yOffset = -40 / zoom;
            ctx.fillText(`TRACER DATA [${p.name}]`, p.x + 15 / zoom, p.y + yOffset); yOffset += 12 / zoom;
            ctx.fillText(`Rel to: ${dominant.name}`, p.x + 15 / zoom, p.y + yOffset); yOffset += 12 / zoom;
            ctx.fillText(`Dist: ${dist.toFixed(2)}`, p.x + 15 / zoom, p.y + yOffset); yOffset += 12 / zoom;
            ctx.fillText(`Vel: ${vel.toFixed(4)}`, p.x + 15 / zoom, p.y + yOffset); yOffset += 12 / zoom;
            
            if (result.periapsis) {
              ctx.fillStyle = "#00ffcc";
              ctx.fillText(`Next Periapsis: ${result.periapsis.dist.toFixed(2)}`, p.x + 15 / zoom, p.y + yOffset); yOffset += 12 / zoom;
            }
          }
        }
      }
    }

    // Draw Lagrange Points
    if (showLagrange && selectedParticleId) {
      const p2 = engine.particles.find(p => p.id === selectedParticleId);
      if (p2) {
        const p1 = engine.getDominantSource(p2);
        if (p1) {
          const points = engine.getLagrangePoints(p1, p2);
          Object.entries(points).forEach(([name, pos]) => {
            const p = pos as { x: number, y: number, vx: number, vy: number };
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3 / zoom, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(255, 255, 0, 0.8)";
            ctx.fill();
            
            ctx.fillStyle = "white";
            ctx.font = `${8 / zoom}px Courier New`;
            ctx.textAlign = "center";
            ctx.fillText(name, p.x, p.y - 5 / zoom);
            
            // Draw crosshair for Lagrange point
            ctx.beginPath();
            ctx.moveTo(p.x - 5 / zoom, p.y);
            ctx.lineTo(p.x + 5 / zoom, p.y);
            ctx.moveTo(p.x, p.y - 5 / zoom);
            ctx.lineTo(p.x, p.y + 5 / zoom);
            ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();
          });
        }
      }
    }

    // Draw Hill Spheres
    if (engine.particles.length >= 2) {
      engine.particles.forEach(p => {
        if (p.mass <= 0 || p.isBlackHole) return;
        
        // Show if global toggle is on OR if this specific particle has it enabled
        if (!showHillSpheres && !p.showHillSphere) return;

        // Find the most dominant gravitational source for this particle
        let dominantOther = null;
        let maxForceFactor = -1;

        engine.particles.forEach(other => {
          if (other === p || other.mass <= p.mass) return;
          
          const dx = other.x - p.x;
          const dy = other.y - p.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 1) return;

          // Force factor M/r^2 (G and m are constant for p)
          const forceFactor = other.mass / distSq;
          if (forceFactor > maxForceFactor) {
            maxForceFactor = forceFactor;
            dominantOther = other;
          }
        });

        if (dominantOther) {
          const dx = dominantOther.x - p.x;
          const dy = dominantOther.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Hill radius formula: r_H = a * (m / 3M)^(1/3)
          const hillRadius = dist * Math.pow(p.mass / (3 * dominantOther.mass), 1/3);
          
          if (hillRadius > p.radius) {
            // Draw Hill Sphere with a subtle fill to identify influence
            ctx.beginPath();
            ctx.arc(p.x, p.y, hillRadius, 0, 2 * Math.PI);
            
            // Fill
            const fillGrad = ctx.createRadialGradient(p.x, p.y, p.radius, p.x, p.y, hillRadius);
            fillGrad.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.05)`);
            fillGrad.addColorStop(1, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0)`);
            ctx.fillStyle = fillGrad;
            ctx.fill();

            // Stroke
            ctx.strokeStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.3)`;
            ctx.setLineDash([5 / zoom, 5 / zoom]);
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();
            ctx.setLineDash([]);

            // Label Hill Sphere
            if (zoom > 0.5) {
              ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
              ctx.font = `${8 / zoom}px Courier New`;
              ctx.textAlign = "center";
              ctx.fillText("Hill Sphere", p.x, p.y + hillRadius + 10 / zoom);
            }
          }
        }
      });
    }

    // Draw Gravitational Influence Circles
    if (showGravityInfluence) {
      engine.particles.forEach(p => {
        if (p.mass <= 0 || p.type === 'nebula' || p.type === 'wormhole') return;
        
        // Influence radius based on a threshold acceleration
        // a = GM/r^2 => r = sqrt(GM/a_limit)
        const aLimit = 0.005;
        const influenceRadius = Math.sqrt((G * p.mass) / aLimit);
        
        if (influenceRadius > p.radius) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, influenceRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.1)`;
          ctx.setLineDash([2 / zoom, 4 / zoom]);
          ctx.lineWidth = 0.5 / zoom;
          ctx.stroke();
          ctx.setLineDash([]);
          
          if (zoom > 0.2) {
            ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, 0.3)`;
            ctx.font = `${7 / zoom}px Courier New`;
            ctx.textAlign = "center";
            ctx.fillText("Gravity Reach", p.x, p.y - influenceRadius - 5 / zoom);
          }
        }
      });
    }

    // Draw Planned Orbits (Orbit Planner)
    plannedOrbits.forEach((orb, idx) => {
      const ghost = new Particle(newMass, orb.x, orb.y, orb.vx, orb.vy, 'spacecraft', 'Ghost');
      const result = engine.projectOrbit(ghost, 1500);
      const projection = result.path;
      
      if (projection.length > 0) {
        ctx.beginPath();
        ctx.setLineDash([3 / zoom, 6 / zoom]);
        ctx.moveTo(orb.x, orb.y);
        projection.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.strokeStyle = orb.color + "88"; // Semi-transparent
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw small X at start
        ctx.beginPath();
        ctx.moveTo(orb.x - 5 / zoom, orb.y - 5 / zoom);
        ctx.lineTo(orb.x + 5 / zoom, orb.y + 5 / zoom);
        ctx.moveTo(orb.x + 5 / zoom, orb.y - 5 / zoom);
        ctx.lineTo(orb.x - 5 / zoom, orb.y + 5 / zoom);
        ctx.strokeStyle = orb.color;
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();
      }
    });

    // Draw Drag Line
    if (isDraggingRef.current && !isPanningRef.current && !rulerEnabled) {
      const start = dragStartRef.current;
      const end = dragEndRef.current;
      const wStart = { x: (start.x - pan.x) / zoom, y: (start.y - pan.y) / zoom };
      const wEnd = { x: (end.x - pan.x) / zoom, y: (end.y - pan.y) / zoom };
      
      // Orbit Preview during drag
      if (orbitTracerEnabled || orbitPlannerEnabled) {
        const vx = (wEnd.x - wStart.x);
        const vy = (wEnd.y - wStart.y);
        const ghost = new Particle(newMass, wStart.x, wStart.y, vx, vy, 'spacecraft', 'Ghost');
        const result = engine.projectOrbit(ghost, 1000);
        const projection = result.path;
        
        if (projection.length > 0) {
          ctx.beginPath();
          ctx.setLineDash([4 / zoom, 4 / zoom]);
          ctx.moveTo(wStart.x, wStart.y);
          projection.forEach(pt => ctx.lineTo(pt.x, pt.y));
          ctx.strokeStyle = orbitPlannerEnabled ? "rgba(249, 115, 22, 0.5)" : "rgba(168, 85, 247, 0.5)";
          ctx.lineWidth = 1.5 / zoom;
          ctx.stroke();
          ctx.setLineDash([]);

          if (orbitPlannerEnabled && result.periapsis) {
            ctx.fillStyle = "#00ffcc";
            ctx.font = `bold ${12 / zoom}px Courier New`;
            ctx.fillText(`Est. Periapsis: ${result.periapsis.dist.toFixed(2)}`, wEnd.x + 10 / zoom, wEnd.y + 20 / zoom);
          }
        }
      }

      ctx.beginPath();
      ctx.moveTo(wStart.x, wStart.y);
      ctx.lineTo(wEnd.x, wEnd.y);
      ctx.strokeStyle = accessibilityMode ? "rgba(0, 150, 255, 1)" : "blue";
      ctx.lineWidth = (accessibilityMode ? 3 : 2) / zoom;
      ctx.stroke();

      if (accessibilityMode) {
        // Draw circle at start point
        ctx.beginPath();
        ctx.arc(wStart.x, wStart.y, 10 / zoom, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
        ctx.lineWidth = 2 / zoom;
        ctx.stroke();

        // Draw velocity info at end point
        const vx = (wEnd.x - wStart.x);
        const vy = (wEnd.y - wStart.y);
        const speed = Math.sqrt(vx*vx + vy*vy);
        
        // Convert to km/h
        // 1 AU = 149,597,870.7 km
        const speedKmH = speed * (149597870.7 / AU_IN_SIM_UNITS) * 3600;
        
        ctx.fillStyle = "cyan";
        ctx.font = `bold ${14 / zoom}px Courier New`;
        ctx.textAlign = "left";
        ctx.fillText(`V: ${speedKmH.toLocaleString(undefined, {maximumFractionDigits: 0})} km/h (${(speedKmH / 3600).toLocaleString(undefined, {maximumFractionDigits: 2})} km/s)`, wEnd.x + 10 / zoom, wEnd.y);
        
        // Draw a small circle at end point to guide
        ctx.beginPath();
        ctx.arc(wEnd.x, wEnd.y, 5 / zoom, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
        ctx.fill();
      }
    }

    // Draw Ruler
    const allRulerLines = [...rulerMeasurements];
    if (rulerPoints.length > 0) {
      const p1 = rulerPoints[0];
      let p2 = rulerPoints[1];
      if (!p2 && rulerEnabled) {
         p2 = { x: (mousePosRef.current.x - pan.x) / zoom, y: (mousePosRef.current.y - pan.y) / zoom };
      }
      if (p2) {
        allRulerLines.push({ p1, p2, color: rulerColor });
      }
    }

    allRulerLines.forEach(m => {
      const { p1, p2, color } = m;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Calculate distance
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const simDist = Math.sqrt(dx*dx + dy*dy);
      const auDist = simDist / AU_IN_SIM_UNITS;
      
      let displayDist = 0;
      let unitLabel = "";
      
      switch (rulerUnit) {
        case 'km': displayDist = auDist * 149597870.7; unitLabel = "km"; break;
        case 'mi': displayDist = auDist * 92955807.3; unitLabel = "mi"; break;
        case 'AU': displayDist = auDist; unitLabel = "AU"; break;
        case 'ly': displayDist = auDist / 63241.077; unitLabel = "ly"; break;
      }
      
      // Calculate Angle
      const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
      
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      
      ctx.fillStyle = color;
      ctx.font = `${12 / zoom}px Courier New`;
      ctx.textAlign = "center";
      const distText = `${displayDist.toLocaleString(undefined, {maximumFractionDigits: 4})} ${unitLabel}`;
      const angleText = `${angleDeg.toFixed(1)}°`;
      ctx.fillText(`${distText} | ${angleText}`, midX, midY - 10 / zoom);
    });
    } finally {
      ctx.restore();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragEndRef.current = { x: e.clientX, y: e.clientY };
    isPanningRef.current = e.shiftKey;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    if (!isDraggingRef.current) return;
    dragEndRef.current = { x: e.clientX, y: e.clientY };
    
    if (isPanningRef.current) {
      setFollowSelected(false);
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const hexToColor = (hex: string): Color => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { 0: r, 1: g, 2: b, 3: hex.slice(1) };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const start = dragStartRef.current;
    const end = dragEndRef.current;
    const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

    if (rulerEnabled && dist < 5) {
      const wPos = { x: (e.clientX - pan.x) / zoom, y: (e.clientY - pan.y) / zoom };
      setRulerPoints(prev => {
        if (prev.length === 0) return [wPos];
        if (prev.length === 1) {
          setRulerEnabled(false);
          setRulerMeasurements(m => [...m, { p1: prev[0], p2: wPos, color: rulerColor }]);
          return [];
        }
        return [wPos];
      });
      isDraggingRef.current = false;
      isPanningRef.current = false;
      return;
    }

    if (!isPanningRef.current && !rulerEnabled) {
      const start = dragStartRef.current;
      const end = dragEndRef.current;
      const wStart = { x: (start.x - pan.x) / zoom, y: (start.y - pan.y) / zoom };
      const wEnd = { x: (end.x - pan.x) / zoom, y: (end.y - pan.y) / zoom };
      
      const vx = (wEnd.x - wStart.x);
      const vy = (wEnd.y - wStart.y);
      
      const p = new Particle(newMass, wStart.x, wStart.y, vx, vy, particleType, particleName, newDensity, hexToColor(newColor), newDiameter);
      engine.addParticle(p);

      if (orbitPlannerEnabled) {
        setPlannedOrbits(prev => [...prev, { x: wStart.x, y: wStart.y, vx, vy, color: newColor }]);
      }
    }
    
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    isDraggingRef.current = true;
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    dragEndRef.current = { x: touch.clientX, y: touch.clientY };
    isPanningRef.current = e.touches.length > 1; // Multi-touch for panning
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    mousePosRef.current = { x: touch.clientX, y: touch.clientY };
    if (!isDraggingRef.current) return;
    dragEndRef.current = { x: touch.clientX, y: touch.clientY };
    
    if (isPanningRef.current) {
      setFollowSelected(false);
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    handleMouseUp({ 
      clientX: dragEndRef.current.x, 
      clientY: dragEndRef.current.y,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);
  };

  const handleWheel = (e: React.WheelEvent) => {
    setFollowSelected(false);
    const scaleFactor = 1.1;
    const delta = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;
    handleZoom(delta, e.clientX, e.clientY);
  };

  // Preset Generators
  const generateRandomSystem = () => {
    engine.clear();
    const cx = (window.innerWidth / 2 - pan.x) / zoom;
    const cy = (window.innerHeight / 2 - pan.y) / zoom;
    
    // 1. Choose an Exotic Core
    const coreRoll = Math.random();
    let coreKey = 'sun';
    if (coreRoll > 0.95) coreKey = 'quasar';
    else if (coreRoll > 0.85) coreKey = 'black_hole';
    else if (coreRoll > 0.75) coreKey = 'magnetar';
    else if (coreRoll > 0.65) coreKey = 'pulsar';
    else if (coreRoll > 0.55) coreKey = 'neutron_star';
    else if (coreRoll > 0.45) coreKey = 'supermassive_star';
    else if (coreRoll > 0.35) coreKey = 'blue_giant';
    else if (coreRoll > 0.25) coreKey = 'white_dwarf';
    
    const corePreset = STAR_PRESETS[coreKey];
    const core = new Particle(
      corePreset.mass, 
      cx, cy, 0, 0, 
      corePreset.type, 
      corePreset.name, 
      corePreset.density, 
      hexToColor(corePreset.color),
      corePreset.diameter
    );
    engine.addParticle(core);

    // 2. Determine System Stability/Chaos
    const isChaotic = Math.random() > 0.7;
    const systemScale = 30 + Math.random() * 50;
    const numOrbiters = 8 + Math.floor(Math.random() * 20);

    // 3. Generate Diverse Orbiters
    for (let i = 0; i < numOrbiters; i++) {
      const dist = (500 + i * 600 + Math.random() * 400) * systemScale;
      const angle = Math.random() * Math.PI * 2;
      const x = cx + dist * Math.cos(angle);
      const y = cy + dist * Math.sin(angle);
      
      // Calculate base orbital speed
      let speed = Math.sqrt((G * core.mass) / dist);
      
      // Apply Chaos Factor
      if (isChaotic) {
        // Randomly perturb speed for elliptical or unstable orbits
        speed *= (0.6 + Math.random() * 0.8);
      } else {
        // Slight variation for natural look
        speed *= (0.98 + Math.random() * 0.04);
      }

      const vx = -speed * Math.sin(angle);
      const vy = speed * Math.cos(angle);

      // Choose Orbiter Type from Presets
      const orbiterKeys = Object.keys(STAR_PRESETS).filter(k => 
        !['quasar', 'black_hole', 'wormhole', 'supermassive_star'].includes(k)
      );
      const orbiterKey = orbiterKeys[Math.floor(Math.random() * orbiterKeys.length)];
      const orbiterPreset = STAR_PRESETS[orbiterKey];

      // Scale mass down for orbiters if they are stars themselves (except for binary-like systems)
      let orbiterMass = orbiterPreset.mass;
      if (orbiterPreset.type.includes('star') || orbiterPreset.type === 'neutron' || orbiterPreset.type === 'pulsar') {
        if (Math.random() > 0.2) orbiterMass *= 0.01; // Most aren't full binary companions
      }

      const orbiter = new Particle(
        orbiterMass,
        x, y, vx, vy,
        orbiterPreset.type,
        orbiterPreset.name,
        orbiterPreset.density,
        hexToColor(orbiterPreset.color),
        orbiterPreset.diameter
      );
      engine.addParticle(orbiter);

      // 4. Add Moons or Rings to some orbiters
      if (orbiterPreset.type === 'planet' && Math.random() > 0.5) {
        const numMoons = Math.floor(Math.random() * 4);
        for (let j = 0; j < numMoons; j++) {
          const mDist = 40 + j * 25 + Math.random() * 20;
          const mAngle = Math.random() * Math.PI * 2;
          const mx = x + mDist * Math.cos(mAngle);
          const my = y + mDist * Math.sin(mAngle);
          const mSpeed = Math.sqrt((G * orbiter.mass) / mDist);
          const mvx = vx - mSpeed * Math.sin(mAngle);
          const mvy = vy + mSpeed * Math.cos(mAngle);
          
          const moon = new Particle(
            orbiter.mass * 0.01,
            mx, my, mvx, mvy,
            'planet',
            `Moon ${i}-${j}`,
            3,
            { 0: 200, 1: 200, 2: 200 }
          );
          engine.addParticle(moon);
        }
      }
    }

    // 5. Add Asteroid Belts or Nebula Clouds
    const numBelts = 1 + Math.floor(Math.random() * 3);
    for (let b = 0; b < numBelts; b++) {
      const beltDist = (2000 + b * 4000 + Math.random() * 2000) * systemScale;
      const numDebris = 50 + Math.floor(Math.random() * 100);
      for (let i = 0; i < numDebris; i++) {
        const dist = beltDist + (Math.random() - 0.5) * 800 * systemScale;
        const angle = Math.random() * Math.PI * 2;
        const x = cx + dist * Math.cos(angle);
        const y = cy + dist * Math.sin(angle);
        const speed = Math.sqrt((G * core.mass) / dist) * (0.95 + Math.random() * 0.1);
        const vx = -speed * Math.sin(angle);
        const vy = speed * Math.cos(angle);
        
        const dType: ParticleType = Math.random() > 0.8 ? 'comet' : (Math.random() > 0.4 ? 'asteroid' : 'dark');
        const debris = new Particle((0.01 + Math.random() * 0.5) * 1.98847e23, x, y, vx, vy, dType, '', 5, undefined, undefined);
        engine.addParticle(debris);
      }
    }

    // 6. Background Nebula
    const numNebula = 20 + Math.floor(Math.random() * 30);
    for (let i = 0; i < numNebula; i++) {
      const nDist = Math.random() * 20000 * systemScale;
      const nAngle = Math.random() * Math.PI * 2;
      const nx = cx + nDist * Math.cos(nAngle);
      const ny = cy + nDist * Math.sin(nAngle);
      const nSpeed = Math.sqrt((G * core.mass) / nDist) * 0.3;
      const nvx = -nSpeed * Math.sin(nAngle);
      const nvy = nSpeed * Math.cos(nAngle);
      engine.addParticle(new Particle(5000 * 1.98847e23, nx, ny, nvx, nvy, 'nebula', '', 0.001, { 
        0: Math.floor(Math.random() * 100 + 50), 
        1: Math.floor(Math.random() * 50), 
        2: Math.floor(Math.random() * 150 + 100) 
      }, 1000000000));
    }

    setZoom(0.002);
    setFollowSelected(false);
  };

  const generateGalaxy = () => {
    const centerX = (window.innerWidth / 2 - pan.x) / zoom;
    const centerY = (window.innerHeight / 2 - pan.y) / zoom;
    
    // Random Galaxy Flavor
    const flavors = ['Standard', 'Antimatter', 'Chaotic', 'DarkMatter'] as const;
    const flavor = flavors[Math.floor(Math.random() * flavors.length)];
    
    // Core: Supermassive Black Hole or Exotic Nucleus
    let coreMass = 6.5e9 * 1.989e30; 
    let coreType: ParticleType = Math.random() > 0.5 ? 'quasar' : 'blackhole';
    let coreName = coreType === 'quasar' ? 'Galactic Nucleus (M87*)' : 'Supermassive Black Hole';
    let coreColor: Color = coreType === 'quasar' ? { 0: 255, 1: 255, 2: 255 } : { 0: 20, 1: 20, 2: 20 };

    if (flavor === 'Antimatter') {
      coreType = 'antimatter';
      coreName = 'Antimatter Void';
      coreColor = { 0: 100, 1: 50, 2: 255 };
    } else if (flavor === 'Chaotic') {
      coreType = 'blackhole';
      coreName = 'Chaotic Singularity';
      coreColor = { 0: 50, 1: 0, 2: 50 };
    } else if (flavor === 'DarkMatter') {
      coreType = 'dark';
      coreName = 'Dark Halo Core';
      coreColor = { 0: 30, 1: 30, 2: 40 };
    }

    const core = new Particle(coreMass, centerX, centerY, 0, 0, coreType, coreName, 1e12, coreColor, 38000000000);
    engine.addParticle(core);

    const numStars = 600; 
    const numArms = flavor === 'Chaotic' ? 1 : 4;
    const galaxyRadius = 4500;
    
    // Use the event horizon radius from the core for the Paczyński–Wiita potential
    const Rs = core.eventHorizonRadius || 0;

    for (let i = 0; i < numStars; i++) {
      const arm = i % numArms;
      const baseAngle = (arm / numArms) * Math.PI * 2;
      
      // Distribution: Bulge + Disk
      const isBulge = Math.random() > 0.7;
      const distance = isBulge 
        ? 100 + Math.random() * 800 
        : 800 + Math.pow(Math.random(), 1.2) * (galaxyRadius - 800);

      const spiralTightness = flavor === 'Chaotic' ? 0.8 : 4.5;
      const spiralAngle = baseAngle + (distance / 600) * spiralTightness + (Math.random() - 0.5) * 0.4;
      
      const x = centerX + distance * Math.cos(spiralAngle);
      const y = centerY + distance * Math.sin(spiralAngle);
      
      const simCoreMass = coreMass * (1e7 / 1.989e30);
      
      // Paczyński–Wiita orbital velocity: v = sqrt(GM*r) / (r - Rs)
      // We add a small epsilon to distance to prevent singularity
      const effectiveDist = Math.max(distance, Rs * 1.5 + 20);
      let orbitalSpeed = Math.sqrt(G * simCoreMass * effectiveDist) / (effectiveDist - Rs);
      
      // Add a tiny bit of random dispersion for stability (prevents perfect resonance)
      orbitalSpeed *= (0.99 + Math.random() * 0.02);

      // Retrograde orbits for some stars in Chaotic flavor
      const isRetrograde = flavor === 'Chaotic' && Math.random() > 0.8;
      const dir = isRetrograde ? -1 : 1;
      
      const vx = -dir * orbitalSpeed * Math.sin(spiralAngle);
      const vy = dir * orbitalSpeed * Math.cos(spiralAngle);
      
      let type: ParticleType = 'matter';
      let mass = 1.989e30 * (0.1 + Math.random() * 2);
      let name = isRetrograde ? 'Retro Star' : 'Star';
      let density = 1.41;
      let diameter = 1392700;
      let color: Color = { 0: 255, 1: 255, 2: 255 };

      if (flavor === 'Antimatter') {
        type = 'antimatter';
        color = { 0: 150, 1: 100, 2: 255 };
      } else if (flavor === 'DarkMatter' && Math.random() > 0.5) {
        type = 'dark';
        color = { 0: 50, 1: 50, 2: 70 };
      } else {
        // Diverse selection for Standard and others
        const rand = Math.random();
        if (distance < 600) {
          // Bulge: Older, redder stars
          if (rand > 0.4) {
            type = 'red_dwarf';
            color = { 0: 255, 1: 100, 2: 50 };
            name = 'Old Dwarf';
          } else if (rand > 0.1) {
            type = 'white_dwarf';
            color = { 0: 200, 1: 230, 2: 255 };
            name = 'White Dwarf';
          } else {
            type = 'neutron_star';
            color = { 0: 150, 1: 200, 2: 255 };
            name = 'Neutron Star';
          }
        } else {
          // Arms: Younger, more diverse
          if (rand > 0.95) {
            type = 'blue_giant';
            mass = 1.989e30 * (15 + Math.random() * 60);
            color = { 0: 100, 1: 200, 2: 255 };
            density = 0.05;
            diameter = 8000000;
            name = 'Young Giant';
          } else if (rand > 0.92) {
            type = 'pulsar';
            mass = 1.989e30 * 1.4;
            color = { 0: 255, 1: 255, 2: 255 };
            name = 'Pulsar';
          } else if (rand > 0.89) {
            type = 'magnetar';
            mass = 1.989e30 * 1.5;
            color = { 0: 255, 1: 150, 2: 255 };
            name = 'Magnetar';
          } else if (rand > 0.85) {
            type = 'planet';
            mass = 5.972e24 * (1 + Math.random() * 300); // Earth to Jupiter mass
            color = { 0: 100, 1: 150, 2: 200 };
            name = 'Exoplanet';
          } else if (rand > 0.82) {
            type = 'asteroid';
            mass = 1e18 * (1 + Math.random() * 1000);
            color = { 0: 150, 1: 150, 2: 150 };
            name = 'Asteroid';
          } else if (rand > 0.80) {
            type = 'comet';
            mass = 1e15;
            color = { 0: 200, 1: 230, 2: 255 };
            name = 'Comet';
          } else if (rand > 0.75) {
            type = 'giant_star';
            mass = 5 * 1.989e30;
            color = { 0: 255, 1: 150, 2: 100 };
            name = 'Red Giant';
          } else {
            type = 'sun';
            mass = 1.989e30;
            color = { 0: 255, 1: 255, 2: 200 };
            name = 'Yellow Star';
          }
        }
      }

      engine.addParticle(new Particle(mass, x, y, vx, vy, type, name, density, color, diameter));
    }
    
    // Add some random Nebulae
    for (let i = 0; i < 15; i++) {
      const dist = 500 + Math.random() * galaxyRadius;
      const ang = Math.random() * Math.PI * 2;
      engine.addParticle(new Particle(1e32, centerX + dist * Math.cos(ang), centerY + dist * Math.sin(ang), 0, 0, 'nebula', 'Gas Cloud', 0.0001, {0:255,1:100,2:255}, 1e8));
    }
  };

  const generateSolarSystem = () => {
    engine.clear();
    setSimulationTime(0);
    startDateRef.current = new Date();
    const cx = (window.innerWidth / 2 - pan.x) / zoom;
    const cy = (window.innerHeight / 2 - pan.y) / zoom;

    // Solar mass as base: 1.989e30 kg
    const sunPreset = STAR_PRESETS['sun'];
    const sun = new Particle(
      sunPreset.mass, 
      cx, cy, 0, 0, 
      sunPreset.type, 
      sunPreset.name, 
      sunPreset.density, 
      hexToColor(sunPreset.color),
      sunPreset.diameter
    );
    engine.addParticle(sun);

    // 1 AU based on simulation constants for consistency with scale bar
    const au = AU_IN_SIM_UNITS;
    
    const planets = [
      { key: 'mercury', dist: 0.387 * au },
      { key: 'venus', dist: 0.723 * au },
      { key: 'earth', dist: 1.000 * au, moons: [{ key: 'moon', dist: 42 }] },
      { key: 'mars', dist: 1.524 * au, moons: [{ key: 'phobos', dist: 5 }, { key: 'deimos', dist: 8 }] },
      { key: 'jupiter', dist: 5.203 * au, moons: [{ key: 'io', dist: 46 }, { key: 'europa', dist: 72 }, { key: 'ganymede', dist: 117 }, { key: 'callisto', dist: 206 }] },
      { key: 'saturn', dist: 9.537 * au, moons: [{ key: 'titan', dist: 132 }] },
      { key: 'uranus', dist: 19.191 * au, moons: [] },
      { key: 'neptune', dist: 30.069 * au, moons: [{ key: 'triton', dist: 38 }] },
      { key: 'pluto', dist: 39.482 * au, moons: [{ key: 'charon', dist: 10 }] },
    ];

    planets.forEach(pData => {
      const p = STAR_PRESETS[pData.key];
      const angle = Math.random() * Math.PI * 2;
      const x = cx + pData.dist * Math.cos(angle);
      const y = cy + pData.dist * Math.sin(angle);
      const speed = Math.sqrt((G * sun.mass) / pData.dist);
      const vx = -speed * Math.sin(angle);
      const vy = speed * Math.cos(angle);
      const planet = new Particle(p.mass, x, y, vx, vy, p.type, p.name, p.density, hexToColor(p.color), p.diameter);
      engine.addParticle(planet);

      // Add Moons
      if (pData.moons) {
        pData.moons.forEach(mData => {
          const m = STAR_PRESETS[mData.key];
          const mAngle = Math.random() * Math.PI * 2;
          const mx = x + mData.dist * Math.cos(mAngle);
          const my = y + mData.dist * Math.sin(mAngle);
          const mSpeed = Math.sqrt((G * planet.mass) / mData.dist);
          const mvx = vx - mSpeed * Math.sin(mAngle);
          const mvy = vy + mSpeed * Math.cos(mAngle);
          const moon = new Particle(m.mass, mx, my, mvx, mvy, m.type, m.name, m.density, hexToColor(m.color), m.diameter);
          engine.addParticle(moon);
        });
      }
    });

    // Asteroid Belt (between Mars and Jupiter)
    const asteroidPreset = STAR_PRESETS['asteroid'];
    for (let i = 0; i < 300; i++) {
      const dist = (2.2 + Math.random() * 1.0) * au;
      const angle = Math.random() * Math.PI * 2;
      const x = cx + dist * Math.cos(angle);
      const y = cy + dist * Math.sin(angle);
      const speed = Math.sqrt((G * sun.mass) / dist) * (0.98 + Math.random() * 0.04);
      const vx = -speed * Math.sin(angle);
      const vy = speed * Math.cos(angle);
      const asteroid = new Particle(
        asteroidPreset.mass * (0.5 + Math.random()), 
        x, y, vx, vy, 
        asteroidPreset.type, 
        '', 
        asteroidPreset.density, 
        hexToColor(asteroidPreset.color),
        asteroidPreset.diameter * (0.5 + Math.random())
      );
      engine.addParticle(asteroid);
    }

    // Adjust view to see the inner planets
    setZoom(0.01);
    setPan({ x: window.innerWidth / 2 - cx * 0.01, y: window.innerHeight / 2 - cy * 0.01 });
  };

  const generateBinary = () => {
    const cx = (window.innerWidth / 2 - pan.x) / zoom;
    const cy = (window.innerHeight / 2 - pan.y) / zoom;
    engine.runExperiment('binary_system_chaos', cx, cy);
  };

  const generateFigureAndOrbit = () => {
    const cx = (window.innerWidth / 2 - pan.x) / zoom;
    const cy = (window.innerHeight / 2 - pan.y) / zoom;
    
    const flavors = ['Figure8', 'Chaotic', 'Exotic', 'Butterfly'] as const;
    const flavor = flavors[Math.floor(Math.random() * flavors.length)];

    if (flavor === 'Figure8' || flavor === 'Exotic') {
      // The "Figure-8" 3-Body Solution
      const m = 5 * 1.989e30; 
      const simM = m * (1e7 / 1.989e30);
      
      const x1 = 0.97000436;
      const y1 = -0.24308753;
      const vx1 = 0.466203685;
      const vy1 = 0.43236573;
      
      const scale = 200;
      const vScale = Math.sqrt((G * simM) / scale);

      const type3 = flavor === 'Exotic' ? 'antimatter' : 'matter';
      const name3 = flavor === 'Exotic' ? 'Anti-Gamma' : 'Gamma';
      const color3 = flavor === 'Exotic' ? {0:100,1:50,2:255} : {0:255,1:215,2:0};

      engine.addParticle(new Particle(m, cx + x1 * scale, cy + y1 * scale, vx1 * vScale, vy1 * vScale, 'supermassive_star', 'Alpha', 0.1, {0:100,1:200,2:255}, 5000000));
      engine.addParticle(new Particle(m, cx - x1 * scale, cy - y1 * scale, vx1 * vScale, vy1 * vScale, 'giant_star', 'Beta', 0.001, {0:255,1:100,2:50}, 100000000));
      engine.addParticle(new Particle(m, cx, cy, -2 * vx1 * vScale, -2 * vy1 * vScale, type3, name3, 1.41, color3, 1392700));
    } else if (flavor === 'Butterfly') {
      // Butterfly 3-Body Solution (Another stable periodic orbit)
      const m = 10 * 1.989e30;
      const simM = m * (1e7 / 1.989e30);
      const scale = 150;
      const vScale = Math.sqrt((G * simM) / scale);

      // Approximate Butterfly conditions
      const x1 = 1.0; const y1 = 0.0;
      const vx1 = 0.30689; const vy1 = 0.125501;

      engine.addParticle(new Particle(m, cx + x1 * scale, cy + y1 * scale, vx1 * vScale, vy1 * vScale, 'neutron', 'Butterfly A', 5000, {0:180,1:220,2:255}, 20));
      engine.addParticle(new Particle(m, cx - x1 * scale, cy - y1 * scale, vx1 * vScale, vy1 * vScale, 'neutron', 'Butterfly B', 5000, {0:180,1:220,2:255}, 20));
      engine.addParticle(new Particle(m, cx, cy, -2 * vx1 * vScale, -2 * vy1 * vScale, 'pulsar', 'Butterfly C', 5000, {0:255,1:255,2:255}, 20));
    } else {
      // Chaotic 3-Body
      for (let i = 0; i < 3; i++) {
        const dist = 300;
        const ang = (i / 3) * Math.PI * 2;
        const m = (5 + Math.random() * 15) * 1.989e30;
        const simM = m * (1e7 / 1.989e30);
        const v = Math.sqrt((G * simM) / dist) * 0.5;
        engine.addParticle(new Particle(m, cx + dist * Math.cos(ang), cy + dist * Math.sin(ang), -v * Math.sin(ang), v * Math.cos(ang), 'blackhole', `Chaos ${i+1}`, 10000, {0:20,1:20,2:20}, 30));
      }
    }

    // Add some "Orbiters" (planets) far away to see the complex gravity field
    for (let i = 0; i < 8; i++) {
      const dist = 1500 + Math.random() * 2000;
      const angle = Math.random() * Math.PI * 2;
      const isRetro = Math.random() > 0.5;
      const dir = isRetro ? -1 : 1;
      const orbitalSpeed = Math.sqrt((G * 1e8 * 3) / dist); // Approx speed
      engine.addParticle(new Particle(5.972e24, cx + dist * Math.cos(angle), cy + dist * Math.sin(angle), -dir * orbitalSpeed * Math.sin(angle), dir * orbitalSpeed * Math.cos(angle), 'planet', isRetro ? 'Retro Planet' : 'Planet', 5.51, {0:100,1:150,2:255}, 12742));
    }

    setZoom(0.001);
    setFollowSelected(false);
  };

  const handleExperimentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      const cx = (window.innerWidth / 2 - pan.x) / zoom;
      const cy = (window.innerHeight / 2 - pan.y) / zoom;
      engine.runExperiment(id, cx, cy);
      // Reset selector so the same experiment can be added again
      setSelectedExperiment('');
    }
  };

  const handleScenarioSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id) {
      engine.clear();
      setSimulationTime(0);
      startDateRef.current = new Date();
      const cx = (window.innerWidth / 2 - pan.x) / zoom;
      const cy = (window.innerHeight / 2 - pan.y) / zoom;
      engine.runExperiment(id, cx, cy);
      
      if (id === 'artemis_2') {
        setZoom(3);
        setPan({ x: window.innerWidth / 2 - cx * 3, y: window.innerHeight / 2 - cy * 3 });
        setShowMobileControls(true);
        const newH = 0.014; // 7x speed (0.002 * 7)
        engine.h = newH;
        setSimSpeed(newH);
        setShowOrbits(true);
        setShowNames(true);
      }
      
      setSelectedScenario('');
    }
  };

  const cycleType = () => {
    const types: ParticleType[] = ['matter', 'antimatter', 'dark', 'blackhole', 'planet', 'comet', 'nebula', 'spacecraft'];
    const currentIndex = types.indexOf(particleType);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % types.length;
    const nextType = types[nextIndex];
    setParticleType(nextType);
    setParticleName(`New ${nextType.charAt(0).toUpperCase() + nextType.slice(1).replace('_', ' ')}`);
  };

  const selectMassPreset = (mass: number, label: string) => {
    setNewMass(mass);
    const typeLabel = particleType.charAt(0).toUpperCase() + particleType.slice(1).replace('_', ' ');
    setParticleName(`${label} ${typeLabel}`);
  };

  const handleStarSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (STAR_PRESETS[val]) {
      const preset = STAR_PRESETS[val];
      setParticleType(preset.type);
      setNewMass(preset.mass);
      setNewDensity(preset.density);
      setNewDiameter(preset.diameter);
      setParticleName(preset.name);
      setNewColor(preset.color);
    }
  };

  return (
    <div className="relative w-full h-screen select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="absolute inset-0 cursor-crosshair touch-none"
      />

      {/* Top Center Header & Ruler Controls (Removed) */}
      <div className="absolute bottom-12 left-4 flex flex-col items-start gap-2 pointer-events-none select-none z-10">
        {/* Date Display */}
        <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 rounded-lg px-4 py-2 flex flex-col items-start shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <span className="text-[10px] text-cyan-500/60 font-mono uppercase tracking-widest">Simulation Date</span>
          <span className="text-lg text-cyan-400 font-mono font-bold">
            {currentSimDate.toLocaleDateString(undefined, { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          <span className="text-xs text-cyan-500/80 font-mono">
            {currentSimDate.toLocaleTimeString(undefined, { 
              hour: '2-digit', 
              minute: '2-digit',
              second: '2-digit'
            })}
          </span>
        </div>

        {(() => {
          // Desired width in screen pixels
          const targetScreenWidth = 100;
          const worldWidth = targetScreenWidth / zoom;
          
          // Convert world width to AU first
          const auWidth = worldWidth / AU_IN_SIM_UNITS;
          
          // Convert AU to selected unit
          const unitWidth = auWidth * UNIT_CONVERSIONS[scaleUnit];
          
          // Find a "nice" number for the scale in the selected unit
          const magnitude = Math.pow(10, Math.floor(Math.log10(unitWidth)));
          const firstDigit = unitWidth / magnitude;
          let niceUnitWidth;
          if (firstDigit < 2) niceUnitWidth = 1 * magnitude;
          else if (firstDigit < 5) niceUnitWidth = 2 * magnitude;
          else niceUnitWidth = 5 * magnitude;
          
          // Convert nice unit width back to world units for drawing
          const niceAUWidth = niceUnitWidth / UNIT_CONVERSIONS[scaleUnit];
          const finalScreenWidth = niceAUWidth * AU_IN_SIM_UNITS * zoom;
          
          let label = "";
          if (niceUnitWidth >= 1) {
            label = `${niceUnitWidth.toLocaleString()} ${UNIT_LABELS[scaleUnit]}`;
          } else if (niceUnitWidth >= 0.001) {
            label = `${(niceUnitWidth).toFixed(3)} ${UNIT_LABELS[scaleUnit]}`;
          } else {
            label = `${niceUnitWidth.toExponential(1)} ${UNIT_LABELS[scaleUnit]}`;
          }

          const auPixelWidth = AU_IN_SIM_UNITS * zoom;

          return (
            <>
              <div className="text-[11px] font-mono bg-black/50 px-1 rounded">{label}</div>
              <div 
                className="h-1.5 border-x-2 border-b-2 border-white bg-white/20 mb-1" 
                style={{ width: `${finalScreenWidth}px` }}
              />
              {/* 1 AU Reference Line */}
              <div className="flex flex-col items-end gap-0.5">
                <div className="text-[10px] font-mono text-yellow-400 bg-black/50 px-1 rounded">1 AU REF</div>
                <div 
                  className="h-1 border-b-2 border-yellow-400" 
                  style={{ width: `${auPixelWidth}px` }}
                />
              </div>
            </>
          );
        })()}
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-4 bg-black/70 p-2 retro-border z-10">
        <button 
          onClick={() => setShowParticleList(!showParticleList)}
          className={`retro-button p-1 ${showParticleList ? 'bg-cyan-900' : ''}`}
          title="Particle List"
        >
          <Layers size={20} />
        </button>

        {showMobileControls && (
          <div className="flex gap-1 border-x border-white/20 px-2">
            <button 
              onClick={() => { engine.h /= 1.2; setSimSpeed(engine.h); }}
              className="retro-button p-1"
              title="Slow Down"
            >
              <Rewind size={16} />
            </button>
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="retro-button p-1"
              title={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button 
              onClick={() => { engine.h *= 1.2; setSimSpeed(engine.h); }}
              className="retro-button p-1"
              title="Speed Up"
            >
              <FastForward size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Particle Selector Sidebar (Right) */}
      {showParticleList && (
        <div className="absolute top-16 right-16 w-64 bg-black/80 p-3 retro-border z-20 max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-tighter">Active Particles</span>
            <div className="flex gap-1">
              {selectedParticleId && (
                <button 
                  onClick={() => {
                    setSelectedParticleId(null);
                    setFollowSelected(false);
                  }} 
                  className="retro-button p-0.5 text-[8px] px-1 text-yellow-400 border-yellow-400/50"
                  title="Clear Selection"
                >
                  DESELECT
                </button>
              )}
              <button onClick={() => setShowParticleList(false)} className="retro-button p-0.5"><Minimize size={12}/></button>
            </div>
          </div>
          
          <input 
            type="text" 
            placeholder="Search particles..." 
            value={particleSearch}
            onChange={(e) => setParticleSearch(e.target.value)}
            className="retro-input w-full mb-2 text-[10px]"
          />

          <div className="flex-1 overflow-y-auto retro-scrollbar flex flex-col gap-1 pr-1 max-h-[260px]">
            {engine.particles
              .filter(p => p.type !== 'reference_point' && (p.name.toLowerCase().includes(particleSearch.toLowerCase()) || p.type.toLowerCase().includes(particleSearch.toLowerCase())))
              .sort((a, b) => b.mass - a.mass)
              .map(p => (
                <div 
                  key={p.id}
                  onClick={() => {
                    if (selectedParticleId === p.id) {
                      setSelectedParticleId(null);
                      setFollowSelected(false);
                    } else {
                      setSelectedParticleId(p.id);
                      // Center on it
                      setPan({
                        x: window.innerWidth / 2 - p.x * zoom,
                        y: window.innerHeight / 2 - p.y * zoom
                      });
                    }
                  }}
                  className={`flex flex-col p-1.5 rounded cursor-pointer transition-colors border ${selectedParticleId === p.id ? 'bg-cyan-900/50 border-cyan-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: `rgb(${p.color[0]}, ${p.color[1]}, ${p.color[2]})` }}
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] font-bold truncate leading-tight">{p.name || 'Unnamed'}</span>
                        <span className="text-[8px] opacity-60 truncate leading-tight">{p.type.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedParticleId === p.id) {
                            setFollowSelected(!followSelected);
                          } else {
                            setSelectedParticleId(p.id);
                            setFollowSelected(true);
                            setPan({
                              x: window.innerWidth / 2 - p.x * zoom,
                              y: window.innerHeight / 2 - p.y * zoom
                            });
                          }
                        }}
                        className={`p-1 rounded border ${selectedParticleId === p.id && followSelected ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-gray-500 hover:text-white'}`}
                        title={selectedParticleId === p.id && followSelected ? "Stop Following" : "Follow Particle"}
                      >
                        <Crosshair size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          engine.removeParticle(p);
                          setParticleCount(engine.particles.length);
                          if (selectedParticleId === p.id) {
                            setSelectedParticleId(null);
                            setFollowSelected(false);
                          }
                        }}
                        className="p-0.5 text-red-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {selectedParticleId === p.id && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1">
                      <div className="flex flex-col gap-1 mb-2">
                        <span className="text-[8px] uppercase opacity-60">Mass (kg):</span>
                        <input 
                          type="number"
                          defaultValue={p.realMass}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              p.realMass = val;
                              const MASS_SCALE = 1e7 / 1.989e30;
                              p.mass = val * MASS_SCALE;
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="retro-input text-[9px] w-full py-0.5 bg-black/50"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 mb-1">
                        <span className="text-[8px] uppercase opacity-60">Maneuver:</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const angle = Math.atan2(p.vy, p.vx);
                              p.thrust = { ax: Math.cos(angle) * 20, ay: Math.sin(angle) * 20, duration: 1.0 };
                            }}
                            className="p-1 rounded bg-orange-500/20 border border-orange-500/50 text-orange-400 hover:bg-orange-500/30 flex items-center gap-1"
                            title="Accelerate (Prograde)"
                          >
                            <ArrowUp size={10} />
                            <span className="text-[7px]">ACCEL</span>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const angle = Math.atan2(p.vy, p.vx);
                              p.thrust = { ax: -Math.cos(angle) * 20, ay: -Math.sin(angle) * 20, duration: 1.0 };
                            }}
                            className="p-1 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 flex items-center gap-1"
                            title="Decelerate (Retrograde)"
                          >
                            <ArrowDown size={10} />
                            <span className="text-[7px]">DECEL</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase opacity-60">Add Orbiter:</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            addOrbiter(p);
                            setParticleCount(engine.particles.length);
                          }}
                          className="p-0.5 text-green-500 hover:text-green-400 flex items-center gap-1"
                          title="Add Orbiter (Current Settings)"
                        >
                          <PlusCircle size={10} />
                          <span className="text-[7px]">Current</span>
                        </button>
                      </div>
                      <select 
                        className="retro-input text-[9px] w-full py-0.5 bg-black/50"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const preset = STAR_PRESETS[val];
                            if (preset) {
                              addOrbiter(p, preset.mass, preset.type, preset.name, preset.density, preset.color);
                              setParticleCount(engine.particles.length);
                            }
                            e.target.value = "";
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">-- Choose Preset --</option>
                        <optgroup label="Famous Stars">
                          <option value="sirius">Sirius A</option>
                          <option value="canopus">Canopus</option>
                          <option value="arcturus">Arcturus</option>
                          <option value="vega">Vega</option>
                          <option value="capella">Capella</option>
                          <option value="rigel">Rigel</option>
                          <option value="procyon">Procyon A</option>
                          <option value="betelgeuse">Betelgeuse</option>
                          <option value="achernar">Achernar</option>
                          <option value="hadar">Hadar</option>
                          <option value="altair">Altair</option>
                          <option value="acrux">Acrux</option>
                          <option value="aldebaran">Aldebaran</option>
                          <option value="antares">Antares</option>
                          <option value="spica">Spica</option>
                          <option value="pollux">Pollux</option>
                          <option value="deneb">Deneb</option>
                        </optgroup>
                        <optgroup label="Generic & Common">
                          <option value="planet">Generic Planet</option>
                          <option value="sun">Yellow Star (Sun)</option>
                          <option value="black_hole">Black Hole</option>
                          <option value="nebula">Nebula</option>
                          <option value="asteroid">Asteroid</option>
                          <option value="comet">Comet</option>
                        </optgroup>
                        <optgroup label="Stars & Exotic">
                          <option value="red_dwarf">Red Dwarf</option>
                          <option value="red_giant">Red Giant</option>
                          <option value="blue_giant">Blue Giant</option>
                          <option value="supermassive_star">Supermassive Star</option>
                          <option value="white_dwarf">White Dwarf</option>
                          <option value="neutron_star">Neutron Star</option>
                          <option value="magnetar">Magnetar</option>
                          <option value="pulsar">Pulsar</option>
                          <option value="supernova">Supernova</option>
                          <option value="quasar">Quasar</option>
                          <option value="wormhole">Wormhole</option>
                        </optgroup>
                        <optgroup label="Solar System">
                          <option value="mercury">Mercury</option>
                          <option value="venus">Venus</option>
                          <option value="earth">Earth</option>
                          <option value="mars">Mars</option>
                          <option value="jupiter">Jupiter</option>
                          <option value="saturn">Saturn</option>
                          <option value="uranus">Uranus</option>
                          <option value="neptune">Neptune</option>
                          <option value="pluto">Pluto</option>
                        </optgroup>
                        <optgroup label="Moons">
                          <option value="moon">The Moon (Earth)</option>
                          <option value="io">Io (Jupiter)</option>
                          <option value="europa">Europa (Jupiter)</option>
                          <option value="ganymede">Ganymede (Jupiter)</option>
                          <option value="callisto">Callisto (Jupiter)</option>
                          <option value="phobos">Phobos (Mars)</option>
                          <option value="deimos">Deimos (Mars)</option>
                          <option value="mimas">Mimas (Saturn)</option>
                          <option value="enceladus">Enceladus (Saturn)</option>
                          <option value="tethys">Tethys (Saturn)</option>
                          <option value="dione">Dione (Saturn)</option>
                          <option value="rhea">Rhea (Saturn)</option>
                          <option value="titan">Titan (Saturn)</option>
                          <option value="iapetus">Iapetus (Saturn)</option>
                          <option value="miranda">Miranda (Uranus)</option>
                          <option value="ariel">Ariel (Uranus)</option>
                          <option value="umbriel">Umbriel (Uranus)</option>
                          <option value="titania">Titania (Uranus)</option>
                          <option value="oberon">Oberon (Uranus)</option>
                          <option value="triton">Triton (Neptune)</option>
                          <option value="charon">Charon (Pluto)</option>
                        </optgroup>
                        <optgroup label="Spacecraft">
                          <option value="voyager">Voyager 1</option>
                          <option value="sls">SLS (Artemis)</option>
                          <option value="apollo">Apollo (Saturn V)</option>
                          <option value="starship">Starship (SpaceX)</option>
                          <option value="blue_moon">Blue Moon (Blue Origin)</option>
                          <option value="shuttle">Space Shuttle</option>
                          <option value="iss">ISS</option>
                          <option value="hubble">Hubble Telescope</option>
                          <option value="jwst">James Webb (JWST)</option>
                        </optgroup>
                      </select>

                      <div className="flex flex-col gap-1 mt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] opacity-60 uppercase tracking-tighter">Orbit Range:</span>
                          <span className="text-[8px] font-mono text-cyan-400">{orbiterDistance.toFixed(1)}x</span>
                        </div>
                        <input 
                          type="range" 
                          min="1.5" 
                          max="100" 
                          step="0.5" 
                          value={orbiterDistance} 
                          onChange={(e) => setOrbiterDistance(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-[8px] opacity-60 uppercase tracking-tighter">Orbit Type:</span>
                        <select 
                          className="retro-input text-[9px] w-full py-0.5 bg-black/50"
                          value={orbiterOrbitType}
                          onChange={(e) => setOrbiterOrbitType(e.target.value as OrbitType)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="circular">Circular</option>
                          <option value="elliptical_low">Elliptical (Low V)</option>
                          <option value="elliptical_high">Elliptical (High V)</option>
                          <option value="retrograde">Retrograde</option>
                          <option value="escape">Escape Velocity</option>
                          <optgroup label="Lagrange Points">
                            <option value="L1">L1 Point</option>
                            <option value="L2">L2 Point</option>
                            <option value="L3">L3 Point</option>
                            <option value="L4">L4 Point</option>
                            <option value="L5">L5 Point</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            {engine.particles.length === 0 && (
              <div className="text-center py-4 text-[10px] opacity-50 italic">No particles in simulation</div>
            )}
          </div>

          {selectedParticleId && (
            <div className="mt-2 pt-2 border-t border-white/20">
              {(() => {
                const p = engine.particles.find(part => part.id === selectedParticleId);
                if (!p) return null;
                return (
                  <div className="text-[9px] font-mono grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="opacity-60">Mass:</span>
                    <span>{p.mass.toExponential(2)} ({(p.mass * 1.98847e23).toExponential(2)} kg)</span>
                    <span className="opacity-60">Pos:</span>
                    <span>{Math.round(p.x)}, {Math.round(p.y)}</span>
                    <span className="opacity-60">Vel:</span>
                    <span>{Math.sqrt(p.vx*p.vx + p.vy*p.vy).toFixed(2)} km/s ({(Math.sqrt(p.vx*p.vx + p.vy*p.vy) * 3600).toFixed(2)} km/h)</span>
                    
                    <div className="col-span-2 mt-2 pt-2 border-t border-white/10 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] uppercase opacity-60">Hill Sphere:</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            p.showHillSphere = !p.showHillSphere;
                            setParticleCount(engine.particles.length); // Trigger re-render
                          }}
                          className={`p-0.5 px-1 text-[7px] border rounded ${p.showHillSphere ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-gray-500 hover:text-white'}`}
                        >
                          {p.showHillSphere ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>

                      {(() => {
                        const p1 = engine.getDominantSource(p);
                        if (p1) {
                          return (
                            <div className="flex flex-col gap-1 mt-1">
                              <span className="text-[8px] uppercase opacity-60">Lagrange Points (vs {p1.name}):</span>
                              <div className="grid grid-cols-5 gap-1">
                                {['L1', 'L2', 'L3', 'L4', 'L5'].map(point => (
                                  <button 
                                    key={point}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const points = engine.getLagrangePoints(p1, p);
                                      const pos = points[point];
                                      if (pos) {
                                        const newP = new Particle(
                                          newMass, 
                                          pos.x, pos.y, 
                                          pos.vx, pos.vy, 
                                          particleType, 
                                          `${p.name} ${point}`, 
                                          newDensity, 
                                          hexToColor(newColor),
                                          newDiameter
                                        );
                                        engine.addParticle(newP);
                                        setParticleCount(engine.particles.length);
                                      }
                                    }}
                                    className="retro-button text-[7px] p-0.5"
                                    title={`Place particle at ${point}`}
                                  >
                                    {point}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Left Sidebar Controls */}
      {showControls && (
        <div className="absolute top-16 left-4 w-56 bg-black/70 p-3 retro-border z-10 max-h-[60vh] overflow-y-auto retro-scrollbar">
          {/* Header & Ruler Controls (Moved from Top Center) */}
          <div className="flex flex-col items-center gap-1 mb-4 pb-2 border-b border-white/10">
            <h1 className="text-xs font-bold tracking-[0.2em] text-cyan-400/80">GRAVITY TOY</h1>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-[9px] tracking-widest ${rulerEnabled || orbitPlannerEnabled ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>
                {rulerEnabled ? 'RULER MODE ACTIVE' : orbitPlannerEnabled ? 'ORBIT PLANNER ACTIVE' : 'Sim Active'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 justify-center items-center mt-1">
              <button 
                onClick={() => {
                  setRulerEnabled(!rulerEnabled);
                  if (!rulerEnabled) setRulerPoints([]);
                  if (!rulerEnabled) setAccessibilityMode(false);
                }}
                className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all duration-200 ${
                  rulerEnabled 
                    ? 'bg-yellow-500/30 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                    : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/40'
                }`}
              >
                {rulerEnabled ? 'DISABLE' : 'Ruler Mode'}
              </button>

              <button 
                onClick={() => {
                  setAccessibilityMode(!accessibilityMode);
                  if (!accessibilityMode) setRulerEnabled(false);
                }}
                className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all duration-200 ${
                  accessibilityMode 
                    ? 'bg-blue-500/30 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                    : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/40'
                }`}
                title="Vector-based particle creation with visual guides"
              >
                {accessibilityMode ? 'ACCESSIBILITY ON' : 'Accessibility'}
              </button>

              <button 
                onClick={() => setOrbitTracerEnabled(!orbitTracerEnabled)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all duration-200 ${
                  orbitTracerEnabled 
                    ? 'bg-purple-500/30 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                    : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/40'
                }`}
                title="Project future orbit of selected particle"
              >
                {orbitTracerEnabled ? 'TRACER ON' : 'Orbit Tracer'}
              </button>

              <button 
                onClick={() => {
                  setOrbitPlannerEnabled(!orbitPlannerEnabled);
                  if (!orbitPlannerEnabled) {
                    setRulerEnabled(false);
                    setAccessibilityMode(false);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all duration-200 ${
                  orbitPlannerEnabled 
                    ? 'bg-orange-500/30 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)]' 
                    : 'bg-white/5 border-white/20 text-white/60 hover:bg-white/10 hover:border-white/40'
                }`}
                title="Plan orbits without creating particles (like Ruler Mode)"
              >
                {orbitPlannerEnabled ? 'PLANNER ON' : 'Orbit Planner'}
              </button>

              {plannedOrbits.length > 0 && (
                <button 
                  onClick={() => setPlannedOrbits([])}
                  className="px-2 py-0.5 rounded text-[9px] font-bold border bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                >
                  Clear Plans
                </button>
              )}

              {orbitPlannerEnabled && (
                <div className="w-full text-[8px] text-orange-400/70 text-center mt-1 italic">
                  Click & drag to map potential orbits
                </div>
              )}
              
              {rulerEnabled && (
                <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded border border-white/10">
                  <select 
                    value={rulerUnit}
                    onChange={(e) => setRulerUnit(e.target.value as any)}
                    className="bg-transparent text-white text-[9px] px-1 outline-none cursor-pointer"
                  >
                    <option value="km">km</option>
                    <option value="mi">mi</option>
                    <option value="AU">AU</option>
                    <option value="ly">ly</option>
                  </select>
                  <input 
                    type="color" 
                    value={rulerColor}
                    onChange={(e) => setRulerColor(e.target.value)}
                    className="w-4 h-4 p-0 border-none bg-transparent cursor-pointer rounded-full overflow-hidden"
                    title="Ruler Color"
                  />
                </div>
              )}

              {(rulerPoints.length > 0 || rulerMeasurements.length > 0) && (
                <button 
                  onClick={() => {
                    setRulerPoints([]);
                    setRulerMeasurements([]);
                  }}
                  className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/40 transition-colors"
                  title="Clear all measurements"
                >
                  CLR
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px]">Particles: {particleCount}</span>
            <button onClick={() => setShowControls(false)} className="retro-button p-0.5"><Minimize size={12}/></button>
          </div>

          <div className="section-title">Mass Controls</div>
          <div className="flex flex-col gap-1">
            <button 
              onClick={cycleType}
              className="retro-button"
            >
              Type: {particleType.toUpperCase().replace('_', ' ')}
            </button>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]">Mass:</span>
              <input 
                type="text" 
                value={newMass.toExponential(1)} 
                onChange={(e) => setNewMass(parseFloat(e.target.value) || 1000)}
                className="retro-input w-24"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]">Density:</span>
              <input 
                type="number" 
                step="0.1"
                value={newDensity} 
                onChange={(e) => setNewDensity(parseFloat(e.target.value) || 1)}
                className="retro-input w-24"
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px]">Color:</span>
              <input 
                type="color" 
                value={newColor} 
                onChange={(e) => setNewColor(e.target.value)}
                className="retro-input w-10 h-6 p-0 border-none cursor-pointer"
              />
              <span className="text-[8px] uppercase">{newColor}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              <button onClick={() => selectMassPreset(0.37, 'Moon')} className="retro-button">Moon</button>
              <button onClick={() => selectMassPreset(30, 'Earth')} className="retro-button">Earth</button>
              <button onClick={() => selectMassPreset(9500, 'Jupiter')} className="retro-button">Jupiter</button>
              <button onClick={() => selectMassPreset(100000, 'Huge')} className="retro-button">Huge</button>
              <button onClick={() => selectMassPreset(1000000, 'Enormous')} className="retro-button">Enormous</button>
              <button onClick={() => selectMassPreset(10000000, 'Sun')} className="retro-button">Sun</button>
              <button onClick={() => selectMassPreset(100000000, 'Giant')} className="retro-button">Giant</button>
              <button onClick={() => selectMassPreset(1000000000, 'Behemoth')} className="retro-button">Behemoth</button>
              <button onClick={() => selectMassPreset(10000000000, 'Supermassive')} className="retro-button">Supermassive</button>
              <button onClick={() => selectMassPreset(100000000000, 'Hypermassive')} className="retro-button">Hypermassive</button>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[11px]">Star Preset:</span>
              <select onChange={handleStarSelect} className="retro-select w-full">
                <option value="custom">-- Custom --</option>
                <optgroup label="Famous Stars">
                  <option value="sirius">Sirius A</option>
                  <option value="canopus">Canopus</option>
                  <option value="arcturus">Arcturus</option>
                  <option value="vega">Vega</option>
                  <option value="capella">Capella</option>
                  <option value="rigel">Rigel</option>
                  <option value="procyon">Procyon A</option>
                  <option value="betelgeuse">Betelgeuse</option>
                  <option value="achernar">Achernar</option>
                  <option value="hadar">Hadar</option>
                  <option value="altair">Altair</option>
                  <option value="acrux">Acrux</option>
                  <option value="aldebaran">Aldebaran</option>
                  <option value="antares">Antares</option>
                  <option value="spica">Spica</option>
                  <option value="pollux">Pollux</option>
                  <option value="deneb">Deneb</option>
                </optgroup>
                <optgroup label="Generic & Common">
                  <option value="planet">Generic Planet</option>
                  <option value="sun">Yellow Star (Sun)</option>
                  <option value="black_hole">Black Hole</option>
                  <option value="nebula">Nebula</option>
                  <option value="asteroid">Asteroid</option>
                  <option value="comet">Comet</option>
                </optgroup>
                <optgroup label="Stars & Exotic">
                  <option value="red_dwarf">Red Dwarf</option>
                  <option value="red_giant">Red Giant</option>
                  <option value="blue_giant">Blue Giant</option>
                  <option value="supermassive_star">Supermassive Star</option>
                  <option value="white_dwarf">White Dwarf</option>
                  <option value="neutron_star">Neutron Star</option>
                  <option value="magnetar">Magnetar</option>
                  <option value="pulsar">Pulsar</option>
                  <option value="supernova">Supernova</option>
                  <option value="quasar">Quasar</option>
                  <option value="wormhole">Wormhole</option>
                </optgroup>
                <optgroup label="Solar System">
                  <option value="mercury">Mercury</option>
                  <option value="venus">Venus</option>
                  <option value="earth">Earth</option>
                  <option value="mars">Mars</option>
                  <option value="jupiter">Jupiter</option>
                  <option value="saturn">Saturn</option>
                  <option value="uranus">Uranus</option>
                  <option value="neptune">Neptune</option>
                  <option value="pluto">Pluto</option>
                </optgroup>
                <optgroup label="Moons">
                  <option value="moon">The Moon (Earth)</option>
                  <option value="io">Io (Jupiter)</option>
                  <option value="europa">Europa (Jupiter)</option>
                  <option value="ganymede">Ganymede (Jupiter)</option>
                  <option value="callisto">Callisto (Jupiter)</option>
                  <option value="phobos">Phobos (Mars)</option>
                  <option value="deimos">Deimos (Mars)</option>
                  <option value="mimas">Mimas (Saturn)</option>
                  <option value="enceladus">Enceladus (Saturn)</option>
                  <option value="tethys">Tethys (Saturn)</option>
                  <option value="dione">Dione (Saturn)</option>
                  <option value="rhea">Rhea (Saturn)</option>
                  <option value="titan">Titan (Saturn)</option>
                  <option value="iapetus">Iapetus (Saturn)</option>
                  <option value="miranda">Miranda (Uranus)</option>
                  <option value="ariel">Ariel (Uranus)</option>
                  <option value="umbriel">Umbriel (Uranus)</option>
                  <option value="titania">Titania (Uranus)</option>
                  <option value="oberon">Oberon (Uranus)</option>
                  <option value="triton">Triton (Neptune)</option>
                  <option value="charon">Charon (Pluto)</option>
                </optgroup>
                <optgroup label="Spacecraft">
                  <option value="voyager">Voyager 1</option>
                  <option value="sls">SLS (Artemis)</option>
                  <option value="apollo">Apollo (Saturn V)</option>
                  <option value="starship">Starship (SpaceX)</option>
                  <option value="blue_moon">Blue Moon (Blue Origin)</option>
                  <option value="shuttle">Space Shuttle</option>
                  <option value="iss">ISS</option>
                  <option value="hubble">Hubble Telescope</option>
                  <option value="jwst">James Webb (JWST)</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="section-title">System Generation</div>
          <div className="flex flex-col gap-1">
            <button onClick={generateRandomSystem} className="retro-button">Random System (D)</button>
            <button onClick={generateSolarSystem} className="retro-button">Solar System</button>
            <button onClick={generateGalaxy} className="retro-button">Spiral Galaxy</button>
            <button onClick={generateBinary} className="retro-button">Binary System</button>
            <button onClick={generateFigureAndOrbit} className="retro-button">Figure & Orbit</button>
            <button onClick={handleClear} className="retro-button bg-red-900/30">Clear Canvas</button>
          </div>

          <div className="section-title">Saved Systems</div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <input 
                type="text" 
                placeholder="Save name..." 
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="retro-input flex-1"
                onKeyDown={(e) => e.key === 'Enter' && saveCurrentSystem()}
              />
              <button 
                onClick={saveCurrentSystem}
                className="retro-button p-1"
                title="Save System"
              >
                <Save size={14} />
              </button>
            </div>
            
            <div className="max-h-32 overflow-y-auto flex flex-col gap-1 mt-1 retro-scrollbar">
              {savedSystems.map(name => (
                <div key={name} className="flex items-center justify-between bg-white/5 p-1 rounded border border-white/10">
                  <span className="text-[10px] truncate flex-1">{name}</span>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => loadSystem(name)}
                      className="p-1 hover:bg-white/10 rounded text-blue-400"
                      title="Load"
                    >
                      <FolderOpen size={12} />
                    </button>
                    <button 
                      onClick={() => deleteSystem(name)}
                      className="p-1 hover:bg-red-900/30 rounded text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {savedSystems.length === 0 && (
                <div className="text-[9px] opacity-40 italic text-center py-1">No saved systems</div>
              )}
            </div>
          </div>

          <div className="section-title">Mission Scenarios</div>
          <div className="flex flex-col gap-1 mb-2">
            <select 
              value={selectedScenario} 
              onChange={handleScenarioSelect}
              className="retro-select w-full"
            >
              <option value="">-- Select Scenario --</option>
              <option value="artemis_2">Artemis II (Free Return)</option>
            </select>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="checkbox" 
                id="showRefTraj" 
                checked={showReferenceTrajectory} 
                onChange={(e) => setShowReferenceTrajectory(e.target.checked)}
                className="retro-checkbox"
              />
              <label htmlFor="showRefTraj" className="text-[9px] uppercase opacity-70 cursor-pointer">Show Ref. Trajectory</label>
            </div>
          </div>

          <div className="section-title">Scientific Experiments</div>
          <div className="flex flex-col gap-1">
            <select 
              value={selectedExperiment} 
              onChange={handleExperimentSelect}
              className="retro-select w-full"
            >
              <option value="">-- Select Experiment --</option>
              <optgroup label="Relativistic & Exotic">
                <option value="cosmic_web">Cosmic Web Filament</option>
                <option value="supernova_nucleosynthesis">Supernova Nucleosynthesis</option>
                <option value="agn_feedback">AGN Feedback (Quasar)</option>
                <option value="kilonova_event">Kilonova (NS Merger)</option>
                <option value="primordial_galaxy">Primordial Galaxy Formation</option>
                <option value="triple_instability">Triple System Instability</option>
                <option value="bh_accretion_jets">BH Accretion & Jets</option>
                <option value="dm_halo_merger">Dark Matter Halo Merger</option>
                <option value="cluster_evaporation">Stellar Cluster Evaporation</option>
                <option value="wormhole_bridge">Wormhole Interstellar Bridge</option>
                <option value="binary_bh_kick">BH Merger Recoil Kick</option>
                <option value="triple_bh_chaos">Triple Black Hole Chaos</option>
                <option value="triple_quasar_dance">Triple Quasar Dance</option>
                <option value="kerr_bh_accretion">Kerr BH Accretion Rings</option>
                <option value="galactic_center_cluster">Sgr A* S-Star Cluster</option>
                <option value="lisa_source_multi">LISA Multi-Body Source</option>
                <option value="gravitational_lens_grid">Gravitational Lensing Grid</option>
                <option value="galactic_jet_precession">Precessing Relativistic Jet</option>
              </optgroup>
              <optgroup label="Stellar Dynamics & Chaos">
                <option value="neutron_merger">Neutron Star Merger</option>
                <option value="kilonova_merger">Kilonova (NS Merger)</option>
                <option value="pulsar_binary">Hulse-Taylor Pulsar Binary</option>
                <option value="binary_pulsar_periastron_shift">Pulsar Periastron Shift</option>
                <option value="triple_star">Hierarchical Triple System</option>
                <option value="hierarchical_sextuple">Hierarchical Sextuple System</option>
                <option value="kozai_lidov">Kozai-Lidov Resonance</option>
                <option value="roche_lobe">Roche Lobe Overflow (Visual)</option>
                <option value="nova_explosion">Nova Explosion (WD Accretion)</option>
                <option value="double_degenerate_merger">Double Degenerate Merger</option>
                <option value="white_dwarf_binary_gw">WD Binary GW Source</option>
                <option value="supernova_remnant">Supernova Remnant Shell</option>
                <option value="supernova_chain">Supernova Chain Reaction</option>
                <option value="globular_cluster">Globular Cluster Core</option>
                <option value="imbh_cluster_interaction">IMBH Cluster Interaction</option>
                <option value="klemperer">Klemperer Rosette (Hexagon)</option>
                <option value="chaos_three_body">Chaotic Three-Body Problem</option>
                <option value="stellar_collision">Hypergiant Collision</option>
                <option value="neutron_accretion">Neutron Star Accretion</option>
                <option value="magnetar_flare">Magnetar Gamma Flare</option>
                <option value="neutron_star_magnetar_collision">NS-Magnetar Collision</option>
                <option value="nebula_collapse">Nebula Gravitational Collapse</option>
                <option value="stellar_nursery_collapse">Stellar Nursery Collapse</option>
                <option value="bipolar_nebula_outflow">Bipolar Nebula Outflow</option>
              </optgroup>
              <optgroup label="Planetary & Solar">
                <option value="inner_solar">Inner Solar System</option>
                <option value="mercury_instability">Mercury Instability (Chaos)</option>
                <option value="laplace_resonance">Laplace Resonance (1:2:4)</option>
                <option value="lagrange">Lagrange Points (L4/L5)</option>
                <option value="trojans">Jupiter Trojan Asteroids</option>
                <option value="slingshot">Gravitational Slingshot</option>
                <option value="protoplanetary">Protoplanetary Disk</option>
                <option value="accretion_disk_instability">Accretion Disk Instability</option>
                <option value="disk_gap">Planetary Disk Gap Formation</option>
                <option value="planetary_migration">Planetary Migration</option>
                <option value="planet_migration_resonance">Migration into Resonance</option>
                <option value="oort_cloud">Oort Cloud Shell</option>
                <option value="oort_cloud_shower">Oort Cloud Comet Shower</option>
                <option value="rogue_planet">Rogue Planet Flyby</option>
                <option value="binary_star_planetary">Circumbinary Planet</option>
                <option value="comet_swarm">Comet Swarm Inbound</option>
                <option value="planetary_billiards">Planetary Billiards (Chaos)</option>
                <option value="planet_shredder">Planet Shredder (BH)</option>
                <option value="asteroid_belt_kirkwood">Kirkwood Gaps (Jupiter)</option>
              </optgroup>
              <optgroup label="Galactic & Dark Matter">
                <option value="galactic_merger">Galactic Collision/Merger</option>
                <option value="tidal_tail_formation">Tidal Tail Formation</option>
                <option value="stellar_stream">Stellar Stream Stripping</option>
                <option value="galactic_cannibalism">Galactic Cannibalism</option>
                <option value="dark_halo">Galaxy Dark Matter Halo</option>
                <option value="dark_filament">Dark Matter Filament</option>
                <option value="dark_matter_bullet">Dark Matter Bullet Cluster</option>
                <option value="dark_matter_capture">Dark Matter Capture</option>
                <option value="dark_matter_stripping">Satellite Halo Stripping</option>
                <option value="dark_matter_subhalo_stripping_detailed">Detailed Subhalo Stripping</option>
                <option value="dark_matter_halo_merger">Dark Matter Halo Merger</option>
                <option value="primordial_bh_cluster_evaporation">PBH Cluster Evaporation</option>
                <option value="antimatter_collision">Antimatter Cloud Collision</option>
                <option value="antimatter_nebula">Antimatter Nebula Interaction</option>
                <option value="antimatter_bullet">Antimatter Bullet (BH Target)</option>
                <option value="galactic_jet_impact">Quasar Jet Impact</option>
                <option value="relativistic_jet_cloud">Jet-Cloud Interaction</option>
                <option value="star_vs_bh_cluster">Star Cluster vs SMBH</option>
              </optgroup>
              <optgroup label="Arena & Versus">
                <option value="versus_all">Exotic Versus All (16 Types)</option>
                <option value="versus_titans">Tug-of-War: Titans</option>
                <option value="gravity_well_arena">Gravity Well Arena (4 BH)</option>
                <option value="bh_vs_magnetar">Black Hole vs Magnetar</option>
                <option value="binary_system_chaos">Binary Systems</option>
                <option value="chaos_cluster">Chaotic Particle Cluster</option>
                <option value="solar_system_vs_bh">Solar System vs Rogue BH</option>
                <option value="nebula_war">Nebula War: Matter vs Anti</option>
              </optgroup>
            </select>
          </div>

          <div className="section-title">Simulation</div>
          <div className="flex flex-col gap-1">
            <button onClick={() => setIsPaused(!isPaused)} className="retro-button flex items-center justify-center gap-2">
              {isPaused ? <Play size={12}/> : <Pause size={12}/>} {isPaused ? 'Resume' : 'Pause'}
            </button>
            <div className="flex gap-1">
              <button onClick={() => engine.h /= 1.2} className="retro-button flex-1"><Rewind size={12}/></button>
              <button onClick={() => engine.h *= 1.2} className="retro-button flex-1"><FastForward size={12}/></button>
            </div>
            <select 
              value={gravityMode} 
              onChange={(e) => setGravityMode(e.target.value as GravityMode)}
              className="retro-select w-full mt-1"
            >
              <option value="inverseSquare">1/r² (Newton)</option>
              <option value="exponential">e^-r</option>
              <option value="arctanSquared">1/arctan²(r)</option>
              <option value="sechSquared">sech²(r)</option>
              <option value="sech">sech(r)</option>
            </select>
          </div>
        </div>
      )}

      {!showControls && (
        <button 
          onClick={() => setShowControls(true)} 
          className="absolute top-4 left-4 retro-button z-10"
        >
          <Maximize size={16}/>
        </button>
      )}

      {/* Right Sidebar Options */}
      <div className="absolute top-16 right-4 flex flex-col gap-2 z-10">
        <button onClick={() => setShowExtraOptions(!showExtraOptions)} className="retro-button">
          <Settings size={16}/>
        </button>
        <button onClick={() => setShowHelp(!showHelp)} className="retro-button">
          <HelpCircle size={16}/>
        </button>
      </div>

      {showExtraOptions && (
        <div className="absolute top-16 right-16 w-48 bg-black/70 p-3 retro-border z-10 max-h-[80vh] overflow-y-auto retro-scrollbar">
          <div className="section-title">Visualization</div>
          <div className="flex flex-col gap-1">
            <button onClick={() => setTrailsEnabled(!trailsEnabled)} className={`retro-button ${trailsEnabled ? 'bg-white text-black' : ''}`}>Trails</button>
            <button onClick={() => setShowOrbits(!showOrbits)} className={`retro-button ${showOrbits ? 'bg-white text-black' : ''}`}>Orbits</button>
            <button onClick={() => setShowNames(!showNames)} className={`retro-button ${showNames ? 'bg-white text-black' : ''}`}>Names</button>
            <button onClick={() => setShowMass(!showMass)} className={`retro-button ${showMass ? 'bg-white text-black' : ''}`}>Mass Labels</button>
            <button onClick={() => setShowMagnetospheres(!showMagnetospheres)} className={`retro-button ${showMagnetospheres ? 'bg-white text-black' : ''}`}>Magnetospheres</button>
            <button onClick={() => setShowGravityWells(!showGravityWells)} className={`retro-button ${showGravityWells ? 'bg-white text-black' : ''}`}>Gravity Wells (G)</button>
            <button onClick={() => setShowSpacetimeGrid(!showSpacetimeGrid)} className={`retro-button ${showSpacetimeGrid ? 'bg-white text-black' : ''}`}>Spacetime Grid (F)</button>
            <button onClick={() => setShowMagneticFields(!showMagneticFields)} className={`retro-button ${showMagneticFields ? 'bg-white text-black' : ''}`}>Magnetic Fields</button>
            <button onClick={() => setShowLensing(!showLensing)} className={`retro-button ${showLensing ? 'bg-white text-black' : ''}`}>Lensing</button>
            <button onClick={() => setShowLagrange(!showLagrange)} className={`retro-button ${showLagrange ? 'bg-white text-black' : ''}`}>Lagrange Pts</button>
            <button onClick={() => setShowHillSpheres(!showHillSpheres)} className={`retro-button ${showHillSpheres ? 'bg-white text-black' : ''}`}>Hill Spheres</button>
            <button onClick={() => setShowGravityInfluence(!showGravityInfluence)} className={`retro-button ${showGravityInfluence ? 'bg-white text-black' : ''}`}>Gravity Influence</button>
          </div>
          <div className="section-title">Distance Scale</div>
          <select 
            value={scaleUnit} 
            onChange={(e) => setScaleUnit(e.target.value as any)}
            className="retro-select w-full mt-1"
          >
            <option value="AU">AU (Astron. Units)</option>
            <option value="Mmi">Millions of Miles</option>
            <option value="Mkm">Millions of Km</option>
            <option value="lm">Light Minutes</option>
          </select>
          <div className="section-title">Camera</div>
          <button onClick={() => { setZoom(0.12); setPan({x: 0, y: 0}); }} className="retro-button w-full">Reset View</button>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <div className="bg-black p-6 retro-border max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">KEYBOARD SHORTCUTS</h2>
              <button onClick={() => setShowHelp(false)} className="retro-button">X</button>
            </div>
            <ul className="text-xs space-y-2">
              <li><strong>Click & Drag</strong>: Create particle with velocity</li>
              <li><strong>Shift + Drag</strong>: Pan camera</li>
              <li><strong>Arrow Keys</strong>: Move camera</li>
              <li><strong>+ / -</strong>: Zoom in/out</li>
              <li><strong>[ / ] or &lt; / &gt; or , / .</strong>: Time step speed</li>
              <li><strong>Mouse Wheel</strong>: Zoom in/out</li>
              <li><strong>Space</strong>: Pause simulation</li>
              <li><strong>C</strong>: Clear canvas (Reset View/Time)</li>
              <li><strong>D</strong>: Create protodisk</li>
              <li><strong>T</strong>: Toggle trails</li>
              <li><strong>G</strong>: Toggle gravity wells</li>
              <li><strong>F</strong>: Toggle spacetime grid</li>
              <li><strong>O</strong>: Toggle orbits</li>
              <li><strong>N</strong>: Toggle names</li>
              <li><strong>M</strong>: Toggle mass labels</li>
            </ul>

            <div className="mt-4 pt-4 border-t border-white/20">
              <h3 className="text-sm font-bold mb-2 uppercase tracking-tighter text-cyan-400">Accessibility</h3>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Mobile Controls (On-screen)</span>
                  <button 
                    onClick={() => setShowMobileControls(!showMobileControls)}
                    className={`retro-button px-2 py-1 ${showMobileControls ? 'bg-cyan-900' : ''}`}
                  >
                    {showMobileControls ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-[10px] text-gray-400">
              Gravity Toy v1.2025 - Recreated for AI Studio
            </div>
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      {showMobileControls && (
        <div className="absolute bottom-24 right-4 flex flex-col items-end gap-4 z-30 pointer-events-none">
          {/* Zoom Controls */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            <button 
              onClick={() => handleZoom(1.1, window.innerWidth/2, window.innerHeight/2)}
              className="retro-button p-3 bg-black/80 border-cyan-500/50 hover:bg-cyan-900/50"
              title="Zoom In"
            >
              <ZoomIn size={24} />
            </button>
            <button 
              onClick={() => handleZoom(1/1.1, window.innerWidth/2, window.innerHeight/2)}
              className="retro-button p-3 bg-black/80 border-cyan-500/50 hover:bg-cyan-900/50"
              title="Zoom Out"
            >
              <ZoomOut size={24} />
            </button>
          </div>

          {/* D-Pad Navigation */}
          <div className="grid grid-cols-3 gap-1 pointer-events-auto">
            <div />
            <button 
              onClick={() => setPan(prev => ({ ...prev, y: prev.y + 50 }))}
              className="retro-button p-3 bg-black/80 border-cyan-500/50 hover:bg-cyan-900/50"
            >
              <ArrowUp size={24} />
            </button>
            <div />
            <button 
              onClick={() => setPan(prev => ({ ...prev, x: prev.x + 50 }))}
              className="retro-button p-3 bg-black/80 border-cyan-500/50 hover:bg-cyan-900/50"
            >
              <ArrowLeft size={24} />
            </button>
            <button 
              onClick={() => { setZoom(0.12); setPan({x: 0, y: 0}); }}
              className="retro-button p-3 bg-black/80 border-cyan-500/50 hover:bg-cyan-900/50 text-[10px] font-bold"
            >
              RESET
            </button>
            <button 
              onClick={() => setPan(prev => ({ ...prev, x: prev.x - 50 }))}
              className="retro-button p-3 bg-black/80 border-cyan-500/50 hover:bg-cyan-900/50"
            >
              <ArrowRight size={24} />
            </button>
            <div />
            <button 
              onClick={() => setPan(prev => ({ ...prev, y: prev.y - 50 }))}
              className="retro-button p-3 bg-black/80 border-cyan-500/50 hover:bg-cyan-900/50"
            >
              <ArrowDown size={24} />
            </button>
            <div />
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-black/70 p-1 px-3 text-[11px] flex justify-between items-center retro-border border-x-0 border-b-0 z-10">
        <div className="flex gap-4">
          <span>TIME: {simulationTime.toFixed(2)}</span>
          <span>ZOOM: {zoom.toFixed(2)}x</span>
          <span>PAN: ({Math.round(pan.x)}, {Math.round(pan.y)})</span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-2 items-center bg-cyan-900/30 px-2 py-0.5 rounded border border-cyan-500/30">
          <Zap size={10} className="text-cyan-400" />
          <span className="font-mono text-cyan-400">SPEED: {(simSpeed * 500).toFixed(2)}x</span>
        </div>
        <div className="flex gap-4">
          <span>MODE: {gravityMode}</span>
          <span>FPS: {fps}</span>
        </div>
      </div>
    </div>
  );
}

// ========================================
// GLOBE RENDERER - Ultra-Detailed Canvas 2D Globe
// With realistic terrain, weather, traffic, and effects
// ========================================

class GlobeRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.rotation = 0;
    this.rotationSpeed = 0.005;
    this.satellites = [];
    this.animationId = null;
    this.time = 0;

    // Colors from CSS variables
    this.primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color').trim() || '#00ff88';
    this.secondaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--secondary-color').trim() || '#00ccff';
    this.warningColor = '#ff5500';

    // Sun position (for day/night terminator)
    this.sunLon = -30;
    this.sunLat = 15;

    // Generate all static data
    this.stars = this.generateStars(200);
    this.cities = this.getCityData();
    this.continents = this.getContinentData();
    this.rivers = this.getRiverData();
    this.mountains = this.getMountainData();
    this.deserts = this.getDesertData();
    this.shippingLanes = this.getShippingLanes();
    this.flightPaths = this.getFlightPaths();

    // Animated elements
    this.ships = this.generateShips(12);
    this.planes = this.generatePlanes(8);
    this.storms = this.generateStorms(3);
    this.oceanCurrents = this.getOceanCurrents();

    // Initialize satellites
    this.initSatellites();

    // Network Connection Lines
    this.connectionLines = [];
    this.maxConnections = 4;
    this.lastConnectionTime = 0;
    this.connectionInterval = 2000 + Math.random() * 3000;

    // Radar Sweep
    this.radarAngle = 0;
    this.radarSpeed = (Math.PI * 2) / 360;

    // Pulse Rings from Satellites
    this.pulseRings = [];

    // Target Lock Animation
    this.targetLock = null;
    this.lastTargetTime = 0;
    this.targetInterval = 10000 + Math.random() * 10000;

    // Effects enabled state
    this.effectsEnabled = true;

    // FPS control
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / 30;
  }

  initSatellites() {
    const satNames = ['SAT-001', 'SAT-002', 'SAT-003', 'SAT-004', 'SAT-005', 'SAT-006', 'SAT-007', 'SAT-008'];
    const satTypes = ['KEYHOLE', 'LACROSSE', 'MENTOR', 'ORION', 'VORTEX', 'TRUMPET'];
    const inclinations = [45, -30, 60, -15, 35, -50, 20, -40];

    this.satellites = satNames.map((name, i) => ({
      id: name,
      type: satTypes[i % satTypes.length],
      lat: (Math.random() - 0.5) * 140,
      lon: Math.random() * 360 - 180,
      alt: 300 + Math.random() * 400,
      orbitalSpeed: 0.001 + Math.random() * 0.002,
      blinkPhase: Math.random() * Math.PI * 2,
      inclination: inclinations[i],
      orbitPhase: Math.random() * Math.PI * 2,
      orbitColor: i % 2 === 0 ? 'secondary' : 'warning'
    }));
  }

  generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.3,
        brightness: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 2 + 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.1 ? 'warm' : (Math.random() < 0.1 ? 'cool' : 'white')
      });
    }
    return stars;
  }

  generateShips(count) {
    const ships = [];
    for (let i = 0; i < count; i++) {
      const lane = this.shippingLanes ? this.shippingLanes[i % this.shippingLanes.length] : null;
      ships.push({
        progress: Math.random(),
        speed: 0.0005 + Math.random() * 0.0003,
        laneIndex: i % 6,
        size: 1.5 + Math.random()
      });
    }
    return ships;
  }

  generatePlanes(count) {
    const planes = [];
    for (let i = 0; i < count; i++) {
      planes.push({
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.001,
        pathIndex: i % 6,
        altitude: 0.02 + Math.random() * 0.01
      });
    }
    return planes;
  }

  generateStorms(count) {
    const storms = [];
    for (let i = 0; i < count; i++) {
      storms.push({
        lon: Math.random() * 360 - 180,
        lat: (Math.random() - 0.5) * 60,
        size: 8 + Math.random() * 12,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.02 + Math.random() * 0.02,
        intensity: 0.5 + Math.random() * 0.5,
        drift: { lon: (Math.random() - 0.5) * 0.1, lat: (Math.random() - 0.5) * 0.02 }
      });
    }
    return storms;
  }

  getCityData() {
    return [
      // North America
      { lon: -74, lat: 40.7, name: 'New York', intensity: 1.0, pop: 8.3 },
      { lon: -118.2, lat: 34, name: 'Los Angeles', intensity: 0.95, pop: 4 },
      { lon: -87.6, lat: 41.9, name: 'Chicago', intensity: 0.85, pop: 2.7 },
      { lon: -122.4, lat: 37.8, name: 'San Francisco', intensity: 0.75, pop: 0.9 },
      { lon: -95.4, lat: 29.8, name: 'Houston', intensity: 0.75, pop: 2.3 },
      { lon: -112.1, lat: 33.4, name: 'Phoenix', intensity: 0.65, pop: 1.6 },
      { lon: -75.2, lat: 40, name: 'Philadelphia', intensity: 0.7, pop: 1.6 },
      { lon: -98.5, lat: 29.4, name: 'San Antonio', intensity: 0.55, pop: 1.5 },
      { lon: -117.2, lat: 32.7, name: 'San Diego', intensity: 0.6, pop: 1.4 },
      { lon: -96.8, lat: 32.8, name: 'Dallas', intensity: 0.7, pop: 1.3 },
      { lon: -80.2, lat: 25.8, name: 'Miami', intensity: 0.7, pop: 0.5 },
      { lon: -84.4, lat: 33.7, name: 'Atlanta', intensity: 0.65, pop: 0.5 },
      { lon: -71.1, lat: 42.4, name: 'Boston', intensity: 0.65, pop: 0.7 },
      { lon: -122.3, lat: 47.6, name: 'Seattle', intensity: 0.6, pop: 0.7 },
      { lon: -105, lat: 39.7, name: 'Denver', intensity: 0.55, pop: 0.7 },
      { lon: -123.1, lat: 49.3, name: 'Vancouver', intensity: 0.55, pop: 0.7 },
      { lon: -79.4, lat: 43.7, name: 'Toronto', intensity: 0.75, pop: 2.9 },
      { lon: -73.6, lat: 45.5, name: 'Montreal', intensity: 0.6, pop: 1.8 },
      { lon: -99.1, lat: 19.4, name: 'Mexico City', intensity: 0.95, pop: 9.2 },
      { lon: -103.3, lat: 20.7, name: 'Guadalajara', intensity: 0.55, pop: 1.5 },
      // Europe
      { lon: -0.1, lat: 51.5, name: 'London', intensity: 1.0, pop: 9 },
      { lon: 2.3, lat: 48.9, name: 'Paris', intensity: 0.95, pop: 2.2 },
      { lon: 13.4, lat: 52.5, name: 'Berlin', intensity: 0.75, pop: 3.6 },
      { lon: 12.5, lat: 41.9, name: 'Rome', intensity: 0.7, pop: 2.9 },
      { lon: -3.7, lat: 40.4, name: 'Madrid', intensity: 0.75, pop: 3.2 },
      { lon: 2.2, lat: 41.4, name: 'Barcelona', intensity: 0.65, pop: 1.6 },
      { lon: 4.9, lat: 52.4, name: 'Amsterdam', intensity: 0.6, pop: 0.9 },
      { lon: 4.4, lat: 50.8, name: 'Brussels', intensity: 0.55, pop: 1.2 },
      { lon: 9.2, lat: 45.5, name: 'Milan', intensity: 0.65, pop: 1.4 },
      { lon: 16.4, lat: 48.2, name: 'Vienna', intensity: 0.6, pop: 1.9 },
      { lon: 21, lat: 52.2, name: 'Warsaw', intensity: 0.6, pop: 1.8 },
      { lon: 14.4, lat: 50.1, name: 'Prague', intensity: 0.55, pop: 1.3 },
      { lon: 19.1, lat: 47.5, name: 'Budapest', intensity: 0.5, pop: 1.8 },
      { lon: 24.1, lat: 57, name: 'Riga', intensity: 0.35, pop: 0.6 },
      { lon: 18.1, lat: 59.3, name: 'Stockholm', intensity: 0.55, pop: 1 },
      { lon: 10.8, lat: 59.9, name: 'Oslo', intensity: 0.45, pop: 0.7 },
      { lon: 12.6, lat: 55.7, name: 'Copenhagen', intensity: 0.5, pop: 0.6 },
      { lon: 24.9, lat: 60.2, name: 'Helsinki', intensity: 0.45, pop: 0.7 },
      { lon: -9.1, lat: 38.7, name: 'Lisbon', intensity: 0.5, pop: 0.5 },
      { lon: 23.7, lat: 38, name: 'Athens', intensity: 0.55, pop: 0.7 },
      // Asia
      { lon: 139.7, lat: 35.7, name: 'Tokyo', intensity: 1.0, pop: 14 },
      { lon: 135.5, lat: 34.7, name: 'Osaka', intensity: 0.8, pop: 2.7 },
      { lon: 121.5, lat: 31.2, name: 'Shanghai', intensity: 1.0, pop: 27 },
      { lon: 116.4, lat: 39.9, name: 'Beijing', intensity: 0.95, pop: 21 },
      { lon: 114.1, lat: 22.5, name: 'Shenzhen', intensity: 0.85, pop: 12 },
      { lon: 113.3, lat: 23.1, name: 'Guangzhou', intensity: 0.85, pop: 14 },
      { lon: 120.2, lat: 30.3, name: 'Hangzhou', intensity: 0.65, pop: 10 },
      { lon: 104.1, lat: 30.7, name: 'Chengdu', intensity: 0.7, pop: 16 },
      { lon: 106.5, lat: 29.6, name: 'Chongqing', intensity: 0.75, pop: 15 },
      { lon: 118.8, lat: 32, name: 'Nanjing', intensity: 0.6, pop: 8.5 },
      { lon: 117, lat: 36.7, name: 'Jinan', intensity: 0.5, pop: 7 },
      { lon: 126.9, lat: 37.5, name: 'Seoul', intensity: 0.9, pop: 10 },
      { lon: 127, lat: 37.4, name: 'Incheon', intensity: 0.5, pop: 3 },
      { lon: 114.2, lat: 22.3, name: 'Hong Kong', intensity: 0.85, pop: 7.5 },
      { lon: 121.5, lat: 25, name: 'Taipei', intensity: 0.7, pop: 2.6 },
      { lon: 103.8, lat: 1.3, name: 'Singapore', intensity: 0.8, pop: 5.7 },
      { lon: 100.5, lat: 13.8, name: 'Bangkok', intensity: 0.8, pop: 10 },
      { lon: 106.8, lat: -6.2, name: 'Jakarta', intensity: 0.85, pop: 10.5 },
      { lon: 101.7, lat: 3.1, name: 'Kuala Lumpur', intensity: 0.6, pop: 1.8 },
      { lon: 106.7, lat: 10.8, name: 'Ho Chi Minh', intensity: 0.7, pop: 9 },
      { lon: 105.8, lat: 21, name: 'Hanoi', intensity: 0.6, pop: 8 },
      { lon: 96.2, lat: 16.8, name: 'Yangon', intensity: 0.5, pop: 5.2 },
      { lon: 120.6, lat: 14.6, name: 'Manila', intensity: 0.75, pop: 1.8 },
      // South Asia
      { lon: 72.9, lat: 19.1, name: 'Mumbai', intensity: 0.95, pop: 20 },
      { lon: 77.2, lat: 28.6, name: 'Delhi', intensity: 1.0, pop: 31 },
      { lon: 77.6, lat: 13, name: 'Bangalore', intensity: 0.7, pop: 12 },
      { lon: 80.3, lat: 13.1, name: 'Chennai', intensity: 0.65, pop: 11 },
      { lon: 88.4, lat: 22.6, name: 'Kolkata', intensity: 0.8, pop: 14.8 },
      { lon: 78.5, lat: 17.4, name: 'Hyderabad', intensity: 0.65, pop: 10 },
      { lon: 73.9, lat: 18.5, name: 'Pune', intensity: 0.55, pop: 6.6 },
      { lon: 72.6, lat: 23, name: 'Ahmedabad', intensity: 0.55, pop: 8 },
      { lon: 67, lat: 24.9, name: 'Karachi', intensity: 0.8, pop: 15 },
      { lon: 74.3, lat: 31.5, name: 'Lahore', intensity: 0.65, pop: 12 },
      { lon: 90.4, lat: 23.8, name: 'Dhaka', intensity: 0.85, pop: 22 },
      // Middle East
      { lon: 55.3, lat: 25.3, name: 'Dubai', intensity: 0.75, pop: 3.4 },
      { lon: 54.4, lat: 24.5, name: 'Abu Dhabi', intensity: 0.5, pop: 1.5 },
      { lon: 46.7, lat: 24.7, name: 'Riyadh', intensity: 0.7, pop: 7.7 },
      { lon: 39.2, lat: 21.4, name: 'Jeddah', intensity: 0.55, pop: 4.1 },
      { lon: 51.5, lat: 35.7, name: 'Tehran', intensity: 0.8, pop: 9 },
      { lon: 44.4, lat: 33.3, name: 'Baghdad', intensity: 0.6, pop: 7.5 },
      { lon: 35.5, lat: 33.9, name: 'Beirut', intensity: 0.45, pop: 2.4 },
      { lon: 34.8, lat: 32.1, name: 'Tel Aviv', intensity: 0.55, pop: 0.5 },
      { lon: 29, lat: 41, name: 'Istanbul', intensity: 0.85, pop: 15.5 },
      { lon: 32.9, lat: 39.9, name: 'Ankara', intensity: 0.55, pop: 5.5 },
      // Russia
      { lon: 37.6, lat: 55.8, name: 'Moscow', intensity: 0.9, pop: 12.5 },
      { lon: 30.3, lat: 59.9, name: 'St Petersburg', intensity: 0.7, pop: 5.4 },
      { lon: 56.3, lat: 58, name: 'Yekaterinburg', intensity: 0.45, pop: 1.5 },
      { lon: 82.9, lat: 55, name: 'Novosibirsk', intensity: 0.45, pop: 1.6 },
      // Africa
      { lon: 31.2, lat: 30, name: 'Cairo', intensity: 0.85, pop: 21 },
      { lon: 32.9, lat: 24.1, name: 'Aswan', intensity: 0.25, pop: 0.3 },
      { lon: 3.4, lat: 6.5, name: 'Lagos', intensity: 0.85, pop: 15 },
      { lon: 7.5, lat: 9, name: 'Abuja', intensity: 0.45, pop: 3.5 },
      { lon: -7.6, lat: 33.6, name: 'Casablanca', intensity: 0.5, pop: 3.4 },
      { lon: 36.8, lat: -1.3, name: 'Nairobi', intensity: 0.55, pop: 4.4 },
      { lon: 32.6, lat: 0.3, name: 'Kampala', intensity: 0.4, pop: 1.7 },
      { lon: 39.3, lat: -6.8, name: 'Dar es Salaam', intensity: 0.45, pop: 6.7 },
      { lon: 28, lat: -26.2, name: 'Johannesburg', intensity: 0.7, pop: 5.6 },
      { lon: 18.4, lat: -33.9, name: 'Cape Town', intensity: 0.55, pop: 4.6 },
      { lon: 28.2, lat: -25.7, name: 'Pretoria', intensity: 0.5, pop: 2.5 },
      { lon: 31, lat: -30, name: 'Durban', intensity: 0.45, pop: 3.7 },
      { lon: 47.5, lat: -19, name: 'Antananarivo', intensity: 0.35, pop: 1.4 },
      { lon: 3.1, lat: 36.8, name: 'Algiers', intensity: 0.5, pop: 3.4 },
      { lon: 10.2, lat: 36.8, name: 'Tunis', intensity: 0.4, pop: 0.7 },
      // South America
      { lon: -46.6, lat: -23.5, name: 'Sao Paulo', intensity: 0.95, pop: 12.3 },
      { lon: -43.2, lat: -22.9, name: 'Rio', intensity: 0.8, pop: 6.7 },
      { lon: -58.4, lat: -34.6, name: 'Buenos Aires', intensity: 0.8, pop: 3 },
      { lon: -70.7, lat: -33.4, name: 'Santiago', intensity: 0.65, pop: 6.8 },
      { lon: -77, lat: -12, name: 'Lima', intensity: 0.7, pop: 10.7 },
      { lon: -74.1, lat: 4.6, name: 'Bogota', intensity: 0.7, pop: 7.4 },
      { lon: -66.9, lat: 10.5, name: 'Caracas', intensity: 0.55, pop: 2.1 },
      { lon: -79.5, lat: -0.2, name: 'Quito', intensity: 0.45, pop: 1.9 },
      { lon: -68.1, lat: -16.5, name: 'La Paz', intensity: 0.4, pop: 0.8 },
      { lon: -56.2, lat: -34.9, name: 'Montevideo', intensity: 0.4, pop: 1.4 },
      { lon: -47.9, lat: -15.8, name: 'Brasilia', intensity: 0.5, pop: 3 },
      // Oceania
      { lon: 151.2, lat: -33.9, name: 'Sydney', intensity: 0.75, pop: 5.3 },
      { lon: 145, lat: -37.8, name: 'Melbourne', intensity: 0.7, pop: 5 },
      { lon: 153, lat: -27.5, name: 'Brisbane', intensity: 0.5, pop: 2.5 },
      { lon: 115.9, lat: -32, name: 'Perth', intensity: 0.45, pop: 2.1 },
      { lon: 174.8, lat: -41.3, name: 'Wellington', intensity: 0.35, pop: 0.2 },
      { lon: 174.7, lat: -36.8, name: 'Auckland', intensity: 0.45, pop: 1.7 },
    ];
  }

  getRiverData() {
    return {
      nile: [
        [31.2, 30], [31.5, 27], [32, 24], [32.5, 22], [33, 19],
        [33.5, 16], [32.5, 14], [31, 10], [33, 5], [35, 0]
      ],
      amazon: [
        [-50, -2], [-55, -3], [-60, -4], [-65, -5], [-70, -5],
        [-73, -4], [-75, -5], [-77, -4]
      ],
      mississippi: [
        [-89, 29], [-91, 32], [-90, 35], [-91, 38], [-92, 40],
        [-93, 43], [-94, 45], [-95, 47]
      ],
      yangtze: [
        [122, 31], [118, 32], [114, 30], [110, 30], [106, 30],
        [104, 29], [100, 28], [97, 28]
      ],
      ganges: [
        [88, 22], [85, 25], [82, 26], [80, 27], [78, 28]
      ],
      danube: [
        [29, 45], [26, 44], [22, 44], [18, 46], [15, 48], [10, 48]
      ],
      congo: [
        [12, -6], [16, -4], [20, -2], [23, 0], [26, 2], [28, 3]
      ],
      mekong: [
        [106, 10], [105, 12], [104, 15], [100, 18], [100, 22], [98, 26]
      ]
    };
  }

  getMountainData() {
    return {
      himalayas: { points: [[75, 28], [80, 30], [85, 28], [90, 27], [95, 28]], height: 1.0 },
      alps: { points: [[6, 46], [10, 47], [14, 47]], height: 0.6 },
      rockies: { points: [[-120, 35], [-115, 40], [-112, 45], [-114, 50]], height: 0.7 },
      andes: { points: [[-70, -35], [-70, -25], [-72, -15], [-75, -5], [-78, 5]], height: 0.8 },
      urals: { points: [[60, 50], [59, 55], [58, 60], [60, 65]], height: 0.4 },
      atlas: { points: [[-5, 32], [0, 34], [5, 35]], height: 0.35 },
      greatDividingRange: { points: [[145, -38], [148, -34], [150, -30], [148, -25]], height: 0.3 }
    };
  }

  getDesertData() {
    return [
      { name: 'Sahara', points: [[-15, 18], [0, 22], [15, 25], [30, 22], [35, 18], [25, 12], [10, 14], [-5, 16], [-15, 18]] },
      { name: 'Arabian', points: [[35, 30], [50, 28], [55, 22], [50, 15], [40, 18], [35, 25], [35, 30]] },
      { name: 'Gobi', points: [[95, 45], [105, 45], [115, 42], [110, 38], [100, 38], [95, 42], [95, 45]] },
      { name: 'Kalahari', points: [[18, -22], [25, -22], [26, -28], [20, -28], [18, -22]] },
      { name: 'Australian', points: [[125, -22], [135, -20], [142, -25], [138, -30], [128, -28], [125, -22]] },
      { name: 'Atacama', points: [[-70, -18], [-68, -22], [-70, -28], [-72, -25], [-70, -18]] }
    ];
  }

  getShippingLanes() {
    return [
      { name: 'TransAtlantic', points: [[-74, 40], [-60, 42], [-40, 45], [-20, 48], [-5, 50]] },
      { name: 'TransPacific', points: [[140, 35], [160, 38], [-180, 42], [-160, 40], [-140, 38], [-125, 35]] },
      { name: 'Suez-Asia', points: [[32, 30], [45, 20], [65, 15], [80, 10], [100, 5], [115, 5]] },
      { name: 'Panama-Asia', points: [[-80, 9], [-100, 15], [-120, 20], [-140, 25], [-160, 30]] },
      { name: 'Europe-Africa', points: [[-5, 36], [-10, 28], [-15, 15], [-5, 5], [5, -5]] },
      { name: 'Asia-Australia', points: [[120, 5], [125, -5], [135, -15], [145, -25], [150, -33]] }
    ];
  }

  getFlightPaths() {
    return [
      { name: 'NYC-London', start: [-74, 40.7], end: [-0.1, 51.5] },
      { name: 'LA-Tokyo', start: [-118.2, 34], end: [139.7, 35.7] },
      { name: 'Dubai-Singapore', start: [55.3, 25.3], end: [103.8, 1.3] },
      { name: 'Sydney-LA', start: [151.2, -33.9], end: [-118.2, 34] },
      { name: 'London-HK', start: [-0.1, 51.5], end: [114.2, 22.3] },
      { name: 'Paris-NYC', start: [2.3, 48.9], end: [-74, 40.7] }
    ];
  }

  getOceanCurrents() {
    return [
      { name: 'GulfStream', points: [[-80, 25], [-75, 30], [-65, 38], [-50, 45], [-30, 50], [-10, 52]] },
      { name: 'Kuroshio', points: [[125, 20], [135, 30], [145, 38], [155, 42]] },
      { name: 'Antarctic', points: [[-60, -55], [0, -58], [60, -55], [120, -58], [180, -55]] }
    ];
  }

  getContinentData() {
    return {
      northAmerica: [
        [-168, 65], [-165, 63], [-162, 60], [-155, 58], [-150, 60], [-145, 60],
        [-140, 60], [-137, 58], [-135, 56], [-133, 54], [-130, 52], [-128, 50],
        [-126, 48], [-124, 45], [-123, 42], [-120, 38], [-118, 35], [-117, 33],
        [-115, 32], [-112, 31], [-110, 30], [-105, 28], [-100, 26], [-97, 26],
        [-95, 28], [-93, 29], [-90, 29], [-88, 30], [-85, 30], [-83, 29],
        [-82, 27], [-80, 25], [-81, 28], [-80, 30], [-78, 33], [-76, 35],
        [-75, 37], [-74, 39], [-72, 41], [-71, 42], [-70, 43], [-68, 44],
        [-67, 45], [-66, 44], [-65, 45], [-64, 46], [-63, 47], [-60, 47],
        [-58, 49], [-55, 50], [-53, 52], [-56, 53], [-60, 55], [-63, 58],
        [-68, 60], [-72, 63], [-78, 68], [-85, 70], [-95, 72], [-105, 73],
        [-115, 72], [-125, 71], [-135, 70], [-145, 70], [-155, 70], [-162, 68],
        [-168, 65]
      ],
      centralAmerica: [
        [-105, 22], [-102, 20], [-98, 18], [-95, 17], [-92, 16], [-90, 16],
        [-88, 15], [-86, 14], [-84, 12], [-83, 10], [-82, 9], [-80, 8],
        [-78, 8], [-77, 9], [-80, 10], [-82, 11], [-84, 12], [-86, 14],
        [-88, 15], [-92, 17], [-96, 19], [-100, 21], [-105, 22]
      ],
      southAmerica: [
        [-80, 10], [-78, 10], [-75, 11], [-72, 12], [-70, 12], [-67, 11],
        [-63, 10], [-60, 8], [-58, 6], [-54, 4], [-51, 2], [-48, 0],
        [-45, -2], [-42, -3], [-38, -5], [-36, -7], [-35, -10], [-36, -15],
        [-38, -18], [-40, -20], [-43, -22], [-46, -24], [-48, -26], [-50, -28],
        [-52, -30], [-54, -32], [-56, -34], [-58, -38], [-62, -42], [-65, -46],
        [-67, -50], [-69, -52], [-72, -54], [-74, -52], [-74, -48], [-73, -44],
        [-72, -40], [-71, -36], [-70, -32], [-70, -28], [-70, -24], [-70, -20],
        [-72, -18], [-75, -15], [-77, -12], [-78, -8], [-79, -5], [-80, -2],
        [-80, 2], [-80, 5], [-80, 8], [-80, 10]
      ],
      europe: [
        [-10, 36], [-9, 38], [-9, 40], [-8, 42], [-5, 43], [-2, 43], [0, 43],
        [3, 43], [5, 44], [7, 44], [8, 46], [10, 46], [12, 45], [14, 45],
        [16, 46], [17, 48], [19, 49], [21, 50], [23, 51], [24, 53], [22, 55],
        [21, 56], [23, 57], [25, 58], [27, 59], [29, 60], [28, 62], [26, 64],
        [24, 66], [22, 68], [20, 70], [17, 69], [14, 68], [12, 66], [10, 64],
        [8, 62], [6, 60], [5, 58], [4, 56], [4, 54], [5, 52], [4, 50],
        [2, 49], [0, 48], [-2, 48], [-4, 48], [-5, 47], [-4, 45], [-6, 44],
        [-8, 43], [-9, 41], [-10, 36]
      ],
      africa: [
        [-17, 15], [-17, 18], [-16, 21], [-14, 24], [-13, 27], [-10, 30],
        [-6, 33], [-3, 35], [0, 36], [5, 37], [10, 37], [15, 35], [20, 33],
        [25, 32], [30, 31], [33, 32], [35, 30], [37, 27], [40, 22], [43, 15],
        [48, 10], [51, 8], [49, 4], [46, 0], [42, -4], [40, -8], [38, -12],
        [37, -16], [35, -20], [33, -24], [30, -28], [28, -32], [25, -34],
        [20, -34], [18, -32], [16, -28], [15, -24], [13, -18], [12, -12],
        [10, -6], [8, 0], [5, 5], [2, 6], [-2, 5], [-5, 5], [-8, 6],
        [-12, 8], [-15, 11], [-17, 15]
      ],
      asia: [
        [26, 41], [29, 41], [32, 42], [35, 40], [38, 38], [42, 40], [46, 40],
        [50, 38], [53, 38], [56, 40], [60, 42], [65, 42], [70, 40], [74, 38],
        [76, 35], [78, 32], [80, 30], [85, 28], [88, 27], [90, 25], [92, 22],
        [96, 18], [100, 16], [102, 14], [105, 18], [108, 20], [112, 22],
        [116, 23], [120, 24], [122, 28], [124, 32], [128, 35], [132, 36],
        [136, 36], [140, 38], [142, 42], [144, 46], [148, 52], [155, 58],
        [162, 62], [170, 64], [175, 66], [180, 68], [175, 70], [165, 72],
        [150, 73], [135, 74], [120, 74], [105, 75], [90, 73], [75, 72],
        [65, 70], [55, 68], [50, 65], [45, 60], [42, 55], [40, 50], [35, 45],
        [30, 42], [26, 41]
      ],
      middleEast: [
        [35, 32], [37, 34], [40, 36], [44, 38], [48, 38], [52, 36], [56, 32],
        [60, 28], [62, 24], [60, 20], [56, 18], [52, 16], [48, 14], [44, 12],
        [42, 14], [40, 18], [36, 22], [34, 26], [34, 30], [35, 32]
      ],
      india: [
        [68, 24], [70, 22], [72, 20], [74, 18], [76, 15], [78, 12], [80, 10],
        [82, 8], [80, 10], [78, 14], [76, 18], [74, 20], [72, 22], [70, 24],
        [68, 24]
      ],
      seAsia: [
        [100, 6], [102, 4], [104, 2], [106, 0], [108, -2], [110, -4],
        [112, -6], [115, -8], [118, -8], [120, -6], [118, -4], [116, -2],
        [114, 0], [112, 2], [108, 4], [104, 6], [100, 6]
      ],
      australia: [
        [114, -22], [116, -20], [120, -18], [125, -15], [130, -12], [136, -12],
        [140, -14], [145, -16], [148, -20], [150, -24], [153, -28], [152, -32],
        [150, -35], [147, -38], [144, -39], [140, -38], [136, -36], [132, -34],
        [128, -32], [124, -32], [120, -33], [116, -34], [114, -32], [114, -28],
        [113, -24], [114, -22]
      ],
      indonesia: [
        [95, 6], [98, 4], [100, 2], [102, 0], [105, -3], [108, -6], [112, -7],
        [116, -8], [120, -8], [124, -8], [128, -6], [132, -4], [136, -2],
        [140, -4], [140, -8], [136, -8], [132, -9], [128, -10], [124, -10],
        [120, -10], [116, -10], [112, -8], [108, -7], [104, -6], [100, -4],
        [96, -1], [95, 3], [95, 6]
      ],
      japan: [
        [130, 31], [131, 33], [133, 34], [135, 35], [137, 35], [139, 36],
        [141, 38], [142, 40], [143, 42], [145, 44], [144, 43], [142, 41],
        [140, 39], [138, 37], [136, 36], [134, 35], [132, 33], [130, 31]
      ],
      uk: [
        [-6, 50], [-5, 51], [-4, 52], [-4, 54], [-5, 55], [-6, 57], [-5, 58],
        [-3, 58], [-2, 57], [0, 55], [1, 53], [1, 51], [0, 50], [-2, 50],
        [-4, 50], [-6, 50]
      ],
      ireland: [
        [-10, 52], [-9, 53], [-8, 54], [-7, 55], [-6, 55], [-6, 53], [-7, 52],
        [-9, 51], [-10, 52]
      ],
      greenland: [
        [-45, 60], [-43, 62], [-40, 65], [-35, 70], [-28, 74], [-22, 77],
        [-20, 80], [-28, 82], [-40, 83], [-50, 82], [-58, 78], [-60, 74],
        [-56, 70], [-52, 66], [-48, 62], [-45, 60]
      ],
      iceland: [
        [-24, 64], [-22, 65], [-18, 66], [-15, 66], [-14, 65], [-16, 64],
        [-20, 63], [-24, 64]
      ],
      newZealand: [
        [166, -46], [168, -44], [171, -42], [174, -39], [177, -37], [178, -38],
        [177, -40], [176, -42], [174, -44], [170, -46], [168, -47], [166, -46]
      ],
      madagascar: [
        [44, -12], [46, -14], [48, -16], [50, -18], [50, -22], [48, -25],
        [46, -25], [44, -24], [43, -20], [43, -16], [44, -12]
      ],
      philippines: [
        [118, 18], [120, 18], [122, 16], [124, 14], [126, 12], [126, 8],
        [124, 6], [122, 8], [120, 10], [118, 14], [118, 18]
      ],
      cuba: [
        [-85, 22], [-82, 23], [-78, 22], [-75, 20], [-78, 20], [-82, 21],
        [-85, 22]
      ],
      sriLanka: [
        [80, 10], [81, 8], [82, 7], [81, 6], [80, 7], [79, 8], [80, 10]
      ],
      taiwan: [
        [120, 22], [121, 24], [122, 25], [121, 25], [120, 24], [120, 22]
      ],
      borneo: [
        [109, 7], [112, 5], [116, 4], [118, 5], [119, 7], [117, 5], [115, 3],
        [113, 1], [110, 2], [109, 4], [109, 7]
      ],
      newGuinea: [
        [131, -2], [135, -4], [140, -5], [145, -6], [150, -6], [150, -8],
        [146, -8], [142, -9], [138, -8], [134, -6], [131, -4], [131, -2]
      ],
      svalbard: [
        [10, 77], [15, 78], [22, 80], [28, 80], [25, 78], [18, 76], [12, 76],
        [10, 77]
      ],
      novayaZemlya: [
        [52, 70], [55, 72], [58, 75], [62, 77], [60, 75], [56, 72], [52, 70]
      ]
    };
  }

  project(lon, lat, radius) {
    const lonRad = (lon + this.rotation * (180 / Math.PI)) * (Math.PI / 180);
    const latRad = lat * (Math.PI / 180);

    const x = radius * Math.cos(latRad) * Math.sin(lonRad);
    const y = -radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.cos(lonRad);

    const visible = z > 0;

    return {
      x: this.canvas.width / 2 + x,
      y: this.canvas.height / 2 + y,
      visible,
      depth: z / radius
    };
  }

  drawGlobe() {
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const radius = Math.min(cx, cy) - 20;

    // Clear canvas
    ctx.fillStyle = '#010204';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stars
    this.drawStars(ctx);

    // Draw atmospheric glow
    this.drawAtmosphericGlow(ctx, cx, cy, radius);

    // Draw ocean with depth shading
    this.drawOcean(ctx, cx, cy, radius);

    // Draw 3D sphere shading
    this.draw3DShading(ctx, cx, cy, radius);

    // Draw grid lines
    this.drawGridLines(ctx, radius);

    // Draw ocean currents
    this.drawOceanCurrents(ctx, radius);

    // Draw terminator line
    this.drawTerminator(ctx, radius);

    // Draw deserts (before continents for layering)
    this.drawDeserts(ctx, radius);

    // Draw continents
    this.drawContinents(ctx, radius);

    // Draw mountains
    this.drawMountains(ctx, radius);

    // Draw rivers
    this.drawRivers(ctx, radius);

    // Draw shipping lanes and ships
    this.drawShippingLanes(ctx, radius);
    this.drawShips(ctx, radius);

    // Draw flight paths and planes
    this.drawFlightPaths(ctx, radius);
    this.drawPlanes(ctx, radius);

    // Draw city lights
    this.drawCityLights(ctx, radius);

    // Draw storms
    this.drawStorms(ctx, radius);

    // Draw clouds
    this.drawCloudLayer(ctx, radius);

    // Draw polar ice caps
    this.drawPolarIceCaps(ctx, radius);

    // Draw specular highlight
    this.drawSpecularHighlight(ctx, cx, cy, radius);

    // Draw aurora
    this.drawAurora(ctx, radius);

    // Draw outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.primaryColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.primaryColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw important lines (equator, tropics)
    this.drawImportantLines(ctx, radius);

    // Draw radar sweep
    if (this.effectsEnabled) {
      this.drawRadarSweep(radius, cx, cy);
    }

    // Draw satellite trajectories
    this.drawOrbitalTrajectories(radius);

    // Draw satellites
    this.drawSatellites(radius);

    // Draw connection lines
    if (this.effectsEnabled) {
      this.drawConnectionLines(radius);
      this.drawPulseRings(radius);
      this.drawTargetLock(radius);
    }
  }

  drawStars(ctx) {
    this.stars.forEach(star => {
      const x = star.x * this.canvas.width;
      const y = star.y * this.canvas.height;

      const twinkle = Math.sin(this.time * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7;
      const brightness = star.brightness * twinkle;

      let r = 200, g = 220, b = 255;
      if (star.color === 'warm') { r = 255; g = 200; b = 150; }
      else if (star.color === 'cool') { r = 150; g = 180; b = 255; }

      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness * 0.8})`;
      ctx.fill();

      if (star.size > 1.2) {
        ctx.beginPath();
        ctx.arc(x, y, star.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness * 0.15})`;
        ctx.fill();
      }
    });
  }

  drawAtmosphericGlow(ctx, cx, cy, radius) {
    const atmosphereGradient = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.2);
    atmosphereGradient.addColorStop(0, 'transparent');
    atmosphereGradient.addColorStop(0.4, this.hexToRgba(this.secondaryColor, 0.06));
    atmosphereGradient.addColorStop(0.7, this.hexToRgba(this.primaryColor, 0.04));
    atmosphereGradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = atmosphereGradient;
    ctx.fill();
  }

  drawOcean(ctx, cx, cy, radius) {
    const oceanGradient = ctx.createRadialGradient(
      cx - radius * 0.3, cy - radius * 0.3, 0,
      cx, cy, radius
    );
    oceanGradient.addColorStop(0, 'rgba(0, 35, 55, 0.95)');
    oceanGradient.addColorStop(0.4, 'rgba(0, 28, 45, 0.95)');
    oceanGradient.addColorStop(0.7, 'rgba(0, 20, 35, 0.95)');
    oceanGradient.addColorStop(1, 'rgba(0, 12, 25, 0.98)');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = oceanGradient;
    ctx.fill();

    // Ocean texture/waves
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = this.hexToRgba(this.secondaryColor, 0.03);
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 20; i++) {
      const waveY = cy - radius + (i * radius * 2 / 20) + Math.sin(this.time + i) * 3;
      ctx.beginPath();
      ctx.moveTo(cx - radius, waveY);
      for (let x = -radius; x <= radius; x += 10) {
        const y = waveY + Math.sin((x + this.time * 20) * 0.05) * 2;
        ctx.lineTo(cx + x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  draw3DShading(ctx, cx, cy, radius) {
    const lightX = cx - radius * 0.4;
    const lightY = cy - radius * 0.4;

    const highlightGradient = ctx.createRadialGradient(lightX, lightY, 0, cx, cy, radius);
    highlightGradient.addColorStop(0, 'rgba(80, 130, 180, 0.1)');
    highlightGradient.addColorStop(0.3, 'rgba(40, 80, 120, 0.04)');
    highlightGradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    const shadowGradient = ctx.createRadialGradient(
      cx + radius * 0.5, cy + radius * 0.5, 0,
      cx, cy, radius
    );
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
    shadowGradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = shadowGradient;
    ctx.fill();

    const edgeGradient = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius);
    edgeGradient.addColorStop(0, 'transparent');
    edgeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = edgeGradient;
    ctx.fill();
  }

  drawGridLines(ctx, radius) {
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.06);
    ctx.lineWidth = 0.5;

    // Latitude lines
    for (let lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 3) {
        const p = this.project(lon, lat, radius);
        if (p.visible) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else { ctx.lineTo(p.x, p.y); }
        } else { started = false; }
      }
      ctx.stroke();
    }

    // Longitude lines
    for (let lon = -180; lon < 180; lon += 15) {
      ctx.beginPath();
      let started = false;
      for (let lat = -90; lat <= 90; lat += 3) {
        const p = this.project(lon, lat, radius);
        if (p.visible) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else { ctx.lineTo(p.x, p.y); }
        } else { started = false; }
      }
      ctx.stroke();
    }
  }

  drawOceanCurrents(ctx, radius) {
    ctx.strokeStyle = this.hexToRgba(this.secondaryColor, 0.08);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);

    this.oceanCurrents.forEach(current => {
      ctx.beginPath();
      let started = false;
      current.points.forEach(([lon, lat]) => {
        const p = this.project(lon, lat, radius * 0.99);
        if (p.visible && p.depth > 0.2) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else { ctx.lineTo(p.x, p.y); }
        } else { started = false; }
      });
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  drawTerminator(ctx, radius) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const terminatorLon = this.sunLon + 90 + this.rotation * (180 / Math.PI);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
    ctx.clip();

    const nightGradient = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
    nightGradient.addColorStop(0, 'rgba(0, 0, 20, 0.5)');
    nightGradient.addColorStop(0.4, 'rgba(0, 0, 15, 0.35)');
    nightGradient.addColorStop(0.6, 'rgba(0, 0, 10, 0.2)');
    nightGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = nightGradient;
    ctx.fillRect(cx - radius, cy - radius, radius, radius * 2);
    ctx.restore();

    // Terminator line
    ctx.strokeStyle = this.hexToRgba(this.secondaryColor, 0.12);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    let started = false;
    for (let lat = -90; lat <= 90; lat += 2) {
      const p = this.project(terminatorLon, lat, radius);
      if (p.visible) {
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else { ctx.lineTo(p.x, p.y); }
      } else { started = false; }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawDeserts(ctx, radius) {
    this.deserts.forEach(desert => {
      const visiblePoints = [];
      desert.points.forEach(([lon, lat]) => {
        const p = this.project(lon, lat, radius * 0.99);
        if (p.visible) visiblePoints.push(p);
      });

      if (visiblePoints.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      visiblePoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = this.hexToRgba('#886633', 0.12);
      ctx.fill();
    });
  }

  drawContinents(ctx, radius) {
    Object.entries(this.continents).forEach(([name, continent]) => {
      const visiblePoints = [];
      continent.forEach(([lon, lat]) => {
        const p = this.project(lon, lat, radius);
        if (p.visible) visiblePoints.push(p);
      });

      if (visiblePoints.length < 3) return;

      const avgDepth = visiblePoints.reduce((s, p) => s + p.depth, 0) / visiblePoints.length;
      const fillAlpha = 0.18 + avgDepth * 0.12;
      const strokeAlpha = 0.55 + avgDepth * 0.35;

      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      visiblePoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();

      // Land fill with texture
      ctx.fillStyle = this.hexToRgba(this.primaryColor, fillAlpha);
      ctx.fill();

      // Coastline glow
      ctx.strokeStyle = this.hexToRgba(this.primaryColor, strokeAlpha);
      ctx.lineWidth = 1.2;
      ctx.shadowColor = this.primaryColor;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner border detail
      ctx.strokeStyle = this.hexToRgba(this.primaryColor, strokeAlpha * 0.25);
      ctx.lineWidth = 0.5;
      ctx.setLineDash([1, 3]);
      const centerX = visiblePoints.reduce((s, p) => s + p.x, 0) / visiblePoints.length;
      const centerY = visiblePoints.reduce((s, p) => s + p.y, 0) / visiblePoints.length;
      ctx.beginPath();
      ctx.moveTo(centerX + (visiblePoints[0].x - centerX) * 0.92, centerY + (visiblePoints[0].y - centerY) * 0.92);
      visiblePoints.forEach(p => {
        ctx.lineTo(centerX + (p.x - centerX) * 0.92, centerY + (p.y - centerY) * 0.92);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  drawMountains(ctx, radius) {
    Object.values(this.mountains).forEach(mountain => {
      const visiblePoints = [];
      mountain.points.forEach(([lon, lat]) => {
        const p = this.project(lon, lat, radius);
        if (p.visible && p.depth > 0.3) visiblePoints.push({ p, lon, lat });
      });

      visiblePoints.forEach(({ p }) => {
        const size = 3 + mountain.height * 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size);
        ctx.lineTo(p.x + size * 0.7, p.y + size * 0.5);
        ctx.lineTo(p.x - size * 0.7, p.y + size * 0.5);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.25 * p.depth);
        ctx.fill();
        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.4 * p.depth);
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Snow cap
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - size);
        ctx.lineTo(p.x + size * 0.3, p.y - size * 0.3);
        ctx.lineTo(p.x - size * 0.3, p.y - size * 0.3);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba('#aaddff', 0.3 * p.depth);
        ctx.fill();
      });
    });
  }

  drawRivers(ctx, radius) {
    ctx.strokeStyle = this.hexToRgba(this.secondaryColor, 0.35);
    ctx.lineWidth = 1;

    Object.values(this.rivers).forEach(river => {
      ctx.beginPath();
      let started = false;
      river.forEach(([lon, lat]) => {
        const p = this.project(lon, lat, radius * 0.99);
        if (p.visible && p.depth > 0.2) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else { ctx.lineTo(p.x, p.y); }
        } else { started = false; }
      });
      ctx.stroke();
    });
  }

  drawShippingLanes(ctx, radius) {
    ctx.strokeStyle = this.hexToRgba(this.secondaryColor, 0.06);
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 15]);

    this.shippingLanes.forEach(lane => {
      ctx.beginPath();
      let started = false;
      lane.points.forEach(([lon, lat]) => {
        const p = this.project(lon, lat, radius * 0.99);
        if (p.visible) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else { ctx.lineTo(p.x, p.y); }
        } else { started = false; }
      });
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  drawShips(ctx, radius) {
    this.ships.forEach(ship => {
      ship.progress += ship.speed;
      if (ship.progress > 1) ship.progress = 0;

      const lane = this.shippingLanes[ship.laneIndex % this.shippingLanes.length];
      if (!lane) return;

      const pos = this.interpolatePath(lane.points, ship.progress);
      const p = this.project(pos.lon, pos.lat, radius * 0.99);

      if (p.visible && p.depth > 0.2) {
        ctx.fillStyle = this.hexToRgba('#ffaa00', 0.7 * p.depth);
        ctx.beginPath();
        ctx.arc(p.x, p.y, ship.size, 0, Math.PI * 2);
        ctx.fill();

        // Ship wake
        ctx.strokeStyle = this.hexToRgba('#ffaa00', 0.2 * p.depth);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x - 4, p.y + 2);
        ctx.lineTo(p.x + 4, p.y + 2);
        ctx.stroke();
      }
    });
  }

  drawFlightPaths(ctx, radius) {
    ctx.strokeStyle = this.hexToRgba(this.warningColor, 0.08);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);

    this.flightPaths.forEach(path => {
      const startP = this.project(path.start[0], path.start[1], radius);
      const endP = this.project(path.end[0], path.end[1], radius);

      if (startP.visible && endP.visible) {
        const midX = (startP.x + endP.x) / 2;
        const midY = (startP.y + endP.y) / 2 - 20;

        ctx.beginPath();
        ctx.moveTo(startP.x, startP.y);
        ctx.quadraticCurveTo(midX, midY, endP.x, endP.y);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);
  }

  drawPlanes(ctx, radius) {
    this.planes.forEach(plane => {
      plane.progress += plane.speed;
      if (plane.progress > 1) plane.progress = 0;

      const path = this.flightPaths[plane.pathIndex % this.flightPaths.length];
      if (!path) return;

      const lon = path.start[0] + (path.end[0] - path.start[0]) * plane.progress;
      const lat = path.start[1] + (path.end[1] - path.start[1]) * plane.progress;
      const p = this.project(lon, lat, radius * (1 + plane.altitude));

      if (p.visible && p.depth > 0.1) {
        // Plane body
        ctx.fillStyle = this.hexToRgba(this.warningColor, 0.8 * p.depth);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Blinking light
        if (Math.sin(this.time * 5 + plane.pathIndex) > 0.5) {
          ctx.fillStyle = this.hexToRgba('#ff0000', 0.9);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  drawCityLights(ctx, radius) {
    const terminatorLon = this.sunLon + 90;

    this.cities.forEach(city => {
      const p = this.project(city.lon, city.lat, radius * 0.98);
      if (!p.visible || p.depth < 0.15) return;

      const cityLonAdjusted = (city.lon - this.rotation * (180 / Math.PI) + 540) % 360 - 180;
      const isNight = Math.abs(cityLonAdjusted - terminatorLon) > 90;

      if (isNight) {
        const alpha = city.intensity * p.depth * 0.85;
        const glowSize = 2 + city.intensity * 4;

        const cityGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
        cityGlow.addColorStop(0, this.hexToRgba('#ffcc66', alpha));
        cityGlow.addColorStop(0.4, this.hexToRgba('#ff9933', alpha * 0.6));
        cityGlow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = cityGlow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba('#ffeeaa', alpha);
        ctx.fill();
      } else {
        const alpha = city.intensity * p.depth * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(this.primaryColor, alpha);
        ctx.fill();
      }
    });
  }

  drawStorms(ctx, radius) {
    this.storms.forEach(storm => {
      storm.rotation += storm.rotationSpeed;
      storm.lon += storm.drift.lon;
      storm.lat += storm.drift.lat;

      // Wrap around
      if (storm.lon > 180) storm.lon -= 360;
      if (storm.lon < -180) storm.lon += 360;
      if (Math.abs(storm.lat) > 50) storm.drift.lat *= -1;

      const p = this.project(storm.lon, storm.lat, radius * 0.98);
      if (!p.visible || p.depth < 0.3) return;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(storm.rotation);

      const alpha = storm.intensity * p.depth * 0.4;

      // Storm spiral
      ctx.strokeStyle = this.hexToRgba('#aaccff', alpha);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let angle = 0; angle < Math.PI * 4; angle += 0.2) {
        const r = angle * storm.size / 12;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (angle === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Storm center
      ctx.fillStyle = this.hexToRgba('#ffffff', alpha * 0.5);
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  drawCloudLayer(ctx, radius) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < 15; i++) {
      const cloudLon = (i * 24 + this.time * 2) % 360 - 180;
      const cloudLat = Math.sin(this.time * 0.3 + i * 0.8) * 50;
      const p = this.project(cloudLon, cloudLat, radius * 0.97);

      if (p.visible && p.depth > 0.25) {
        const cloudAlpha = 0.06 * p.depth;
        const cloudSize = 12 + Math.sin(this.time * 0.5 + i) * 6;

        ctx.beginPath();
        ctx.ellipse(p.x, p.y, cloudSize, cloudSize * 0.4,
          (cloudLon + this.rotation * 57.3) * 0.017, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 200, 220, ${cloudAlpha})`;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawPolarIceCaps(ctx, radius) {
    // North pole
    ctx.fillStyle = this.hexToRgba('#88ccff', 0.18);
    ctx.strokeStyle = this.hexToRgba('#aaddff', 0.25);
    ctx.lineWidth = 0.5;

    let northPoints = [];
    for (let lon = -180; lon <= 180; lon += 8) {
      const latVar = 76 + Math.sin(lon * 0.08) * 4;
      const p = this.project(lon, latVar, radius);
      if (p.visible) northPoints.push(p);
    }
    if (northPoints.length > 2) {
      ctx.beginPath();
      ctx.moveTo(northPoints[0].x, northPoints[0].y);
      northPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // South pole
    let southPoints = [];
    for (let lon = -180; lon <= 180; lon += 8) {
      const latVar = -72 + Math.sin(lon * 0.1) * 5;
      const p = this.project(lon, latVar, radius);
      if (p.visible) southPoints.push(p);
    }
    if (southPoints.length > 2) {
      ctx.beginPath();
      ctx.moveTo(southPoints[0].x, southPoints[0].y);
      southPoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  drawSpecularHighlight(ctx, cx, cy, radius) {
    const highlightX = cx - radius * 0.35;
    const highlightY = cy - radius * 0.35;
    const highlightRadius = radius * 0.28;

    const specularGradient = ctx.createRadialGradient(
      highlightX, highlightY, 0,
      highlightX, highlightY, highlightRadius
    );
    specularGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    specularGradient.addColorStop(0.4, 'rgba(200, 230, 255, 0.04)');
    specularGradient.addColorStop(1, 'transparent');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(highlightX, highlightY, highlightRadius, 0, Math.PI * 2);
    ctx.fillStyle = specularGradient;
    ctx.fill();
    ctx.restore();
  }

  drawAurora(ctx, radius) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Northern aurora
    for (let i = 0; i < 8; i++) {
      const lon = (i * 45 + this.time * 10) % 360 - 180;
      const lat = 70 + Math.sin(this.time + i) * 5;
      const p = this.project(lon, lat, radius * 0.98);

      if (p.visible && p.depth > 0.2) {
        const alpha = (0.15 + Math.sin(this.time * 2 + i) * 0.1) * p.depth;

        const gradient = ctx.createLinearGradient(p.x, p.y - 15, p.x, p.y + 5);
        gradient.addColorStop(0, this.hexToRgba('#00ff88', alpha));
        gradient.addColorStop(0.5, this.hexToRgba('#00ffcc', alpha * 0.5));
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 8 + Math.sin(this.time + i) * 3, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawImportantLines(ctx, radius) {
    // Equator
    ctx.strokeStyle = this.hexToRgba(this.secondaryColor, 0.4);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.secondaryColor;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    let started = false;
    for (let lon = -180; lon <= 180; lon += 2) {
      const p = this.project(lon, 0, radius);
      if (p.visible) {
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else { ctx.lineTo(p.x, p.y); }
      } else { started = false; }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Tropics
    ctx.strokeStyle = this.hexToRgba(this.secondaryColor, 0.15);
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 5]);

    [23.5, -23.5, 66.5, -66.5].forEach(lat => {
      ctx.beginPath();
      started = false;
      for (let lon = -180; lon <= 180; lon += 4) {
        const p = this.project(lon, lat, radius);
        if (p.visible) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else { ctx.lineTo(p.x, p.y); }
        } else { started = false; }
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
  }

  interpolatePath(points, progress) {
    const totalSegments = points.length - 1;
    const segmentProgress = progress * totalSegments;
    const segmentIndex = Math.min(Math.floor(segmentProgress), totalSegments - 1);
    const t = segmentProgress - segmentIndex;

    const start = points[segmentIndex];
    const end = points[segmentIndex + 1];

    return {
      lon: start[0] + (end[0] - start[0]) * t,
      lat: start[1] + (end[1] - start[1]) * t
    };
  }

  drawOrbitalTrajectories(radius) {
    const ctx = this.ctx;

    this.satellites.forEach(sat => {
      const inclination = sat.inclination * (Math.PI / 180);
      const orbitRadius = radius * 1.1;

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      const color = sat.orbitColor === 'secondary' ? this.secondaryColor : this.warningColor;
      ctx.strokeStyle = this.hexToRgba(color, 0.2);
      ctx.lineWidth = 1;

      let started = false;
      let lastVisible = false;

      for (let angle = 0; angle <= 360; angle += 3) {
        const angleRad = angle * (Math.PI / 180);
        const orbitX = Math.cos(angleRad);
        const orbitY = Math.sin(angleRad) * Math.cos(inclination);
        const orbitZ = Math.sin(angleRad) * Math.sin(inclination);
        const lon = Math.atan2(orbitX, orbitZ) * (180 / Math.PI);
        const lat = Math.asin(orbitY) * (180 / Math.PI);
        const p = this.project(lon, lat, orbitRadius);

        if (p.visible) {
          if (!started || !lastVisible) { ctx.moveTo(p.x, p.y); started = true; }
          else { ctx.lineTo(p.x, p.y); }
          lastVisible = true;
        } else { lastVisible = false; }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  drawSatellites(radius) {
    const ctx = this.ctx;
    const time = Date.now() / 1000;

    this.satellites.forEach(sat => {
      sat.orbitPhase += sat.orbitalSpeed;
      if (sat.orbitPhase > Math.PI * 2) sat.orbitPhase -= Math.PI * 2;

      const inclination = sat.inclination * (Math.PI / 180);
      const orbitX = Math.cos(sat.orbitPhase);
      const orbitY = Math.sin(sat.orbitPhase) * Math.cos(inclination);
      const orbitZ = Math.sin(sat.orbitPhase) * Math.sin(inclination);

      sat.lon = Math.atan2(orbitX, orbitZ) * (180 / Math.PI);
      sat.lat = Math.asin(orbitY) * (180 / Math.PI);

      const p = this.project(sat.lon, sat.lat, radius * 1.1);
      const satColor = sat.orbitColor === 'secondary' ? this.secondaryColor : this.warningColor;

      if (p.visible && p.depth > 0.3) {
        let blink = Math.sin(time * 3 + sat.blinkPhase) * 0.5 + 0.5;

        if (this.effectsEnabled) {
          const satAngle = Math.atan2(p.y - this.canvas.height / 2, p.x - this.canvas.width / 2);
          if (this.isInRadarSweep(satAngle)) blink = 1.0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(satColor, 0.3 + blink * 0.7);
        ctx.fill();

        const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
        glowGradient.addColorStop(0, this.hexToRgba(satColor, 0.4 * blink));
        glowGradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Trail
        for (let i = 1; i <= 5; i++) {
          const trailPhase = sat.orbitPhase - (i * 0.03);
          const tX = Math.cos(trailPhase);
          const tY = Math.sin(trailPhase) * Math.cos(inclination);
          const tZ = Math.sin(trailPhase) * Math.sin(inclination);
          const tLon = Math.atan2(tX, tZ) * (180 / Math.PI);
          const tLat = Math.asin(tY) * (180 / Math.PI);
          const tp = this.project(tLon, tLat, radius * 1.1);

          if (tp.visible && tp.depth > 0.3) {
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, 2 - (i * 0.3), 0, Math.PI * 2);
            ctx.fillStyle = this.hexToRgba(satColor, (0.4 - i * 0.07) * blink);
            ctx.fill();
          }
        }

        if (p.depth > 0.7) {
          ctx.font = '8px "Share Tech Mono"';
          ctx.fillStyle = this.hexToRgba(satColor, 0.6);
          ctx.fillText(sat.id, p.x + 8, p.y + 3);
        }
      }
    });
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  updateColors() {
    this.primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary-color').trim() || '#00ff88';
    this.secondaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--secondary-color').trim() || '#00ccff';
  }

  animate(currentTime) {
    if (currentTime - this.lastFrameTime < this.frameInterval) {
      this.animationId = requestAnimationFrame((t) => this.animate(t));
      return;
    }
    this.lastFrameTime = currentTime;

    this.time += 0.03;
    this.rotation += this.rotationSpeed;

    if (this.effectsEnabled) {
      this.updateConnectionLines();
      this.updateRadarSweep();
      this.updatePulseRings();
      this.updateTargetLock();
    }

    this.drawGlobe();
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  // === CONNECTION LINES ===
  updateConnectionLines() {
    const now = Date.now();
    if (now - this.lastConnectionTime > this.connectionInterval && this.connectionLines.length < this.maxConnections) {
      this.spawnConnection();
      this.lastConnectionTime = now;
      this.connectionInterval = 2000 + Math.random() * 3000;
    }
    this.connectionLines = this.connectionLines.filter(conn => {
      conn.progress += 0.015;
      return conn.progress < 1.2;
    });
  }

  spawnConnection() {
    const hubs = this.cities.filter(c => c.intensity > 0.7);
    const startIdx = Math.floor(Math.random() * hubs.length);
    let endIdx = Math.floor(Math.random() * hubs.length);
    while (endIdx === startIdx) endIdx = Math.floor(Math.random() * hubs.length);

    const colors = [this.primaryColor, this.secondaryColor, this.warningColor];
    this.connectionLines.push({
      startLon: hubs[startIdx].lon,
      startLat: hubs[startIdx].lat,
      endLon: hubs[endIdx].lon,
      endLat: hubs[endIdx].lat,
      progress: 0,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  drawConnectionLines(radius) {
    const ctx = this.ctx;

    this.connectionLines.forEach(conn => {
      const startP = this.project(conn.startLon, conn.startLat, radius);
      const endP = this.project(conn.endLon, conn.endLat, radius);

      if (!startP.visible || !endP.visible) return;

      const midX = (startP.x + endP.x) / 2;
      const midY = (startP.y + endP.y) / 2;
      const dist = Math.sqrt(Math.pow(endP.x - startP.x, 2) + Math.pow(endP.y - startP.y, 2));
      const arcHeight = Math.min(dist * 0.4, 40);
      const controlY = midY - arcHeight;

      ctx.beginPath();
      const segments = 30;
      const endSegment = Math.floor(Math.min(conn.progress, 1) * segments);

      for (let i = 0; i <= endSegment; i++) {
        const t = i / segments;
        const x = (1 - t) * (1 - t) * startP.x + 2 * (1 - t) * t * midX + t * t * endP.x;
        const y = (1 - t) * (1 - t) * startP.y + 2 * (1 - t) * t * controlY + t * t * endP.y;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const alpha = conn.progress > 1 ? Math.max(0, 1 - (conn.progress - 1) * 5) : 0.7;
      ctx.strokeStyle = this.hexToRgba(conn.color, alpha);
      ctx.lineWidth = 1.5;
      ctx.shadowColor = conn.color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (conn.progress <= 1) {
        const t = conn.progress;
        const headX = (1 - t) * (1 - t) * startP.x + 2 * (1 - t) * t * midX + t * t * endP.x;
        const headY = (1 - t) * (1 - t) * startP.y + 2 * (1 - t) * t * controlY + t * t * endP.y;

        ctx.beginPath();
        ctx.arc(headX, headY, 3, 0, Math.PI * 2);
        ctx.fillStyle = conn.color;
        ctx.shadowColor = conn.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }

  // === RADAR SWEEP ===
  updateRadarSweep() {
    this.radarAngle += this.radarSpeed;
    if (this.radarAngle > Math.PI * 2) this.radarAngle -= Math.PI * 2;
  }

  drawRadarSweep(radius, cx, cy) {
    const ctx = this.ctx;
    const sweepAngle = Math.PI / 3;

    const gradient = ctx.createConicGradient(this.radarAngle - sweepAngle, cx, cy);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.15, this.hexToRgba(this.primaryColor, 0.12));
    gradient.addColorStop(0.16, this.hexToRgba(this.primaryColor, 0.06));
    gradient.addColorStop(0.17, 'transparent');
    gradient.addColorStop(1, 'transparent');

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, this.radarAngle - sweepAngle, this.radarAngle);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.radarAngle) * radius, cy + Math.sin(this.radarAngle) * radius);
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.35);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  isInRadarSweep(satAngle) {
    const sweepAngle = Math.PI / 3;
    let diff = satAngle - this.radarAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return diff > -sweepAngle && diff < 0;
  }

  // === PULSE RINGS ===
  updatePulseRings() {
    this.satellites.forEach(sat => {
      if (!sat.nextPulseTime) sat.nextPulseTime = Date.now() + 3000 + Math.random() * 5000;
      if (Date.now() > sat.nextPulseTime) {
        this.pulseRings.push({
          lon: sat.lon, lat: sat.lat,
          radius: 0, maxRadius: 25, opacity: 0.8,
          color: sat.orbitColor === 'secondary' ? this.secondaryColor : this.warningColor
        });
        sat.nextPulseTime = Date.now() + 3000 + Math.random() * 5000;
      }
    });

    this.pulseRings = this.pulseRings.filter(ring => {
      ring.radius += 0.8;
      ring.opacity = 0.8 * (1 - ring.radius / ring.maxRadius);
      return ring.radius < ring.maxRadius;
    });
  }

  drawPulseRings(globeRadius) {
    const ctx = this.ctx;
    this.pulseRings.forEach(ring => {
      const p = this.project(ring.lon, ring.lat, globeRadius * 1.1);
      if (!p.visible || p.depth < 0.3) return;

      ctx.beginPath();
      ctx.arc(p.x, p.y, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.hexToRgba(ring.color, ring.opacity);
      ctx.lineWidth = 2 * (1 - ring.radius / ring.maxRadius);
      ctx.stroke();
    });
  }

  // === TARGET LOCK ===
  updateTargetLock() {
    const now = Date.now();

    if (!this.targetLock && now - this.lastTargetTime > this.targetInterval) {
      this.spawnTargetLock();
      this.lastTargetTime = now;
      this.targetInterval = 10000 + Math.random() * 10000;
    }

    if (this.targetLock) {
      this.targetLock.time += 16;

      if (this.targetLock.phase === 'searching' && this.targetLock.time > 1000) {
        this.targetLock.phase = 'locking';
        this.targetLock.time = 0;
      } else if (this.targetLock.phase === 'locking' && this.targetLock.time > 500) {
        this.targetLock.phase = 'locked';
        this.targetLock.time = 0;
      } else if (this.targetLock.phase === 'locked' && this.targetLock.time > 2000) {
        this.targetLock.phase = 'fading';
        this.targetLock.time = 0;
      } else if (this.targetLock.phase === 'fading' && this.targetLock.time > 500) {
        this.targetLock = null;
      }

      if (this.targetLock && this.targetLock.phase === 'searching') {
        this.targetLock.jitterX = (Math.random() - 0.5) * 10;
        this.targetLock.jitterY = (Math.random() - 0.5) * 10;
      } else if (this.targetLock) {
        this.targetLock.jitterX *= 0.8;
        this.targetLock.jitterY *= 0.8;
      }
    }
  }

  spawnTargetLock() {
    const lon = (Math.random() - 0.5) * 120;
    const lat = (Math.random() - 0.5) * 100;
    this.targetLock = { lon, lat, phase: 'searching', time: 0, rotation: 0, jitterX: 0, jitterY: 0 };
  }

  drawTargetLock(radius) {
    if (!this.targetLock) return;

    const ctx = this.ctx;
    const p = this.project(this.targetLock.lon, this.targetLock.lat, radius);

    if (!p.visible) { this.targetLock = null; return; }

    const x = p.x + this.targetLock.jitterX;
    const y = p.y + this.targetLock.jitterY;

    let alpha = 1;
    if (this.targetLock.phase === 'fading') alpha = 1 - this.targetLock.time / 500;

    this.targetLock.rotation += 0.03;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.targetLock.rotation);

    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = this.hexToRgba(this.warningColor, 0.6 * alpha);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.strokeStyle = this.hexToRgba(this.warningColor, 0.8 * alpha);
    ctx.lineWidth = 1;
    ctx.stroke();

    const crossSize = 15;
    ctx.beginPath();
    ctx.moveTo(x - crossSize, y); ctx.lineTo(x - 5, y);
    ctx.moveTo(x + 5, y); ctx.lineTo(x + crossSize, y);
    ctx.moveTo(x, y - crossSize); ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y + 5); ctx.lineTo(x, y + crossSize);
    ctx.strokeStyle = this.hexToRgba(this.warningColor, alpha);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const bracketSize = 8;
    const bracketOffset = 25;
    const corners = [
      { cx: x - bracketOffset, cy: y - bracketOffset, dx: 1, dy: 1 },
      { cx: x + bracketOffset, cy: y - bracketOffset, dx: -1, dy: 1 },
      { cx: x - bracketOffset, cy: y + bracketOffset, dx: 1, dy: -1 },
      { cx: x + bracketOffset, cy: y + bracketOffset, dx: -1, dy: -1 }
    ];

    ctx.beginPath();
    corners.forEach(c => {
      ctx.moveTo(c.cx, c.cy);
      ctx.lineTo(c.cx + bracketSize * c.dx, c.cy);
      ctx.moveTo(c.cx, c.cy);
      ctx.lineTo(c.cx, c.cy + bracketSize * c.dy);
    });
    ctx.strokeStyle = this.hexToRgba(this.warningColor, alpha);
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.targetLock.phase === 'locked' || this.targetLock.phase === 'fading') {
      ctx.font = '8px "Share Tech Mono"';
      ctx.fillStyle = this.hexToRgba(this.warningColor, alpha);
      ctx.textAlign = 'center';
      const latStr = Math.abs(this.targetLock.lat).toFixed(2) + (this.targetLock.lat >= 0 ? 'N' : 'S');
      const lonStr = Math.abs(this.targetLock.lon).toFixed(2) + (this.targetLock.lon >= 0 ? 'E' : 'W');
      ctx.fillText('TARGET ACQUIRED', x, y + 45);
      ctx.fillText(`${latStr} / ${lonStr}`, x, y + 55);
    }
  }

  start() {
    if (!this.animationId) {
      this.animationId = requestAnimationFrame((t) => this.animate(t));
    }
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getSatellites() {
    return this.satellites.map(sat => ({
      id: sat.id,
      type: sat.type,
      lat: sat.lat.toFixed(4),
      lon: sat.lon.toFixed(4),
      alt: Math.round(sat.alt)
    }));
  }

  setEffectsEnabled(enabled) {
    this.effectsEnabled = enabled;
    if (!enabled) {
      this.connectionLines = [];
      this.pulseRings = [];
      this.targetLock = null;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GlobeRenderer;
}

// ========================================
// CITY MAP RENDERER - Top-Down View with Camera Follow
// Realistic 3D Buildings, Trees, Parks, and Traffic
// ========================================

class CityMapRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.animationId = null;
    this.enabled = true;

    // Canvas dimensions
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // World size (larger than canvas - camera shows portion)
    this.worldWidth = 800;
    this.worldHeight = 800;

    // Camera position (follows target with smoothing)
    this.camera = { x: 0, y: 0 };
    this.cameraSmoothing = 0.08;

    // Zoom level
    this.zoom = 1.5;

    // City grid settings
    this.blockSize = 60;
    this.streetWidth = 14;

    // City elements
    this.buildings = [];
    this.trees = [];
    this.parks = [];
    this.cars = [];
    this.parkedCars = [];
    this.streetLights = [];

    // Target tracking
    this.targetPos = { x: 200, y: 200 };
    this.targetPath = [];
    this.targetPathIndex = 0;
    this.targetProgress = 0;
    this.targetSpeed = 0.8;
    this.trail = [];
    this.maxTrailLength = 40;

    // Target acquired state
    this.isAcquired = false;
    this.acquiredTime = 0;
    this.acquiredDuration = 3000;
    this.lastAcquiredCheck = Date.now();
    this.acquireInterval = 20000 + Math.random() * 20000;

    // Callbacks
    this.targetAcquiredCallback = null;

    // Visual settings
    this.primaryColor = this.getComputedColor('--primary-color', '#00ff88');
    this.primaryDim = this.getComputedColor('--primary-dim', '#00aa55');
    this.alertColor = this.getComputedColor('--alert-color', '#ff0044');

    // Animation phases
    this.pulsePhase = 0;
    this.crosshairPhase = 0;
    this.time = 0;

    // FPS control (30fps)
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / 30;

    // Initialize city
    this.generateCity();
    this.generateTargetPath();
  }

  getComputedColor(varName, fallback) {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue(varName).trim();
    return color || fallback;
  }

  hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  hexToRgba(hex, alpha) {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  updateColors() {
    this.primaryColor = this.getComputedColor('--primary-color', '#00ff88');
    this.primaryDim = this.getComputedColor('--primary-dim', '#00aa55');
    this.alertColor = this.getComputedColor('--alert-color', '#ff0044');
  }

  generateCity() {
    this.buildings = [];
    this.trees = [];
    this.parks = [];
    this.cars = [];
    this.parkedCars = [];
    this.streetLights = [];

    const gridCols = Math.floor(this.worldWidth / this.blockSize);
    const gridRows = Math.floor(this.worldHeight / this.blockSize);

    // First, decide which blocks are parks (about 10%)
    const parkBlocks = new Set();
    for (let row = 1; row < gridRows - 1; row++) {
      for (let col = 1; col < gridCols - 1; col++) {
        if (Math.random() < 0.1) {
          parkBlocks.add(`${row},${col}`);
        }
      }
    }

    // Generate city blocks
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const blockX = col * this.blockSize + this.streetWidth / 2;
        const blockY = row * this.blockSize + this.streetWidth / 2;
        const blockW = this.blockSize - this.streetWidth;
        const blockH = this.blockSize - this.streetWidth;

        if (parkBlocks.has(`${row},${col}`)) {
          // Generate park
          this.generatePark(blockX, blockY, blockW, blockH);
        } else {
          // Generate buildings
          this.generateBlock(blockX, blockY, blockW, blockH);
        }

        // Add street lights at intersections
        if (row > 0 && col > 0) {
          this.streetLights.push({
            x: col * this.blockSize,
            y: row * this.blockSize,
            phase: Math.random() * Math.PI * 2
          });
        }

        // Add trees along streets
        this.generateStreetTrees(col, row);
      }
    }

    // Generate traffic (moving cars)
    this.generateTraffic(15);

    // Generate parked cars
    this.generateParkedCars(40);
  }

  generateBlock(blockX, blockY, blockW, blockH) {
    const buildingTypes = ['residential', 'commercial', 'office', 'industrial'];
    const blockType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];

    // Determine building layout
    const layoutType = Math.random();

    if (layoutType < 0.3) {
      // Single large building
      this.createBuilding(blockX + 2, blockY + 2, blockW - 4, blockH - 4, blockType);
    } else if (layoutType < 0.6) {
      // Two buildings side by side
      const splitVertical = Math.random() < 0.5;
      if (splitVertical) {
        const w1 = (blockW - 6) * (0.4 + Math.random() * 0.2);
        this.createBuilding(blockX + 2, blockY + 2, w1, blockH - 4, blockType);
        this.createBuilding(blockX + w1 + 4, blockY + 2, blockW - w1 - 6, blockH - 4, blockType);
      } else {
        const h1 = (blockH - 6) * (0.4 + Math.random() * 0.2);
        this.createBuilding(blockX + 2, blockY + 2, blockW - 4, h1, blockType);
        this.createBuilding(blockX + 2, blockY + h1 + 4, blockW - 4, blockH - h1 - 6, blockType);
      }
    } else {
      // Four smaller buildings
      const subW = (blockW - 6) / 2;
      const subH = (blockH - 6) / 2;
      const positions = [
        { x: blockX + 2, y: blockY + 2 },
        { x: blockX + subW + 4, y: blockY + 2 },
        { x: blockX + 2, y: blockY + subH + 4 },
        { x: blockX + subW + 4, y: blockY + subH + 4 }
      ];

      positions.forEach(pos => {
        if (Math.random() < 0.85) {
          this.createBuilding(pos.x, pos.y, subW, subH, blockType);
        } else {
          // Small courtyard with trees
          this.createCourtyard(pos.x, pos.y, subW, subH);
        }
      });
    }
  }

  createBuilding(x, y, w, h, type) {
    const floors = type === 'office' ? 4 + Math.floor(Math.random() * 8) :
                   type === 'commercial' ? 2 + Math.floor(Math.random() * 4) :
                   type === 'industrial' ? 1 + Math.floor(Math.random() * 2) :
                   1 + Math.floor(Math.random() * 5);

    // Determine building shape
    const shapes = ['rectangle', 'L-shape', 'U-shape', 'T-shape', 'plus'];
    const shape = w > 15 && h > 15 && Math.random() < 0.4 ?
                  shapes[Math.floor(Math.random() * shapes.length)] : 'rectangle';

    // Roof type
    const roofTypes = ['flat', 'gravel', 'membrane', 'green', 'mechanical'];
    const roofType = type === 'industrial' ? 'mechanical' :
                     type === 'office' ? (Math.random() < 0.5 ? 'membrane' : 'gravel') :
                     roofTypes[Math.floor(Math.random() * roofTypes.length)];

    const building = {
      x, y, width: w, height: h,
      floors,
      type,
      shape,
      roofType,
      lit: Math.random() < 0.6,
      // Roof equipment
      acUnits: Math.floor(Math.random() * 4) + 1,
      hasWaterTank: type === 'residential' && Math.random() < 0.4,
      hasHelipad: floors > 8 && w > 20 && h > 20 && Math.random() < 0.3,
      hasSolarPanels: Math.random() < 0.25,
      hasRoofGarden: Math.random() < 0.15,
      hasAntenna: Math.random() < 0.5,
      hasSatelliteDish: Math.random() < 0.3,
      hasElevatorShaft: floors > 3,
      hasStairwellAccess: true,
      hasVents: Math.random() < 0.7,
      hasPipes: type === 'industrial' || Math.random() < 0.3,
      hasSkylights: type === 'office' && Math.random() < 0.5,
      // Building structure
      hasParapet: Math.random() < 0.7,
      parapetHeight: 1 + Math.random() * 2,
      hasSetback: floors > 5 && Math.random() < 0.4,
      setbackFloor: Math.floor(floors * 0.6),
      // Windows
      windowRows: Math.min(floors, 8),
      windowCols: Math.max(2, Math.floor(w / 5)),
      windowStyle: Math.floor(Math.random() * 5),
      // Unique seed
      seed: Math.random() * 10000
    };

    this.buildings.push(building);
  }

  createCourtyard(x, y, w, h) {
    // Add a few trees in the courtyard
    const numTrees = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numTrees; i++) {
      this.trees.push({
        x: x + 4 + Math.random() * (w - 8),
        y: y + 4 + Math.random() * (h - 8),
        size: 3 + Math.random() * 3,
        type: Math.random() < 0.7 ? 'round' : 'pine'
      });
    }
  }

  generatePark(x, y, w, h) {
    this.parks.push({
      x, y, width: w, height: h,
      hasPond: Math.random() < 0.3,
      hasFountain: Math.random() < 0.2,
      pathStyle: Math.floor(Math.random() * 3)
    });

    // Add trees to park
    const numTrees = 8 + Math.floor(Math.random() * 10);
    for (let i = 0; i < numTrees; i++) {
      const tx = x + 5 + Math.random() * (w - 10);
      const ty = y + 5 + Math.random() * (h - 10);
      this.trees.push({
        x: tx, y: ty,
        size: 4 + Math.random() * 4,
        type: Math.random() < 0.6 ? 'round' : (Math.random() < 0.5 ? 'pine' : 'oak')
      });
    }
  }

  generateStreetTrees(col, row) {
    const x = col * this.blockSize;
    const y = row * this.blockSize;

    // Trees along horizontal streets
    if (Math.random() < 0.4) {
      this.trees.push({
        x: x + this.blockSize * 0.25,
        y: y + this.streetWidth / 2 + 2,
        size: 2.5 + Math.random() * 1.5,
        type: 'round'
      });
    }
    if (Math.random() < 0.4) {
      this.trees.push({
        x: x + this.blockSize * 0.75,
        y: y + this.streetWidth / 2 + 2,
        size: 2.5 + Math.random() * 1.5,
        type: 'round'
      });
    }
  }

  generateTraffic(numCars) {
    for (let i = 0; i < numCars; i++) {
      const horizontal = Math.random() < 0.5;
      const gridCols = Math.floor(this.worldWidth / this.blockSize);
      const gridRows = Math.floor(this.worldHeight / this.blockSize);

      let x, y, direction;
      if (horizontal) {
        const row = Math.floor(Math.random() * gridRows);
        y = row * this.blockSize;
        x = Math.random() * this.worldWidth;
        direction = Math.random() < 0.5 ? 1 : -1;
      } else {
        const col = Math.floor(Math.random() * gridCols);
        x = col * this.blockSize;
        y = Math.random() * this.worldHeight;
        direction = Math.random() < 0.5 ? 1 : -1;
      }

      this.cars.push({
        x, y,
        horizontal,
        direction,
        speed: 0.3 + Math.random() * 0.4,
        color: this.getRandomCarColor(),
        length: 4 + Math.random() * 2,
        width: 2.5 + Math.random() * 0.5,
        hasHeadlights: true
      });
    }
  }

  generateParkedCars(numCars) {
    const gridCols = Math.floor(this.worldWidth / this.blockSize);
    const gridRows = Math.floor(this.worldHeight / this.blockSize);

    for (let i = 0; i < numCars; i++) {
      const horizontal = Math.random() < 0.5;
      let x, y;

      if (horizontal) {
        const row = Math.floor(Math.random() * gridRows);
        const col = Math.floor(Math.random() * gridCols);
        x = col * this.blockSize + this.streetWidth + Math.random() * (this.blockSize - this.streetWidth * 2);
        y = row * this.blockSize + (Math.random() < 0.5 ? 3 : this.streetWidth - 6);
      } else {
        const row = Math.floor(Math.random() * gridRows);
        const col = Math.floor(Math.random() * gridCols);
        x = col * this.blockSize + (Math.random() < 0.5 ? 3 : this.streetWidth - 6);
        y = row * this.blockSize + this.streetWidth + Math.random() * (this.blockSize - this.streetWidth * 2);
      }

      this.parkedCars.push({
        x, y,
        horizontal,
        color: this.getRandomCarColor(),
        length: 4 + Math.random() * 2,
        width: 2.5 + Math.random() * 0.5
      });
    }
  }

  getRandomCarColor() {
    const colors = ['#1a1a2e', '#2d2d44', '#3d3d5c', '#4a4a6a', '#252538', '#1e1e30'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  generateTargetPath() {
    if (!this.targetPos.x) {
      this.targetPos = {
        x: Math.floor(Math.random() * 5 + 2) * this.blockSize,
        y: Math.floor(Math.random() * 5 + 2) * this.blockSize
      };
    }

    this.targetPath = [];
    let currentX = Math.round(this.targetPos.x / this.blockSize) * this.blockSize;
    let currentY = Math.round(this.targetPos.y / this.blockSize) * this.blockSize;

    const pathLength = 6 + Math.floor(Math.random() * 5);
    let lastDirection = null;

    for (let i = 0; i < pathLength; i++) {
      let directions = [];

      // Add all possible directions based on boundaries
      if (currentX > this.blockSize) directions.push({ dx: -1, dy: 0 });
      if (currentX < this.worldWidth - this.blockSize * 2) directions.push({ dx: 1, dy: 0 });
      if (currentY > this.blockSize) directions.push({ dx: 0, dy: -1 });
      if (currentY < this.worldHeight - this.blockSize * 2) directions.push({ dx: 0, dy: 1 });

      // Filter out 180-degree turns (opposite direction)
      if (lastDirection) {
        directions = directions.filter(d =>
          !(d.dx === -lastDirection.dx && d.dy === -lastDirection.dy)
        );
      }

      // Weight the current direction more heavily (prefer going straight)
      if (lastDirection && Math.random() < 0.6) {
        const sameDir = directions.find(d => d.dx === lastDirection.dx && d.dy === lastDirection.dy);
        if (sameDir) directions.push(sameDir, sameDir);
      }

      if (directions.length === 0) break;

      const dir = directions[Math.floor(Math.random() * directions.length)];
      const steps = 1 + Math.floor(Math.random() * 3);

      for (let s = 0; s < steps; s++) {
        const newX = currentX + dir.dx * this.blockSize;
        const newY = currentY + dir.dy * this.blockSize;

        if (newX >= 0 && newX < this.worldWidth && newY >= 0 && newY < this.worldHeight) {
          currentX = newX;
          currentY = newY;
          this.targetPath.push({ x: currentX, y: currentY });
        }
      }

      lastDirection = dir;
    }

    this.targetPathIndex = 0;
    this.targetProgress = 0;
  }

  updateTarget() {
    if (this.targetPath.length === 0) {
      this.generateTargetPath();
      return;
    }

    const currentWaypoint = this.targetPath[this.targetPathIndex];
    if (!currentWaypoint) {
      this.generateTargetPath();
      return;
    }

    const dx = currentWaypoint.x - this.targetPos.x;
    const dy = currentWaypoint.y - this.targetPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.targetSpeed) {
      this.targetPos.x = currentWaypoint.x;
      this.targetPos.y = currentWaypoint.y;
      this.targetPathIndex++;

      if (this.targetPathIndex >= this.targetPath.length) {
        this.generateTargetPath();
      }
    } else {
      this.targetPos.x += (dx / dist) * this.targetSpeed;
      this.targetPos.y += (dy / dist) * this.targetSpeed;
    }

    this.trail.push({ x: this.targetPos.x, y: this.targetPos.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    this.updateCamera();
    this.updateCoordinateDisplay();
  }

  updateCars() {
    this.cars.forEach(car => {
      if (car.horizontal) {
        car.x += car.speed * car.direction;
        if (car.x > this.worldWidth + 20) car.x = -20;
        if (car.x < -20) car.x = this.worldWidth + 20;
      } else {
        car.y += car.speed * car.direction;
        if (car.y > this.worldHeight + 20) car.y = -20;
        if (car.y < -20) car.y = this.worldHeight + 20;
      }
    });
  }

  updateCamera() {
    const targetCamX = this.targetPos.x - (this.width / 2) / this.zoom;
    const targetCamY = this.targetPos.y - (this.height / 2) / this.zoom;

    this.camera.x += (targetCamX - this.camera.x) * this.cameraSmoothing;
    this.camera.y += (targetCamY - this.camera.y) * this.cameraSmoothing;

    const viewWidth = this.width / this.zoom;
    const viewHeight = this.height / this.zoom;

    this.camera.x = Math.max(0, Math.min(this.worldWidth - viewWidth, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.worldHeight - viewHeight, this.camera.y));
  }

  updateCoordinateDisplay() {
    const coordsEl = document.getElementById('target-coords');
    const sectorEl = document.getElementById('target-sector');

    if (coordsEl) {
      const lat = (40.7128 + (this.targetPos.y / this.worldHeight) * 0.05).toFixed(4);
      const lon = (-74.0060 + (this.targetPos.x / this.worldWidth) * 0.05).toFixed(4);
      coordsEl.textContent = `${lat}/${lon}`;
    }

    if (sectorEl) {
      const sectorX = String.fromCharCode(65 + Math.floor(this.targetPos.x / this.blockSize / 2));
      const sectorY = Math.floor(this.targetPos.y / this.blockSize / 2) + 1;
      sectorEl.textContent = `SECTOR: ${sectorX}${sectorY}`;
    }
  }

  checkTargetAcquired() {
    const now = Date.now();

    if (!this.isAcquired && now - this.lastAcquiredCheck > this.acquireInterval) {
      this.triggerAcquisition();
      this.lastAcquiredCheck = now;
      this.acquireInterval = 20000 + Math.random() * 20000;
    }

    if (this.isAcquired && now - this.acquiredTime > this.acquiredDuration) {
      this.endAcquisition();
    }
  }

  triggerAcquisition() {
    this.isAcquired = true;
    this.acquiredTime = Date.now();
    this.crosshairPhase = 0;

    const statusEl = document.getElementById('tracking-status');
    if (statusEl) {
      statusEl.textContent = 'ACQUIRED';
      statusEl.classList.add('acquired');
    }

    if (this.targetAcquiredCallback) {
      this.targetAcquiredCallback();
    }
  }

  endAcquisition() {
    this.isAcquired = false;

    const statusEl = document.getElementById('tracking-status');
    if (statusEl) {
      statusEl.textContent = 'TRACKING';
      statusEl.classList.remove('acquired');
    }
  }

  draw() {
    const ctx = this.ctx;
    this.time += 0.03;

    // Update moving elements
    this.updateCars();

    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // Draw layers in order
    this.drawStreets();
    this.drawParks();
    this.drawParkedCars();
    this.drawMovingCars();
    this.drawBuildings();
    this.drawTrees();
    this.drawStreetLights();
    this.drawTrail();
    this.drawTarget();

    if (this.isAcquired) {
      this.drawCrosshair();
    }

    ctx.restore();

    this.drawHUD();

    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, this.width - 1, this.height - 1);
  }

  drawStreets() {
    const ctx = this.ctx;
    const viewLeft = this.camera.x - 20;
    const viewTop = this.camera.y - 20;
    const viewRight = this.camera.x + this.width / this.zoom + 20;
    const viewBottom = this.camera.y + this.height / this.zoom + 20;

    // Asphalt
    ctx.fillStyle = '#0c0c0c';

    for (let y = 0; y <= this.worldHeight; y += this.blockSize) {
      if (y >= viewTop - this.streetWidth && y <= viewBottom + this.streetWidth) {
        ctx.fillRect(viewLeft, y - this.streetWidth / 2, viewRight - viewLeft, this.streetWidth);
      }
    }

    for (let x = 0; x <= this.worldWidth; x += this.blockSize) {
      if (x >= viewLeft - this.streetWidth && x <= viewRight + this.streetWidth) {
        ctx.fillRect(x - this.streetWidth / 2, viewTop, this.streetWidth, viewBottom - viewTop);
      }
    }

    // Lane markings
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.12);
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 10]);

    for (let y = 0; y <= this.worldHeight; y += this.blockSize) {
      if (y >= viewTop && y <= viewBottom) {
        ctx.beginPath();
        ctx.moveTo(Math.max(0, viewLeft), y);
        ctx.lineTo(Math.min(this.worldWidth, viewRight), y);
        ctx.stroke();
      }
    }

    for (let x = 0; x <= this.worldWidth; x += this.blockSize) {
      if (x >= viewLeft && x <= viewRight) {
        ctx.beginPath();
        ctx.moveTo(x, Math.max(0, viewTop));
        ctx.lineTo(x, Math.min(this.worldHeight, viewBottom));
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);

    // Crosswalks at intersections
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.08);
    for (let row = 0; row <= Math.floor(this.worldHeight / this.blockSize); row++) {
      for (let col = 0; col <= Math.floor(this.worldWidth / this.blockSize); col++) {
        const ix = col * this.blockSize;
        const iy = row * this.blockSize;

        if (ix >= viewLeft - 10 && ix <= viewRight + 10 && iy >= viewTop - 10 && iy <= viewBottom + 10) {
          // Draw crosswalk stripes
          for (let s = -3; s <= 3; s += 2) {
            ctx.fillRect(ix + s, iy - this.streetWidth / 2, 1, this.streetWidth);
            ctx.fillRect(ix - this.streetWidth / 2, iy + s, this.streetWidth, 1);
          }
        }
      }
    }

    // Sidewalks
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.06);
    ctx.lineWidth = 2;

    for (let y = 0; y <= this.worldHeight; y += this.blockSize) {
      if (y >= viewTop && y <= viewBottom) {
        ctx.beginPath();
        ctx.moveTo(viewLeft, y - this.streetWidth / 2 + 1);
        ctx.lineTo(viewRight, y - this.streetWidth / 2 + 1);
        ctx.moveTo(viewLeft, y + this.streetWidth / 2 - 1);
        ctx.lineTo(viewRight, y + this.streetWidth / 2 - 1);
        ctx.stroke();
      }
    }

    for (let x = 0; x <= this.worldWidth; x += this.blockSize) {
      if (x >= viewLeft && x <= viewRight) {
        ctx.beginPath();
        ctx.moveTo(x - this.streetWidth / 2 + 1, viewTop);
        ctx.lineTo(x - this.streetWidth / 2 + 1, viewBottom);
        ctx.moveTo(x + this.streetWidth / 2 - 1, viewTop);
        ctx.lineTo(x + this.streetWidth / 2 - 1, viewBottom);
        ctx.stroke();
      }
    }
  }

  drawParks() {
    const ctx = this.ctx;

    this.parks.forEach(park => {
      const { x, y, width: w, height: h, hasPond, hasFountain, pathStyle } = park;

      // Grass
      ctx.fillStyle = this.hexToRgba('#004422', 0.4);
      ctx.fillRect(x, y, w, h);

      // Park border
      ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.2);
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Paths
      ctx.strokeStyle = this.hexToRgba(this.primaryDim, 0.15);
      ctx.lineWidth = 2;

      if (pathStyle === 0) {
        // Cross paths
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.stroke();
      } else if (pathStyle === 1) {
        // Diagonal paths
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.moveTo(x + w, y);
        ctx.lineTo(x, y + h);
        ctx.stroke();
      } else {
        // Curved path
        ctx.beginPath();
        ctx.moveTo(x, y + h / 2);
        ctx.quadraticCurveTo(x + w / 2, y + h / 4, x + w, y + h / 2);
        ctx.stroke();
      }

      // Pond
      if (hasPond) {
        const pondX = x + w * 0.3;
        const pondY = y + h * 0.6;
        const pondW = w * 0.4;
        const pondH = h * 0.3;

        ctx.fillStyle = this.hexToRgba('#003344', 0.5);
        ctx.beginPath();
        ctx.ellipse(pondX + pondW / 2, pondY + pondH / 2, pondW / 2, pondH / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.2);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Fountain
      if (hasFountain) {
        const fx = x + w / 2;
        const fy = y + h / 2;

        ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.2);
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Water animation
        const ripple = Math.sin(this.time * 3) * 2 + 6;
        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.15);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(fx, fy, ripple, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Benches
      const benchPositions = [
        { bx: x + 5, by: y + h / 2 },
        { bx: x + w - 8, by: y + h / 2 }
      ];
      benchPositions.forEach(({ bx, by }) => {
        ctx.fillStyle = this.hexToRgba(this.primaryDim, 0.3);
        ctx.fillRect(bx, by, 3, 6);
      });
    });
  }

  drawParkedCars() {
    const ctx = this.ctx;

    this.parkedCars.forEach(car => {
      this.drawCar(ctx, car.x, car.y, car.length, car.width, car.horizontal, car.color, false);
    });
  }

  drawMovingCars() {
    const ctx = this.ctx;

    this.cars.forEach(car => {
      this.drawCar(ctx, car.x, car.y, car.length, car.width, car.horizontal, car.color, car.hasHeadlights);
    });
  }

  drawCar(ctx, x, y, length, width, horizontal, color, hasHeadlights) {
    ctx.save();
    ctx.translate(x, y);

    if (!horizontal) {
      ctx.rotate(Math.PI / 2);
    }

    // Car shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(1, 1, length, width);

    // Car body
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, length, width);

    // Car outline
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.3);
    ctx.lineWidth = 0.3;
    ctx.strokeRect(0, 0, length, width);

    // Windshield
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.15);
    ctx.fillRect(length * 0.65, width * 0.15, length * 0.25, width * 0.7);

    // Rear window
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.1);
    ctx.fillRect(length * 0.1, width * 0.2, length * 0.2, width * 0.6);

    // Headlights
    if (hasHeadlights) {
      ctx.fillStyle = this.hexToRgba('#ffff88', 0.6);
      ctx.fillRect(length - 1, width * 0.15, 1, 1);
      ctx.fillRect(length - 1, width * 0.7, 1, 1);

      // Headlight glow
      const gradient = ctx.createRadialGradient(length, width / 2, 0, length, width / 2, 8);
      gradient.addColorStop(0, this.hexToRgba('#ffff88', 0.15));
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(length, width / 2, 8, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }

    // Tail lights
    ctx.fillStyle = this.hexToRgba('#ff3333', 0.5);
    ctx.fillRect(0, width * 0.1, 0.8, 0.8);
    ctx.fillRect(0, width * 0.75, 0.8, 0.8);

    ctx.restore();
  }

  drawBuildings() {
    const ctx = this.ctx;
    const viewLeft = this.camera.x - 50;
    const viewTop = this.camera.y - 50;
    const viewRight = this.camera.x + this.width / this.zoom + 50;
    const viewBottom = this.camera.y + this.height / this.zoom + 50;

    const sortedBuildings = [...this.buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));

    sortedBuildings.forEach(building => {
      if (building.x + building.width < viewLeft || building.x > viewRight ||
          building.y + building.height < viewTop || building.y > viewBottom) {
        return;
      }

      this.drawBuilding3D(ctx, building);
    });
  }

  drawBuilding3D(ctx, building) {
    const { x, y, width: w, height: h, floors, type, lit, seed, shape, roofType } = building;
    const depth = Math.min(floors * 1.8, 15);
    const baseAlpha = 0.25 + (floors / 15) * 0.2;

    // Draw building shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.drawBuildingShape(ctx, x + depth, y + depth, w, h, shape, seed);
    ctx.fill();

    // Draw 3D walls
    this.draw3DWalls(ctx, building, depth, baseAlpha);

    // Draw main roof surface
    this.drawRoofSurface(ctx, building, baseAlpha);

    // Draw parapet wall
    if (building.hasParapet) {
      this.drawParapet(ctx, building, baseAlpha);
    }

    // Draw all roof equipment and details
    this.drawDetailedRoofFeatures(ctx, building);

    // Draw depth indicator lines
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.12);
    ctx.lineWidth = 0.5;
    ctx.setLineDash([1, 3]);
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + depth, y + depth);
    ctx.moveTo(x + w, y + h);
    ctx.lineTo(x + w + depth, y + h + depth);
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + depth, y + h + depth);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawBuildingShape(ctx, x, y, w, h, shape, seed) {
    ctx.beginPath();
    if (shape === 'L-shape') {
      const cutW = w * 0.4;
      const cutH = h * 0.4;
      ctx.moveTo(x, y);
      ctx.lineTo(x + w - cutW, y);
      ctx.lineTo(x + w - cutW, y + cutH);
      ctx.lineTo(x + w, y + cutH);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
    } else if (shape === 'U-shape') {
      const cutW = w * 0.4;
      const cutH = h * 0.5;
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w - cutW * 0.3, y + h);
      ctx.lineTo(x + w - cutW * 0.3, y + cutH);
      ctx.lineTo(x + cutW * 0.3, y + cutH);
      ctx.lineTo(x + cutW * 0.3, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
    } else if (shape === 'T-shape') {
      const armW = w * 0.3;
      const armH = h * 0.4;
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + armH);
      ctx.lineTo(x + w - armW, y + armH);
      ctx.lineTo(x + w - armW, y + h);
      ctx.lineTo(x + armW, y + h);
      ctx.lineTo(x + armW, y + armH);
      ctx.lineTo(x, y + armH);
      ctx.closePath();
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  draw3DWalls(ctx, building, depth, baseAlpha) {
    const { x, y, width: w, height: h, floors, lit, seed, shape } = building;

    // Right wall
    ctx.fillStyle = this.hexToRgba(this.primaryDim, baseAlpha * 0.45);
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + depth, y + depth);
    ctx.lineTo(x + w + depth, y + h + depth);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    // Wall texture - horizontal lines for floors
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.15);
    ctx.lineWidth = 0.3;
    const floorHeight = h / Math.min(floors, 10);
    for (let f = 1; f < Math.min(floors, 10); f++) {
      const fy = y + f * floorHeight;
      ctx.beginPath();
      ctx.moveTo(x + w, fy);
      ctx.lineTo(x + w + depth, fy + depth);
      ctx.stroke();
    }

    // Wall edge
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.3);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + depth, y + depth);
    ctx.lineTo(x + w + depth, y + h + depth);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();

    // Windows on wall
    if (lit) {
      this.drawRealisticWallWindows(ctx, x + w, y, depth, h, floors, seed);
    }

    // Bottom wall
    ctx.fillStyle = this.hexToRgba(this.primaryDim, baseAlpha * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + depth, y + h + depth);
    ctx.lineTo(x + w + depth, y + h + depth);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.25);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  drawRealisticWallWindows(ctx, startX, startY, depth, height, floors, seed) {
    const visibleFloors = Math.min(floors, 8);
    const floorHeight = height / visibleFloors;

    for (let f = 0; f < visibleFloors; f++) {
      const fy = startY + f * floorHeight + floorHeight * 0.2;
      const fxOffset = (f / visibleFloors) * depth * 0.4;

      // 2-3 windows per floor
      const numWindows = 2 + Math.floor((seed + f) % 2);
      for (let w = 0; w < numWindows; w++) {
        const windowSeed = (seed * 7 + f * 13 + w * 17) % 100;
        if (windowSeed < 65) { // 65% of windows lit
          const wx = startX + fxOffset + 1 + w * 2;
          const wy = fy;
          const windowAlpha = 0.3 + Math.sin(this.time * 1.5 + seed + f * 0.5) * 0.15;

          // Window glow
          ctx.fillStyle = this.hexToRgba('#ffcc44', windowAlpha * 0.5);
          ctx.fillRect(wx - 0.5, wy - 0.5, 2.5, floorHeight * 0.5 + 1);

          // Window
          ctx.fillStyle = this.hexToRgba('#ffdd66', windowAlpha);
          ctx.fillRect(wx, wy, 1.5, floorHeight * 0.5);
        }
      }
    }
  }

  drawRoofSurface(ctx, building, baseAlpha) {
    const { x, y, width: w, height: h, roofType, seed, shape } = building;

    // Base roof color based on type
    let roofColor;
    if (roofType === 'gravel') {
      roofColor = this.hexToRgba(this.primaryDim, baseAlpha * 0.9);
    } else if (roofType === 'membrane') {
      roofColor = this.hexToRgba(this.primaryDim, baseAlpha * 1.1);
    } else if (roofType === 'green') {
      roofColor = this.hexToRgba('#004422', baseAlpha * 1.2);
    } else {
      roofColor = this.hexToRgba(this.primaryDim, baseAlpha);
    }

    // Draw roof shape
    ctx.fillStyle = roofColor;
    this.drawBuildingShape(ctx, x, y, w, h, shape, seed);
    ctx.fill();

    // Roof texture based on type
    if (roofType === 'gravel') {
      this.drawGravelTexture(ctx, x, y, w, h, seed);
    } else if (roofType === 'membrane') {
      this.drawMembraneTexture(ctx, x, y, w, h);
    } else if (roofType === 'green') {
      this.drawGreenRoofTexture(ctx, x, y, w, h, seed);
    }

    // Roof outline
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.5);
    ctx.lineWidth = 1;
    this.drawBuildingShape(ctx, x, y, w, h, shape, seed);
    ctx.stroke();
  }

  drawGravelTexture(ctx, x, y, w, h, seed) {
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.05);
    const numDots = Math.floor(w * h / 15);
    for (let i = 0; i < numDots; i++) {
      const dx = x + ((seed * 17 + i * 31) % 100) / 100 * w;
      const dy = y + ((seed * 23 + i * 37) % 100) / 100 * h;
      ctx.fillRect(dx, dy, 0.5, 0.5);
    }
  }

  drawMembraneTexture(ctx, x, y, w, h) {
    // Seam lines
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.1);
    ctx.lineWidth = 0.3;
    const seamGap = 8;
    for (let sy = y + seamGap; sy < y + h; sy += seamGap) {
      ctx.beginPath();
      ctx.moveTo(x, sy);
      ctx.lineTo(x + w, sy);
      ctx.stroke();
    }
  }

  drawGreenRoofTexture(ctx, x, y, w, h, seed) {
    // Plant patches
    ctx.fillStyle = this.hexToRgba('#006633', 0.3);
    const numPatches = Math.floor(w * h / 40);
    for (let i = 0; i < numPatches; i++) {
      const px = x + 2 + ((seed * 13 + i * 29) % 100) / 100 * (w - 4);
      const py = y + 2 + ((seed * 19 + i * 41) % 100) / 100 * (h - 4);
      const ps = 1 + ((seed + i) % 3);
      ctx.beginPath();
      ctx.arc(px, py, ps, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawParapet(ctx, building, baseAlpha) {
    const { x, y, width: w, height: h, parapetHeight } = building;
    const p = parapetHeight;

    // Parapet shadow
    ctx.fillStyle = this.hexToRgba(this.primaryDim, baseAlpha * 0.3);
    ctx.fillRect(x + p, y + p, w - p, p);
    ctx.fillRect(x + w - p, y + p, p, h - p);

    // Inner parapet edge
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.25);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + p, y + p, w - p * 2, h - p * 2);
  }

  drawDetailedRoofFeatures(ctx, building) {
    const { x, y, width: w, height: h, floors, seed, type } = building;

    // Elevator shaft / mechanical penthouse
    if (building.hasElevatorShaft && w > 12 && h > 12) {
      this.drawElevatorShaft(ctx, x, y, w, h, floors, seed);
    }

    // Stairwell access
    if (building.hasStairwellAccess && w > 10 && h > 10) {
      this.drawStairwellAccess(ctx, x, y, w, h, seed);
    }

    // HVAC / AC Units
    if (building.acUnits > 0 && w > 10) {
      this.drawACUnits(ctx, x, y, w, h, building.acUnits, seed);
    }

    // Vents
    if (building.hasVents) {
      this.drawVents(ctx, x, y, w, h, seed);
    }

    // Pipes and conduits
    if (building.hasPipes) {
      this.drawPipes(ctx, x, y, w, h, seed);
    }

    // Water tank
    if (building.hasWaterTank && w > 12 && h > 12) {
      this.drawWaterTank(ctx, x, y, w, h, seed);
    }

    // Skylights
    if (building.hasSkylights) {
      this.drawSkylights(ctx, x, y, w, h, seed);
    }

    // Solar panels
    if (building.hasSolarPanels && w > 12 && h > 12) {
      this.drawSolarPanels(ctx, x, y, w, h, seed);
    }

    // Satellite dishes
    if (building.hasSatelliteDish) {
      this.drawSatelliteDishes(ctx, x, y, w, h, seed);
    }

    // Antennas
    if (building.hasAntenna) {
      this.drawAntennas(ctx, x, y, w, h, seed, floors);
    }

    // Helipad
    if (building.hasHelipad) {
      this.drawHelipad(ctx, x, y, w, h);
    }

    // Lit windows on roof
    if (building.lit && w > 8 && h > 8) {
      this.drawRoofWindowsDetailed(ctx, x, y, w, h, seed);
    }
  }

  drawElevatorShaft(ctx, x, y, w, h, floors, seed) {
    const shaftW = Math.min(8, w * 0.25);
    const shaftH = Math.min(6, h * 0.2);
    const shaftX = x + w * 0.5 - shaftW / 2;
    const shaftY = y + 3;
    const shaftDepth = Math.min(floors * 0.8, 5);

    // Shaft shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(shaftX + shaftDepth, shaftY + shaftDepth, shaftW, shaftH);

    // Shaft walls
    ctx.fillStyle = this.hexToRgba(this.primaryDim, 0.35);
    ctx.beginPath();
    ctx.moveTo(shaftX + shaftW, shaftY);
    ctx.lineTo(shaftX + shaftW + shaftDepth, shaftY + shaftDepth);
    ctx.lineTo(shaftX + shaftW + shaftDepth, shaftY + shaftH + shaftDepth);
    ctx.lineTo(shaftX + shaftW, shaftY + shaftH);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(shaftX, shaftY + shaftH);
    ctx.lineTo(shaftX + shaftDepth, shaftY + shaftH + shaftDepth);
    ctx.lineTo(shaftX + shaftW + shaftDepth, shaftY + shaftH + shaftDepth);
    ctx.lineTo(shaftX + shaftW, shaftY + shaftH);
    ctx.fill();

    // Shaft roof
    ctx.fillStyle = this.hexToRgba(this.primaryDim, 0.45);
    ctx.fillRect(shaftX, shaftY, shaftW, shaftH);

    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.4);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(shaftX, shaftY, shaftW, shaftH);

    // Vent on shaft
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.2);
    ctx.fillRect(shaftX + shaftW * 0.3, shaftY + 1, shaftW * 0.4, 2);
  }

  drawStairwellAccess(ctx, x, y, w, h, seed) {
    const stairW = 4;
    const stairH = 5;
    const stairX = x + w - stairW - 3;
    const stairY = y + h - stairH - 3;

    // Door housing
    ctx.fillStyle = this.hexToRgba(this.primaryDim, 0.4);
    ctx.fillRect(stairX, stairY, stairW, stairH);

    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.35);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(stairX, stairY, stairW, stairH);

    // Door
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.15);
    ctx.fillRect(stairX + 1, stairY + 1, stairW - 2, stairH - 1);
  }

  drawACUnits(ctx, x, y, w, h, count, seed) {
    const unitW = 4;
    const unitH = 3;

    for (let i = 0; i < Math.min(count, 4); i++) {
      const ux = x + 3 + (i % 2) * (w * 0.4);
      const uy = y + h * 0.4 + Math.floor(i / 2) * (unitH + 3);

      if (ux + unitW < x + w - 3 && uy + unitH < y + h - 3) {
        // Unit shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(ux + 1, uy + 1, unitW, unitH);

        // Unit body
        ctx.fillStyle = this.hexToRgba(this.primaryDim, 0.35);
        ctx.fillRect(ux, uy, unitW, unitH);

        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.3);
        ctx.lineWidth = 0.4;
        ctx.strokeRect(ux, uy, unitW, unitH);

        // Fan grill
        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.25);
        ctx.beginPath();
        ctx.arc(ux + unitW / 2, uy + unitH / 2, 1.2, 0, Math.PI * 2);
        ctx.stroke();

        // Fan blades (animated)
        const rotation = this.time * 3 + seed + i;
        ctx.save();
        ctx.translate(ux + unitW / 2, uy + unitH / 2);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.moveTo(-0.8, 0);
        ctx.lineTo(0.8, 0);
        ctx.moveTo(0, -0.8);
        ctx.lineTo(0, 0.8);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawVents(ctx, x, y, w, h, seed) {
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.15);
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.25);
    ctx.lineWidth = 0.3;

    const numVents = 2 + Math.floor(seed % 3);
    for (let i = 0; i < numVents; i++) {
      const vx = x + 2 + ((seed * 11 + i * 23) % 100) / 100 * (w - 6);
      const vy = y + 2 + ((seed * 17 + i * 31) % 100) / 100 * (h - 6);

      // Circular vent
      ctx.beginPath();
      ctx.arc(vx, vy, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Vent grill lines
      ctx.beginPath();
      ctx.moveTo(vx - 1, vy);
      ctx.lineTo(vx + 1, vy);
      ctx.stroke();
    }
  }

  drawPipes(ctx, x, y, w, h, seed) {
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.2);
    ctx.lineWidth = 0.8;

    // Horizontal pipe
    const py = y + h * 0.7;
    ctx.beginPath();
    ctx.moveTo(x + 2, py);
    ctx.lineTo(x + w * 0.6, py);
    ctx.stroke();

    // Vertical pipe
    const px = x + w * 0.3;
    ctx.beginPath();
    ctx.moveTo(px, y + 3);
    ctx.lineTo(px, y + h * 0.5);
    ctx.stroke();

    // Pipe joints
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.25);
    ctx.beginPath();
    ctx.arc(px, py, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWaterTank(ctx, x, y, w, h, seed) {
    const tankX = x + w * 0.1;
    const tankY = y + h * 0.6;
    const tankW = 6;
    const tankH = 4;

    // Tank shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(tankX + tankW / 2 + 1, tankY + tankH / 2 + 1, tankW / 2, tankH / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tank body
    ctx.fillStyle = this.hexToRgba(this.primaryDim, 0.4);
    ctx.beginPath();
    ctx.ellipse(tankX + tankW / 2, tankY + tankH / 2, tankW / 2, tankH / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.35);
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Tank supports
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.2);
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(tankX + 1, tankY + tankH);
    ctx.lineTo(tankX + 1, tankY + tankH + 2);
    ctx.moveTo(tankX + tankW - 1, tankY + tankH);
    ctx.lineTo(tankX + tankW - 1, tankY + tankH + 2);
    ctx.stroke();
  }

  drawSkylights(ctx, x, y, w, h, seed) {
    const numSkylights = 2 + Math.floor(seed % 3);
    const skylightW = 3;
    const skylightH = 4;

    for (let i = 0; i < numSkylights; i++) {
      const sx = x + w * 0.3 + (i * (skylightW + 4));
      const sy = y + h * 0.5;

      if (sx + skylightW < x + w - 3) {
        // Skylight frame
        ctx.fillStyle = this.hexToRgba('#003344', 0.4);
        ctx.fillRect(sx, sy, skylightW, skylightH);

        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.35);
        ctx.lineWidth = 0.5;
        ctx.strokeRect(sx, sy, skylightW, skylightH);

        // Glass reflection
        ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.15);
        ctx.fillRect(sx + 0.5, sy + 0.5, skylightW - 1, skylightH * 0.4);
      }
    }
  }

  drawSolarPanels(ctx, x, y, w, h, seed) {
    const panelAreaX = x + w * 0.5;
    const panelAreaY = y + h * 0.15;
    const panelW = w * 0.4;
    const panelH = h * 0.35;

    // Panel background
    ctx.fillStyle = this.hexToRgba('#001133', 0.5);
    ctx.fillRect(panelAreaX, panelAreaY, panelW, panelH);

    // Panel cells
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.2);
    ctx.lineWidth = 0.3;

    const cellW = panelW / 4;
    const cellH = panelH / 3;

    for (let cx = 0; cx < 4; cx++) {
      for (let cy = 0; cy < 3; cy++) {
        ctx.strokeRect(panelAreaX + cx * cellW, panelAreaY + cy * cellH, cellW, cellH);
      }
    }

    // Frame
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.35);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(panelAreaX, panelAreaY, panelW, panelH);

    // Reflection highlight
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.1);
    ctx.fillRect(panelAreaX + 1, panelAreaY + 1, panelW * 0.3, panelH * 0.2);
  }

  drawSatelliteDishes(ctx, x, y, w, h, seed) {
    const dishX = x + w * 0.8;
    const dishY = y + h * 0.2;
    const dishSize = 3;

    // Dish mount
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.25);
    ctx.fillRect(dishX - 0.5, dishY + dishSize * 0.5, 1, 2);

    // Dish
    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.4);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(dishX, dishY, dishSize, Math.PI * 0.7, Math.PI * 1.8);
    ctx.stroke();

    // LNB arm
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(dishX, dishY);
    ctx.lineTo(dishX + dishSize * 0.6, dishY - dishSize * 0.3);
    ctx.stroke();

    // LNB
    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.3);
    ctx.beginPath();
    ctx.arc(dishX + dishSize * 0.6, dishY - dishSize * 0.3, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAntennas(ctx, x, y, w, h, seed, floors) {
    const numAntennas = 1 + Math.floor(seed % 2);

    for (let i = 0; i < numAntennas; i++) {
      const ax = x + w * (0.85 - i * 0.15);
      const ay = y + 3 + i * 2;
      const antennaHeight = 4 + floors * 0.3;

      // Antenna pole
      ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.4);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax, ay - antennaHeight);
      ctx.stroke();

      // Cross bars
      if (i === 0) {
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(ax - 1.5, ay - antennaHeight + 2);
        ctx.lineTo(ax + 1.5, ay - antennaHeight + 2);
        ctx.moveTo(ax - 1, ay - antennaHeight + 3.5);
        ctx.lineTo(ax + 1, ay - antennaHeight + 3.5);
        ctx.stroke();
      }

      // Blinking light
      const blinkPhase = Math.sin(this.time * 3 + seed + i * 2);
      if (blinkPhase > 0.2) {
        ctx.fillStyle = this.alertColor;
        ctx.shadowColor = this.alertColor;
        ctx.shadowBlur = blinkPhase * 6;
        ctx.beginPath();
        ctx.arc(ax, ay - antennaHeight, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  drawHelipad(ctx, x, y, w, h) {
    const hx = x + w / 2;
    const hy = y + h / 2;
    const radius = Math.min(w, h) * 0.35;

    // Helipad circle
    ctx.strokeStyle = this.hexToRgba(this.alertColor, 0.4);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(hx, hy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle
    ctx.strokeStyle = this.hexToRgba(this.alertColor, 0.25);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(hx, hy, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // H marking
    ctx.fillStyle = this.hexToRgba(this.alertColor, 0.5);
    ctx.font = `bold ${Math.floor(radius)}px "Share Tech Mono"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', hx, hy);

    // Corner markers
    const markers = [
      { mx: hx - radius * 0.9, my: hy - radius * 0.9 },
      { mx: hx + radius * 0.9, my: hy - radius * 0.9 },
      { mx: hx - radius * 0.9, my: hy + radius * 0.9 },
      { mx: hx + radius * 0.9, my: hy + radius * 0.9 }
    ];

    ctx.fillStyle = this.hexToRgba(this.alertColor, 0.4);
    markers.forEach(({ mx, my }) => {
      ctx.fillRect(mx - 1, my - 1, 2, 2);
    });
  }

  drawRoofWindowsDetailed(ctx, x, y, w, h, seed) {
    const windowSize = 1.5;
    const windowGap = 4;
    const margin = 5;

    for (let wy = y + margin; wy < y + h - margin; wy += windowGap) {
      for (let wx = x + margin; wx < x + w - margin; wx += windowGap) {
        const windowSeed = (wx * 7 + wy * 13 + seed) % 100;
        if (windowSeed < 40) {
          const windowAlpha = 0.25 + Math.sin(this.time * 2 + windowSeed * 0.05) * 0.12;

          // Window glow
          ctx.fillStyle = this.hexToRgba('#ffcc44', windowAlpha * 0.4);
          ctx.fillRect(wx - 0.5, wy - 0.5, windowSize + 1, windowSize + 1);

          // Window
          ctx.fillStyle = this.hexToRgba('#ffdd66', windowAlpha);
          ctx.fillRect(wx, wy, windowSize, windowSize);
        }
      }
    }
  }

  drawTrees() {
    const ctx = this.ctx;
    const viewLeft = this.camera.x - 20;
    const viewTop = this.camera.y - 20;
    const viewRight = this.camera.x + this.width / this.zoom + 20;
    const viewBottom = this.camera.y + this.height / this.zoom + 20;

    this.trees.forEach(tree => {
      if (tree.x < viewLeft - 10 || tree.x > viewRight + 10 ||
          tree.y < viewTop - 10 || tree.y > viewBottom + 10) {
        return;
      }

      const { x, y, size, type } = tree;

      // Tree shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(x + 1.5, y + 1.5, size, 0, Math.PI * 2);
      ctx.fill();

      if (type === 'round') {
        // Round tree canopy
        const gradient = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
        gradient.addColorStop(0, this.hexToRgba('#006633', 0.5));
        gradient.addColorStop(1, this.hexToRgba('#003311', 0.4));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.25);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else if (type === 'pine') {
        // Pine tree (triangular)
        ctx.fillStyle = this.hexToRgba('#004422', 0.45);
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.lineTo(x - size, y + size);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.2);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // Oak tree (irregular)
        ctx.fillStyle = this.hexToRgba('#005522', 0.45);
        ctx.beginPath();
        ctx.arc(x - size * 0.3, y, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.6, 0, Math.PI * 2);
        ctx.arc(x, y + size * 0.3, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.2);
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Trunk (visible in center)
      ctx.fillStyle = this.hexToRgba('#332211', 0.4);
      ctx.beginPath();
      ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawStreetLights() {
    const ctx = this.ctx;
    const viewLeft = this.camera.x - 20;
    const viewTop = this.camera.y - 20;
    const viewRight = this.camera.x + this.width / this.zoom + 20;
    const viewBottom = this.camera.y + this.height / this.zoom + 20;

    this.streetLights.forEach(light => {
      if (light.x < viewLeft || light.x > viewRight ||
          light.y < viewTop || light.y > viewBottom) {
        return;
      }

      const flicker = 0.7 + Math.sin(this.time * 3 + light.phase) * 0.3;
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, 12);
      gradient.addColorStop(0, this.hexToRgba(this.primaryColor, 0.12 * flicker));
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(light.x, light.y, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.5);
      ctx.beginPath();
      ctx.arc(light.x, light.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawTrail() {
    const ctx = this.ctx;
    const trailColor = this.isAcquired ? this.alertColor : '#ff6600';

    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const alpha = (i / this.trail.length) * 0.6;
      const size = 1 + (i / this.trail.length) * 2;

      ctx.fillStyle = this.hexToRgba(trailColor, alpha);
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTarget() {
    const ctx = this.ctx;
    const blipColor = this.isAcquired ? this.alertColor : '#ff4400';

    this.pulsePhase += 0.12;
    const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
    const radius = 5 * pulse;

    const x = this.targetPos.x;
    const y = this.targetPos.y;

    ctx.shadowColor = blipColor;
    ctx.shadowBlur = 15;

    ctx.fillStyle = this.hexToRgba(blipColor, 0.2);
    ctx.beginPath();
    ctx.arc(x, y, radius + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.hexToRgba(blipColor, 0.4);
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = blipColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Direction indicator
    if (this.targetPath.length > 0 && this.targetPathIndex < this.targetPath.length) {
      const nextWaypoint = this.targetPath[this.targetPathIndex];
      const angle = Math.atan2(nextWaypoint.y - y, nextWaypoint.x - x);

      ctx.strokeStyle = this.hexToRgba(blipColor, 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
      ctx.lineTo(x + Math.cos(angle) * 18, y + Math.sin(angle) * 18);
      ctx.stroke();

      const arrowSize = 4;
      const arrowX = x + Math.cos(angle) * 18;
      const arrowY = y + Math.sin(angle) * 18;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - Math.cos(angle - 0.5) * arrowSize, arrowY - Math.sin(angle - 0.5) * arrowSize);
      ctx.lineTo(arrowX - Math.cos(angle + 0.5) * arrowSize, arrowY - Math.sin(angle + 0.5) * arrowSize);
      ctx.closePath();
      ctx.fillStyle = this.hexToRgba(blipColor, 0.6);
      ctx.fill();
    }
  }

  drawCrosshair() {
    const ctx = this.ctx;
    const x = this.targetPos.x;
    const y = this.targetPos.y;

    this.crosshairPhase += 0.1;

    const size = 25 + Math.sin(this.crosshairPhase * 2) * 4;
    const alpha = 0.7 + Math.sin(this.crosshairPhase * 3) * 0.2;
    const rotation = this.crosshairPhase * 0.3;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    ctx.strokeStyle = this.hexToRgba(this.alertColor, alpha);
    ctx.lineWidth = 2;
    ctx.shadowColor = this.alertColor;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, -size / 3);
    ctx.moveTo(0, size / 3);
    ctx.lineTo(0, size);
    ctx.moveTo(-size, 0);
    ctx.lineTo(-size / 3, 0);
    ctx.moveTo(size / 3, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    const bracketSize = size * 0.7;
    const gap = size * 0.4;

    ctx.beginPath();
    ctx.moveTo(-bracketSize, -gap);
    ctx.lineTo(-bracketSize, -bracketSize);
    ctx.lineTo(-gap, -bracketSize);
    ctx.moveTo(gap, -bracketSize);
    ctx.lineTo(bracketSize, -bracketSize);
    ctx.lineTo(bracketSize, -gap);
    ctx.moveTo(bracketSize, gap);
    ctx.lineTo(bracketSize, bracketSize);
    ctx.lineTo(gap, bracketSize);
    ctx.moveTo(-gap, bracketSize);
    ctx.lineTo(-bracketSize, bracketSize);
    ctx.lineTo(-bracketSize, gap);
    ctx.stroke();

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  drawHUD() {
    const ctx = this.ctx;

    const scanY = (this.time * 40) % this.height;
    const gradient = ctx.createLinearGradient(0, scanY - 3, 0, scanY + 3);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, this.hexToRgba(this.primaryColor, 0.06));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, scanY - 3, this.width, 6);

    ctx.strokeStyle = this.hexToRgba(this.primaryColor, 0.4);
    ctx.lineWidth = 1;

    const cornerSize = 15;
    ctx.beginPath();
    ctx.moveTo(5, 5 + cornerSize);
    ctx.lineTo(5, 5);
    ctx.lineTo(5 + cornerSize, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.width - 5 - cornerSize, 5);
    ctx.lineTo(this.width - 5, 5);
    ctx.lineTo(this.width - 5, 5 + cornerSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, this.height - 5 - cornerSize);
    ctx.lineTo(5, this.height - 5);
    ctx.lineTo(5 + cornerSize, this.height - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.width - 5 - cornerSize, this.height - 5);
    ctx.lineTo(this.width - 5, this.height - 5);
    ctx.lineTo(this.width - 5, this.height - 5 - cornerSize);
    ctx.stroke();

    ctx.fillStyle = this.hexToRgba(this.primaryColor, 0.5);
    ctx.font = '8px "Share Tech Mono"';
    ctx.textAlign = 'center';
    ctx.fillText('N', this.width / 2, 12);
  }

  animate(currentTime) {
    if (!this.enabled) return;

    if (currentTime - this.lastFrameTime < this.frameInterval) {
      this.animationId = requestAnimationFrame((t) => this.animate(t));
      return;
    }
    this.lastFrameTime = currentTime;

    this.updateTarget();
    this.checkTargetAcquired();
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  onTargetAcquired(callback) {
    this.targetAcquiredCallback = callback;
  }

  start() {
    if (!this.canvas || this.animationId) return;
    this.enabled = true;
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  stop() {
    this.enabled = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled && !this.animationId) {
      this.start();
    } else if (!enabled) {
      this.stop();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CityMapRenderer;
}

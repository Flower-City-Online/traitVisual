import * as THREE from 'three';

export interface FlowParticle {
  spline: THREE.CatmullRomCurve3;
  progress: number; // 0-1 position along spline
  speed: number; // Speed multiplier
  size: number; // Particle size
  color: THREE.Color; // Particle color
  opacity: number; // Base opacity
  lifetime: number; // Total lifetime in seconds
  age: number; // Current age in seconds
  type: 'rim-top' | 'rim-bottom'; // Flow pattern type
}

export class BlackHoleParticleField {
  private scene: THREE.Scene;
  private particles: FlowParticle[] = [];
  private particleSystem: THREE.Points | null = null;
  private particleCount: number = 800; // Dense field like reference image
  private blackHolePosition: THREE.Vector3 = new THREE.Vector3();

  // Visual parameters
  private readonly FIELD_RADIUS = 0.25; // Ultra-tight around black hole rim
  private readonly BLACK_HOLE_RADIUS = 0.2; // Smaller event horizon
  private readonly NEON_PURPLE = new THREE.Color(0xc300ff);
  private readonly PINK_RED = new THREE.Color(0xff3366);

  // Animation parameters - MUCH FASTER
  private readonly MIN_SPEED = 2.0;
  private readonly MAX_SPEED = 6.0;
  private readonly MIN_LIFETIME = 3.0;
  private readonly MAX_LIFETIME = 8.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeParticleField();
  }

  private initializeParticleField(): void {
    // Create initial particles
    this.generateParticles();
    this.createParticleSystem();
  }

  private generateParticles(): void {
    this.particles = [];

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.createNewParticle();
      this.particles.push(particle);
    }
  }

  private createNewParticle(): FlowParticle {
    // Single spawn point: Left center edge of black hole
    const spawnPosition = new THREE.Vector3(
      -this.BLACK_HOLE_RADIUS, // Exact left edge of black hole
      0, // Center height
      0  // Center depth
    );

    // Only two particle types: rim-top (50%) or rim-bottom (50%)
    const particleType: FlowParticle['type'] = Math.random() < 0.5 ? 'rim-top' : 'rim-bottom';

    const spline = this.generateSplinePath(spawnPosition, particleType);

    // Color selection (70% purple, 30% pink-red)
    const color =
      Math.random() < 0.7 ? this.NEON_PURPLE.clone() : this.PINK_RED.clone();

    return {
      spline,
      progress: 0,
      speed: this.MIN_SPEED + Math.random() * (this.MAX_SPEED - this.MIN_SPEED),
      size: 1.0 + Math.random() * 3.0, // Properly visible: 1.0 to 4.0 pixels

      color,
      opacity: 0.8, // High opacity for debugging
      lifetime:
        this.MIN_LIFETIME +
        Math.random() * (this.MAX_LIFETIME - this.MIN_LIFETIME),
      age: 0,
      type: particleType,
    };
  }

  private generateSplinePath(
    startPos: THREE.Vector3,
    type: FlowParticle['type']
  ): THREE.CatmullRomCurve3 {
    switch (type) {
      case 'rim-top':
        return this.generateRimTopFlow(startPos);
      case 'rim-bottom':
        return this.generateRimBottomFlow(startPos);
      default:
        return this.generateRimTopFlow(startPos);
    }
  }

  private generateRimTopFlow(startPos: THREE.Vector3): THREE.CatmullRomCurve3 {
    // Create tight curve around TOP rim of black hole
    const controlPoints: THREE.Vector3[] = [];
    
    // Start: Left edge of black hole
    controlPoints.push(startPos.clone());
    
    // Control point 1: Top-left curve, very close to rim
    controlPoints.push(new THREE.Vector3(
      -this.BLACK_HOLE_RADIUS * 0.5, // halfway left
      +this.BLACK_HOLE_RADIUS * 0.75, // top curve, close to rim
      0
    ));
    
    // Control point 2: Top-right curve, very close to rim  
    controlPoints.push(new THREE.Vector3(
      +this.BLACK_HOLE_RADIUS * 0.5, // halfway right
      +this.BLACK_HOLE_RADIUS * 0.75, // top curve, close to rim
      0
    ));
    
    // End: Right exit point, slightly beyond field
    controlPoints.push(new THREE.Vector3(
      +this.FIELD_RADIUS, // right exit
      0, // center height
      0
    ));
    
    return new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.5);
  }

  private generateRimBottomFlow(startPos: THREE.Vector3): THREE.CatmullRomCurve3 {
    // Create tight curve around BOTTOM rim of black hole
    const controlPoints: THREE.Vector3[] = [];
    
    // Start: Left edge of black hole (same as top)
    controlPoints.push(startPos.clone());
    
    // Control point 1: Bottom-left curve, very close to rim
    controlPoints.push(new THREE.Vector3(
      -this.BLACK_HOLE_RADIUS * 0.5, // halfway left  
      -this.BLACK_HOLE_RADIUS * 0.75, // bottom curve, close to rim
      0
    ));
    
    // Control point 2: Bottom-right curve, very close to rim
    controlPoints.push(new THREE.Vector3(
      +this.BLACK_HOLE_RADIUS * 0.5, // halfway right
      -this.BLACK_HOLE_RADIUS * 0.75, // bottom curve, close to rim  
      0
    ));
    
    // End: Right exit point, slightly beyond field (same as top)
    controlPoints.push(new THREE.Vector3(
      +this.FIELD_RADIUS, // right exit
      0, // center height
      0
    ));
    
    return new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.5);
  }


  private createParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const opacities = new Float32Array(this.particleCount);

    // Initialize particle positions and attributes
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      const position = particle.spline.getPointAt(0);

      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      colors[i * 3] = particle.color.r;
      colors[i * 3 + 1] = particle.color.g;
      colors[i * 3 + 2] = particle.color.b;

      sizes[i] = particle.size;
      opacities[i] = particle.opacity;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    // Debug: Use simple PointsMaterial first to check if particles are there
    const material = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: false, // Fixed size for debugging
      depthWrite: false,
      size: 5.0, // Large size for visibility testing
      opacity: 0.8 // High opacity for debugging
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  update(blackHolePosition: THREE.Vector3, deltaTime: number): void {
    this.blackHolePosition.copy(blackHolePosition);

    if (!this.particleSystem) return;

    const positions = this.particleSystem.geometry.attributes['position']
      .array as Float32Array;
    const opacities = this.particleSystem.geometry.attributes['opacity']
      .array as Float32Array;
    const sizes = this.particleSystem.geometry.attributes['size']
      .array as Float32Array;
    const colors = this.particleSystem.geometry.attributes['color']
      .array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];

      // Update particle age and progress
      particle.age += deltaTime;
      particle.progress += (particle.speed * deltaTime) / particle.lifetime;

      // Check if particle needs recycling
      if (particle.progress >= 1.0 || particle.age >= particle.lifetime) {
        // Recycle particle
        const newParticle = this.createNewParticle();
        this.particles[i] = newParticle;
        
        // Update recycled particle attributes
        colors[i * 3] = newParticle.color.r;
        colors[i * 3 + 1] = newParticle.color.g;
        colors[i * 3 + 2] = newParticle.color.b;
        sizes[i] = newParticle.size;
      }

      // Get position along spline
      const t = Math.min(particle.progress, 1.0);
      const position = particle.spline.getPointAt(t);

      // Offset by black hole position
      position.add(this.blackHolePosition);

      // Update geometry
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Update opacity based on distance from camera and age
      const distanceFromBlackHole = position.distanceTo(this.blackHolePosition);
      const distanceFactor = Math.max(
        0.05,
        Math.min(0.4, 1.5 / (distanceFromBlackHole + 1.0))
      ); // Reduced max opacity
      const ageFactor = Math.sin((particle.age / particle.lifetime) * Math.PI); // Fade in/out
      opacities[i] = 1.0; // Max opacity for debugging
    }

    // Mark attributes as needing update
    this.particleSystem.geometry.attributes['position'].needsUpdate = true;
    this.particleSystem.geometry.attributes['opacity'].needsUpdate = true;
    this.particleSystem.geometry.attributes['size'].needsUpdate = true;
    this.particleSystem.geometry.attributes['color'].needsUpdate = true;
  }

  dispose(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particleSystem = null;
    }
    this.particles = [];
  }
}

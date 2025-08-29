import * as THREE from 'three';

// A single orbiting bubble/particle around the black hole.
// We switch from spline flow to true 3D orbits defined by a plane basis (u, v).
export interface FlowParticle {
  // Arc category for controlled flow
  type: 'top' | 'bottom' | 'orbit' | 'centerH';
  // Orbital params (screen-plane aligned)
  radius: number; // local radius from center
  angle: number; // current angle along arc (radians)
  angularSpeed: number; // radians per second (positive; direction by type)
  radialJitterAmp: number; // small breathing of radius
  radialJitterFreq: number; // Hz for radius jitter

  // Visuals
  size: number; // pixels (fed to shader)
  color: THREE.Color; // vertex color
  opacity: number; // for shader

  // Recycling
  lifetime: number; // seconds
  age: number; // seconds
}

export class BlackHoleParticleField {
  private scene: THREE.Scene;
  private particles: FlowParticle[] = [];
  private particleSystem: THREE.Points | null = null;

  // Natural particle count for bubble-like effect
  private particleCount: number = 70;

  // Visual parameters (unchanged)
  private readonly FIELD_RADIUS = 0.35; // visual extent for orbits
  // Match cursor sphere radius in AppComponent.createBlackHoleCursor (0.3)
  private readonly BLACK_HOLE_RADIUS = 0.3;

  private readonly NEON_PURPLE = new THREE.Color(0xc300ff);
  private readonly PINK_RED = new THREE.Color(0xff3366);

  // Animation params (slower, smoother orbits)
  private readonly MIN_SPEED = 0.4; // radians/sec
  private readonly MAX_SPEED = 1.2;
  private readonly MIN_LIFETIME = 3.0;
  private readonly MAX_LIFETIME = 6.0;

  // --- NEW: anchor tracking (no app changes needed)
  private targetAnchor = new THREE.Vector3(); // last received from update()
  private anchor = new THREE.Vector3(); // smoothed, z=0
  private readonly anchorLerp = 0.2; // follow smoothing

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializeParticleField();
  }

  // --------------------------- init ---------------------------

  private initializeParticleField(): void {
    this.generateParticles();
    this.createParticleSystem();
  }

  private generateParticles(): void {
    this.particles.length = 0;

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createNewParticle());
    }
  }

  private createNewParticle(): FlowParticle {
    // Distribution: 40% top, 40% bottom, 10% full 360° orbit (vertical plane), 10% center-horizontal orbits
    const rpick = Math.random();
    const type: FlowParticle['type'] =
      rpick < 0.4 ? 'top' : rpick < 0.8 ? 'bottom' : rpick < 0.9 ? 'orbit' : 'centerH';

    // Keep orbits outside the black hole mesh
    const rim = this.BLACK_HOLE_RADIUS * 1.22; // outer near‑rim band
    const rimBand = 0.132; // 10% wider band
    // For centerH, bias to near‑core band so it crosses in front/behind the BH
    const centerMin = this.BLACK_HOLE_RADIUS * 1.05;
    const centerMax = this.BLACK_HOLE_RADIUS * 1.15;
    const radius =
      type === 'centerH'
        ? THREE.MathUtils.lerp(centerMin, centerMax, Math.random())
        : rim + Math.random() * rimBand;

    // Start at left rim (−π or +π)
    let angle = type === 'bottom' ? -Math.PI : Math.PI; // 'orbit' & 'centerH' also start at left
    angle += (Math.random() - 0.5) * 0.05; // tiny variance
    const angularSpeed = THREE.MathUtils.lerp(
      this.MIN_SPEED,
      this.MAX_SPEED,
      Math.random()
    );

    // Subtle breathing; even smaller for centerH so it never clips into core
    const radialJitterAmp = radius * (type === 'centerH' ? 0.008 : 0.015) * Math.random();
    const radialJitterFreq = 0.5 + Math.random() * 1.0; // Hz

    const color =
      Math.random() < 0.7 ? this.NEON_PURPLE.clone() : this.PINK_RED.clone();

    return {
      type,
      radius,
      angle,
      angularSpeed,
      radialJitterAmp,
      radialJitterFreq,
      size: 1.0 + Math.random() * 3.0,
      color,
      opacity: 0.85,
      lifetime:
        this.MIN_LIFETIME +
        Math.random() * (this.MAX_LIFETIME - this.MIN_LIFETIME),
      age: Math.random() * 0.5,
    };
  }

  // (Removed spline generation in favor of analytic 3D orbits)

  // --------------------- THREE objects -----------------------

  private createParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    // (Kept for future shader; PointsMaterial won’t use them per-vertex)
    const sizes = new Float32Array(this.particleCount);
    const opacities = new Float32Array(this.particleCount);

    // Initialize LOCAL positions (do NOT offset by anchor here)
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      const xy = this.getLocalOrbitPos(
        p,
        0,
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1)
      ); // initial position
      positions[i * 3 + 0] = xy.x;
      positions[i * 3 + 1] = xy.y;
      positions[i * 3 + 2] = xy.z;

      colors[i * 3 + 0] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;

      sizes[i] = p.size;
      opacities[i] = p.opacity;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    // Mark frequently-updated attributes
    // No need for setUsage in the current version of THREE.js
    // Just use needsUpdate to tell Three.js to re-upload the buffers each frame
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('color').needsUpdate = true;

    // Custom bubble shader for perfect circular bubbles with dramatic lighting
    const vertexShader = `
      attribute float size;
      attribute float opacity;
      varying vec3 vColor;
      varying float vOpacity;
      varying float vSize;
      
      void main() {
        vColor = color;
        vOpacity = opacity;
        vSize = size;
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // 4x larger than current tiny size
        gl_PointSize = size * 4.0;
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      varying float vOpacity;
      varying float vSize;
      
      void main() {
        // Create circular bubble coordinate system
        vec2 center = gl_PointCoord - 0.5;
        float distance = length(center);
        
        // Perfect circular mask - discard pixels outside circle
        if (distance > 0.5) discard;
        
        // Dramatic bubble lighting effects
        float rimDistance = distance * 2.0; // 0.0 at center, 1.0 at edge
        
        // Bright center fading to edge (soap bubble effect)
        float centerGlow = 1.0 - smoothstep(0.0, 0.3, rimDistance);
        
        // Rim lighting - bright edges
        float rimGlow = smoothstep(0.7, 1.0, rimDistance) * 2.0;
        
        // Glass-like inner reflection
        float bubble = smoothstep(0.8, 0.2, rimDistance);
        
        // Combine lighting effects
        float totalGlow = centerGlow * 0.8 + rimGlow * 1.5 + bubble * 0.6;
        
        // Final bubble color with dramatic lighting
        vec3 finalColor = vColor * totalGlow * 1.8;
        
        // Smooth alpha falloff for glass-like appearance
        float alpha = (1.0 - smoothstep(0.3, 0.5, distance)) * vOpacity;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.frustumCulled = false;

    // Initial anchor placement at origin; will follow in update()
    this.particleSystem.position.copy(this.anchor);

    this.scene.add(this.particleSystem);
  }

  // ------------------------- update --------------------------

  /**
   * Keeps the API you already use:
   *   update(this.cursorMesh.position, deltaTime)
   */
  update(
    blackHolePosition: THREE.Vector3,
    deltaTime: number,
    camera?: THREE.Camera
  ): void {
    if (!this.particleSystem) return;

    // 1) Accept input, use full 3D coordinates with slight forward offset
    const x = blackHolePosition?.x;
    const y = blackHolePosition?.y;
    const z = blackHolePosition?.z;
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      // Anchor exactly at the black hole position (no world-Z offset)
      this.targetAnchor.set(x, y, z);
    }
    // Smooth follow to avoid jitter (and hide any one-frame glitches)
    this.anchor.lerp(this.targetAnchor, this.anchorLerp);

    // Move the ENTIRE particle system to the anchor.
    // Geometry stays in LOCAL rim-space.
    this.particleSystem.position.copy(this.anchor);

    // 2) Delta time guard
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) deltaTime = 1 / 60;

    const geom = this.particleSystem.geometry as THREE.BufferGeometry;
    const positions = geom.getAttribute('position').array as Float32Array;
    const colors = geom.getAttribute('color').array as Float32Array;
    // (sizes/opacities kept for shader)
    const sizes = geom.getAttribute('size').array as Float32Array;

    // 3) Animate along camera‑aligned arcs
    // Build camera basis (right/up/forward)
    const forward = new THREE.Vector3(0, 0, 1);
    const camUp = new THREE.Vector3(0, 1, 0);
    if (camera) {
      camera.getWorldDirection(forward);
      camUp.copy(camera.up).normalize();
    }
    const right = new THREE.Vector3().crossVectors(forward, camUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];

      p.age += deltaTime;
      // Direction per type: ensure left→right sweep
      if (p.type === 'top') {
        p.angle -= p.angularSpeed * deltaTime; // clockwise over top arc
        if (p.angle < 0) p.angle = Math.PI + (Math.random() - 0.5) * 0.1;
      } else if (p.type === 'bottom') {
        p.angle += p.angularSpeed * deltaTime; // counterclockwise over bottom arc
        if (p.angle > 0) p.angle = -Math.PI + (Math.random() - 0.5) * 0.1;
      } else if (p.type === 'orbit') {
        // continuous 360° revolution (left→right→left...), stay outside core
        p.angle += p.angularSpeed * deltaTime;
        if (p.angle > Math.PI) p.angle -= Math.PI * 2;
      }

      if (p.age >= p.lifetime) {
        p = this.createNewParticle();
        this.particles[i] = p;
        colors[i * 3 + 0] = p.color.r;
        colors[i * 3 + 1] = p.color.g;
        colors[i * 3 + 2] = p.color.b;
        sizes[i] = p.size;
      }

      const local = this.getLocalOrbitPos(p, p.age, right, up, forward);

      positions[i * 3 + 0] = local.x;
      positions[i * 3 + 1] = local.y;
      positions[i * 3 + 2] = local.z;
    }

    // 4) Push updates
    geom.getAttribute('position').needsUpdate = true;
    geom.getAttribute('color').needsUpdate = true;
    geom.computeBoundingSphere?.();
  }

  // Compute local position on the orbit for a particle at its current angle,
  // adding a subtle radial breathing.
  private getLocalOrbitPos(
    p: FlowParticle,
    age: number,
    right: THREE.Vector3,
    up: THREE.Vector3,
    forward: THREE.Vector3
  ): THREE.Vector3 {
    const jitter = p.radialJitterAmp * Math.sin(age * 2 * Math.PI * p.radialJitterFreq);
    let r = Math.max(0.001, p.radius + jitter);
    const cosA = Math.cos(p.angle);
    const sinA = Math.sin(p.angle);
    const out = new THREE.Vector3();
    if (p.type === 'centerH') {
      // revolve in right-forward plane near the core; small vertical wobble
      out.copy(right).multiplyScalar(r * cosA);
      out.add(forward.clone().multiplyScalar(r * sinA));
      const wobble = 0.008 * Math.sin(age * 0.9 + cosA * 0.5);
      out.add(up.clone().multiplyScalar(wobble));
    } else {
      // top/bottom/orbit in right-up plane; small forward depth motion
      const depth = 0.02 * Math.sin(age * 0.8);
      out.copy(right).multiplyScalar(r * cosA);
      out.add(up.clone().multiplyScalar(r * sinA));
      out.add(forward.clone().multiplyScalar(depth));
    }
    return out;
  }

  // ------------------------ cleanup --------------------------

  dispose(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particleSystem = null;
    }
    this.particles.length = 0;
  }
}

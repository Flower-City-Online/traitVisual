import * as THREE from 'three';
import { ISimulationConfigs, INodeData, ISwapAnimation } from '../app.types';

export class Node extends THREE.Object3D {
  options: ISimulationConfigs;
  velocity: THREE.Vector3;
  isSun: boolean;
  attributes: number[];
  preferences: number[];
  preference: number = 0;
  mesh: THREE.Mesh;
  private sunBaseScale: number = 3;
  private halo!: THREE.Mesh;
  private coreSprite!: THREE.Sprite;
  private haloSprite!: THREE.Sprite;
  private readonly baseSphereRadius = 0.05; // geometry radius
  swap: ISwapAnimation | null = null;

  // Cursor influence removed — nodes are unaffected by cursor

  constructor(data: INodeData, options: ISimulationConfigs) {
    super();
    this.options = options;
    this.position.fromArray(data.initialPosition);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.userData = { ...data };
    this.isSun = data.isSun;

    this.attributes = data.attributes
      ? [...Object.values(data.attributes)]
      : Array.from({ length: 10 }, () => Math.floor(Math.random() * 99));

    this.preferences = data.preferences
      ? [...Object.values(data.preferences)]
      : Array.from({ length: 10 }, () => Math.floor(Math.random() * 99));

    // Create glowing core using additive Fresnel-like shader (center-bright)
    const geom = new THREE.SphereGeometry(this.baseSphereRadius, 48, 48);
    const coreMat = makeCoreGlowMaterial(
      this.isSun ? new THREE.Color('#C300FF') : new THREE.Color('#FF3366'),
      this.isSun ? 0.9 : 0.7,
      3.5
    );
    this.mesh = new THREE.Mesh(geom, coreMat);
    this.add(this.mesh);

    // Soft additive rim glow (BackSide Fresnel)
    const haloMat = makeRimGlowMaterial(
      this.isSun ? new THREE.Color('#C300FF') : new THREE.Color('#FF3366'),
      this.isSun ? 0.22 : 0.16,
      0.2,
      2.2
    );
    this.halo = new THREE.Mesh(geom.clone(), haloMat);
    this.halo.scale.setScalar(this.isSun ? 1.8 : 1.35);
    this.add(this.halo);

    // Camera-facing luminous core billboard to ensure visibility from all angles
    this.coreSprite = this.createBillboardGlow(
      this.isSun ? new THREE.Color('#C300FF') : new THREE.Color('#FF3366'),
      this.isSun ? 0.8 : 0.6,
      this.isSun ? 1.8 : 1.3
    );
    this.add(this.coreSprite);

    // Softer, larger halo billboard (always-on rim feel)
    this.halo.visible = false; // hide mesh halo; use sprite version for consistent view
    this.haloSprite = this.createBillboardGlow(
      this.isSun ? new THREE.Color('#C300FF') : new THREE.Color('#FF3366'),
      this.isSun ? 0.25 : 0.18,
      this.isSun ? 3.0 : 2.0
    );
    this.haloSprite.renderOrder = 18;
    this.add(this.haloSprite);
  }

  // (Sprite-based glow removed in favor of additive core + halo meshes)
  private createBillboardGlow(color: THREE.Color, opacity: number, diameterMultiplier: number): THREE.Sprite {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    const diameter = this.baseSphereRadius * 2 * diameterMultiplier;
    sprite.scale.set(diameter, diameter, 1);
    sprite.renderOrder = 20;
    return sprite;
  }

  // (Size helper removed — halo scales relative to mesh directly)

  setSun(state: boolean = !this.isSun, preference?: number): void {
    this.isSun = state;

    if (state) {
      // Switch to neon purple glow-ball
      const core = this.mesh.material as THREE.ShaderMaterial;
      core.uniforms['glowColor'].value = new THREE.Color('#C300FF');
      core.uniforms['opacity'].value = 0.9;
      const halo = this.halo.material as THREE.ShaderMaterial;
      halo.uniforms['glowColor'].value = new THREE.Color('#C300FF');
      halo.uniforms['opacity'].value = 0.22;
      this.halo.scale.setScalar(1.8);
      // Billboard core
      (this.coreSprite.material as THREE.SpriteMaterial).color = new THREE.Color('#C300FF');
      (this.coreSprite.material as THREE.SpriteMaterial).opacity = 0.8;
      const dSun = this.baseSphereRadius * 2 * 1.8;
      this.coreSprite.scale.set(dSun, dSun, 1);
      // Billboard halo
      (this.haloSprite.material as THREE.SpriteMaterial).color = new THREE.Color('#C300FF');
      (this.haloSprite.material as THREE.SpriteMaterial).opacity = 0.25;
      const dSunHalo = this.baseSphereRadius * 2 * 3.0;
      this.haloSprite.scale.set(dSunHalo, dSunHalo, 1);
    } else {
      // Switch to pink-red glow-ball
      const core = this.mesh.material as THREE.ShaderMaterial;
      core.uniforms['glowColor'].value = new THREE.Color('#FF3366');
      core.uniforms['opacity'].value = 0.7;
      const halo = this.halo.material as THREE.ShaderMaterial;
      halo.uniforms['glowColor'].value = new THREE.Color('#FF3366');
      halo.uniforms['opacity'].value = 0.16;
      this.halo.scale.setScalar(1.35);
      // Billboard core
      (this.coreSprite.material as THREE.SpriteMaterial).color = new THREE.Color('#FF3366');
      (this.coreSprite.material as THREE.SpriteMaterial).opacity = 0.6;
      const d = this.baseSphereRadius * 2 * 1.3;
      this.coreSprite.scale.set(d, d, 1);
      // Billboard halo
      (this.haloSprite.material as THREE.SpriteMaterial).color = new THREE.Color('#FF3366');
      (this.haloSprite.material as THREE.SpriteMaterial).opacity = 0.18;
      const dHalo = this.baseSphereRadius * 2 * 2.0;
      this.haloSprite.scale.set(dHalo, dHalo, 1);
    }

    if (preference !== undefined) {
      this.preference = preference;
    }
  }

  calculatePreferredCompatibility(sun: Node): number {
    const sunPreferences = sun.preferences;
    const planetAttributes = this.attributes;
    let diffSum = 0;
    for (let i = 0; i < sunPreferences.length; i++) {
      diffSum += Math.abs(sunPreferences[i] - planetAttributes[i]);
    }
    const maxDiff = sunPreferences.length * 100;
    return 1 - diffSum / maxDiff;
  }

  calculateAttributeCompatibility(other: Node): number {
    const attributesA = this.attributes;
    const attributesB = other.attributes;
    let diffSum = 0;
    for (let i = 0; i < attributesA.length; i++) {
      diffSum += Math.abs(attributesA[i] - attributesB[i]);
    }
    const maxDiff = attributesA.length * 100;
    return 1 - diffSum / maxDiff;
  }

  private calculateSunForce(sun: Node): THREE.Vector3 {
    let force = new THREE.Vector3();
    const compatibility = this.calculatePreferredCompatibility(sun);
    const desiredDistance = 1 + (1 - compatibility) * 3;
    const currentDistance = sun.position.distanceTo(this.position);
    const error = currentDistance - desiredDistance;
    const directionToSun = new THREE.Vector3()
      .subVectors(sun.position, this.position)
      .normalize();

    if (currentDistance < desiredDistance) {
      const repulsionForce =
        -this.options.sun.repulsion *
        (desiredDistance - currentDistance) *
        compatibility;
      force.add(directionToSun.multiplyScalar(repulsionForce));
    } else {
      const attractionForce =
        2 * this.options.sun.attraction * error * compatibility + 0.001;
      force.add(directionToSun.multiplyScalar(attractionForce));
    }

    return force;
  }

  private calculatePlanetAttraction(nodes: Node[]): THREE.Vector3 {
    let attractionForce = new THREE.Vector3();
    const attractionConstant = 0.001;
    nodes.forEach((other) => {
      if (other !== this && !other.isSun) {
        const compatibility = this.calculateAttributeCompatibility(other);
        const forceMagnitude = attractionConstant * compatibility - 0.001;
        const attractionDirection = new THREE.Vector3()
          .subVectors(other.position, this.position)
          .normalize();
        attractionForce.add(attractionDirection.multiplyScalar(forceMagnitude));
      }
    });
    return attractionForce;
  }

  private calculatePlanetRepulsion(nodes: Node[]): THREE.Vector3 {
    let repulsionForce = new THREE.Vector3();
    nodes.forEach((other) => {
      if (other !== this && !other.isSun) {
        const distance = this.position.distanceTo(other.position);
        if (distance < this.options.planet.repulsionInitializationThreshold) {
          const compatibility = this.calculateAttributeCompatibility(other);
          const repulsion =
            this.options.planet.repulsion *
              (this.options.planet.repulsionInitializationThreshold -
                distance) *
              (1 - compatibility) +
            0.001;
          const repulsionDirection = new THREE.Vector3()
            .subVectors(this.position, other.position)
            .normalize();
          repulsionForce.add(repulsionDirection.multiplyScalar(repulsion));
        }
      }
    });
    return repulsionForce;
  }

  update(nodes: Node[], cursorPosition?: THREE.Vector3, scene?: THREE.Scene, camera?: THREE.Camera): void {
    if (this.swap) {
      this.handleSwapAnimation();
      return;
    }
    // Cursor influence intentionally disabled: nodes should not orbit or be pulled by the cursor
    
    // Sun: pulsate core and halo for glowing-ball effect
    if (this.isSun) {
      const t = performance.now() * 0.001; // seconds
      const pulse = 1 + Math.sin(t * 2.0) * 0.06; // subtle pulsation
      const targetScale = this.sunBaseScale * pulse;
      this.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
      const core = this.mesh.material as THREE.ShaderMaterial;
      core.uniforms['opacity'].value = 0.85 + (pulse - 1) * 0.6;
      const haloMat = this.halo.material as THREE.ShaderMaterial;
      haloMat.uniforms['opacity'].value = 0.20 + (pulse - 1) * 0.35;
      const haloScale = 1.8 * (1 + (pulse - 1) * 0.25);
      this.halo.scale.lerp(new THREE.Vector3(haloScale, haloScale, haloScale), 0.2);
      // Billboard pulse
      const baseD = this.baseSphereRadius * 2 * (1.8 * this.mesh.scale.x);
      const d = baseD * (1 + (pulse - 1) * 0.2);
      this.coreSprite.scale.lerp(new THREE.Vector3(d, d, 1), 0.15);
      (this.coreSprite.material as THREE.SpriteMaterial).opacity = 0.75 + (pulse - 1) * 0.2;
      // Halo sprite pulse
      const baseDH = this.baseSphereRadius * 2 * (3.0 * this.mesh.scale.x);
      const dH = baseDH * (1 + (pulse - 1) * 0.2);
      this.haloSprite.scale.lerp(new THREE.Vector3(dH, dH, 1), 0.15);
      (this.haloSprite.material as THREE.SpriteMaterial).opacity = 0.22 + (pulse - 1) * 0.1;
      return;
    }
    let totalForce = new THREE.Vector3();
    const sun = nodes.find((n) => n.isSun);
    if (sun) {
      totalForce.add(this.calculateSunForce(sun));

      // Update planet glow based on compatibility with sun
      const compat = this.calculatePreferredCompatibility(sun); // 0..1
      const core = this.mesh.material as THREE.ShaderMaterial;
      core.uniforms['opacity'].value = 0.55 + compat * 0.4; // brighter core with compatibility
      // Planet additive halo tightly around mesh
      const haloMat = this.halo.material as THREE.ShaderMaterial;
      const baseOpacity = 0.12 + compat * 0.25; // 0.12..0.37
      let proximityBoost = 0;
      if (cursorPosition) {
        const d = this.position.distanceTo(cursorPosition);
        proximityBoost = Math.max(0, 1 - d / 1.5) * 0.04; // very subtle
      }
      haloMat.uniforms['opacity'].value = Math.min(0.5, baseOpacity + proximityBoost);
      const s = 1.35 * (1 + compat * 0.15);
      this.halo.scale.lerp(new THREE.Vector3(s, s, s), 0.25);
      // Billboard tuning for planets
      const coreMat = this.coreSprite.material as THREE.SpriteMaterial;
      coreMat.opacity = 0.45 + compat * 0.35 + proximityBoost * 0.2;
      const d2 = this.baseSphereRadius * 2 * (1.3 + compat * 0.2) * this.mesh.scale.x;
      this.coreSprite.scale.lerp(new THREE.Vector3(d2, d2, 1), 0.2);
      const haloMatS = this.haloSprite.material as THREE.SpriteMaterial;
      haloMatS.opacity = 0.16 + compat * 0.18 + proximityBoost * 0.1;
      const d2h = this.baseSphereRadius * 2 * (2.0 + compat * 0.5) * this.mesh.scale.x;
      this.haloSprite.scale.lerp(new THREE.Vector3(d2h, d2h, 1), 0.2);
    }
    totalForce.add(this.calculatePlanetRepulsion(nodes));
    totalForce.add(this.calculatePlanetAttraction(nodes));
    totalForce.multiplyScalar(this.options.velocityDamping);
    this.applyForces(totalForce);
  }

  private applyForces(force: THREE.Vector3): void {
    this.velocity.add(force);
    if (this.velocity.length() > this.options.maxVelocity) {
      this.velocity.setLength(this.options.maxVelocity);
    }
    this.velocity.multiplyScalar(this.options.velocityDamping);
    this.position.add(this.velocity);
  }

  // All cursor-influence helpers removed; nodes keep normal physics only

  private handleSwapAnimation(): void {
    if (!this.swap) return;
    const currentSwap = this.swap;
    const currentTime = performance.now();
    let progress = (currentTime - currentSwap.startTime) / currentSwap.duration;
    if (progress >= 1) {
      progress = 1;
      this.velocity.set(0, 0, 0);
      this.swap = null;
    }
    this.position.copy(
      currentSwap.start.clone().lerp(currentSwap.end, progress)
    );
  }
}

// --- minimal glow shaders inspired by atmosphere/fresnel effect ---
// Core: front-side, center-bright additive glow
// Halo: back-side, rim glow additive

type GlowUniforms = { glowColor: { value: THREE.Color }; opacity: { value: number }; c?: { value: number }; p?: { value: number } };

function makeCoreGlowMaterial(
  color: THREE.Color,
  opacity = 0.8,
  power = 3.5
): THREE.ShaderMaterial {
  const uniforms: GlowUniforms = {
    glowColor: { value: color },
    opacity: { value: opacity },
    p: { value: power },
  };
  const vertex = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragment = `
    uniform vec3 glowColor;
    uniform float opacity;
    uniform float p;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      // Center-bright: when normal faces camera (dot close to 1)
      float intensity = pow(clamp(dot(vNormal, viewDir), 0.0, 1.0), p);
      gl_FragColor = vec4(glowColor * intensity, intensity * opacity);
    }
  `;
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
}

function makeRimGlowMaterial(
  color: THREE.Color,
  opacity = 0.2,
  c = 0.2,
  power = 2.2
): THREE.ShaderMaterial {
  const uniforms: GlowUniforms = {
    glowColor: { value: color },
    opacity: { value: opacity },
    c: { value: c },
    p: { value: power },
  };
  const vertex = `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragment = `
    uniform vec3 glowColor;
    uniform float opacity;
    uniform float c;
    uniform float p;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float intensity = pow(max(0.0, c - dot(vNormal, viewDir)), p);
      gl_FragColor = vec4(glowColor, intensity * opacity);
    }
  `;
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
}

// Bind helpers to class for typed access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Node.prototype as any).makeCoreGlowMaterial = makeCoreGlowMaterial;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Node.prototype as any).makeRimGlowMaterial = makeRimGlowMaterial;

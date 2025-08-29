import * as THREE from 'three';
import { ISimulationConfigs, INodeData, ISwapAnimation } from '../app.types';
import { NodeTrailSystem } from '../services/node-trails';

export class Node extends THREE.Object3D {
  options: ISimulationConfigs;
  velocity: THREE.Vector3;
  isSun: boolean;
  attributes: number[];
  preferences: number[];
  preference: number = 0;
  mesh: THREE.Mesh;
  private sunBaseScale: number = 3;
  swap: ISwapAnimation | null = null;

  // Cursor influence properties
  isUnderCursorInfluence: boolean = false;
  cursorInfluenceStrength: number = 0;
  originalPhysicsState: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
  } | null = null;
  orbitalAngle: number = 0;
  orbitalRadius: number = 0;
  cursorInfluenceRadius: number = 1.2;
  trailSystem: NodeTrailSystem | null = null;

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

    // Create a sphere mesh for visualization (theme-applied by role)
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 64, 64));
    if (this.isSun) {
      this.mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#C300FF'),
        emissive: new THREE.Color('#8A00B8'),
        emissiveIntensity: 0.5,
        metalness: 0.1,
        roughness: 0.6,
        flatShading: true,
      });
    } else {
      this.mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#FF3366'),
        emissive: new THREE.Color('#B8004A'),
        emissiveIntensity: 0.12,
        metalness: 0.2,
        roughness: 0.7,
        clearcoat: 0.3,
      });
    }
    this.add(this.mesh);
  }

  setSun(state: boolean = !this.isSun, preference?: number): void {
    this.isSun = state;

    // Build a neomorphic‑style neon purple material
    if (state) {
      this.mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#C300FF'), // Neon purple primary
        emissive: new THREE.Color('#8A00B8'), // Darker purple for the "glow" or highlight  
        emissiveIntensity: 0.4, // Increased glow for more dramatic effect
        metalness: 0.1, // Low metalness for soft, diffused light
        roughness: 0.7, // Slightly lower roughness for more glow
        flatShading: true, // Gives the surface a more 'flat' look which is common in neumorphism
      });
      // Apply a slight inset shadow effect by modifying the emissive and ambient lighting
      this.mesh.material.side = THREE.DoubleSide;
      this.mesh.material.shadowSide = THREE.FrontSide;
      this.mesh.material.opacity = 1;
    } else {
      // fallback "planet" look with new theme colors
      this.mesh.material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#FF3366'), // Pink-red from new theme
        emissive: new THREE.Color('#B8004A'), // Darker pink-red for subtle glow
        emissiveIntensity: 0.1, // Subtle glow for planets
        metalness: 0.2, // Slightly more metallic for contrast
        roughness: 0.7, // Slightly smoother than sun
        clearcoat: 0.3, // Add some clearcoat for depth
      });
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
    
    // Check cursor influence first
    if (cursorPosition && camera) {
      this.updateCursorInfluence(cursorPosition, scene, camera);
    }
    
    // If under strong cursor influence, use orbital physics instead of normal physics
    if (this.isUnderCursorInfluence && cursorPosition) {
      this.updateOrbitalPhysics(cursorPosition);
      return;
    }
    
    // Sun: pulsate scale and glow for dramatic lighting
    if (this.isSun) {
      const t = performance.now() * 0.001; // seconds
      const pulse = 1 + Math.sin(t * 2.0) * 0.06; // subtle pulsation
      const targetScale = this.sunBaseScale * pulse;
      this.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
      const mat = this.mesh.material as THREE.MeshPhysicalMaterial;
      mat.emissiveIntensity = 0.5 + (pulse - 1) * 2.0; // 0.38..0.62 approx
      return;
    }
    let totalForce = new THREE.Vector3();
    const sun = nodes.find((n) => n.isSun);
    if (sun) {
      totalForce.add(this.calculateSunForce(sun));

      // Update planet glow based on compatibility with sun
      const compat = this.calculatePreferredCompatibility(sun); // 0..1
      const mat = this.mesh.material as THREE.MeshPhysicalMaterial;
      // Remap to subtle glow range for neomorphic aesthetic
      mat.emissiveIntensity = 0.08 + compat * 0.5; // 0.08 .. 0.58
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

  private updateCursorInfluence(cursorPosition: THREE.Vector3, scene?: THREE.Scene, camera?: THREE.Camera): void {
    // Use cylindrical influence - project both positions to camera's view plane for 2D distance
    const distanceToCursor = this.calculateCylindricalDistance(cursorPosition, camera);
    const wasUnderInfluence = this.isUnderCursorInfluence;
    
    if (distanceToCursor <= this.cursorInfluenceRadius) {
      // Calculate influence strength (1.0 = full influence, 0.0 = no influence)
      this.cursorInfluenceStrength = 1.0 - (distanceToCursor / this.cursorInfluenceRadius);
      this.isUnderCursorInfluence = this.cursorInfluenceStrength > 0.5; // Stricter threshold for orbital capture
      
      // Store original physics state when first entering influence
      if (!wasUnderInfluence && this.isUnderCursorInfluence) {
        this.originalPhysicsState = {
          position: this.position.clone(),
          velocity: this.velocity.clone()
        };
        
        // Calculate initial orbital parameters
        const directionToCursor = new THREE.Vector3().subVectors(cursorPosition, this.position);
        this.orbitalRadius = Math.max(0.5, distanceToCursor * 0.4); // Tighter orbital radius
        this.orbitalAngle = Math.atan2(directionToCursor.z, directionToCursor.x);
        
        // Initialize trail system when starting orbit
        if (scene) {
          this.initializeTrailSystem(scene);
        }
      }
    } else {
      // Quickly reduce influence when moving away
      this.cursorInfluenceStrength = Math.max(0, this.cursorInfluenceStrength - 0.2);
      this.isUnderCursorInfluence = this.cursorInfluenceStrength > 0.2; // Stricter release threshold
      
      // Clear original state when fully released
      if (!this.isUnderCursorInfluence) {
        this.originalPhysicsState = null;
        // Clear trail when node is no longer under influence
        if (this.trailSystem) {
          this.trailSystem.clear();
        }
      }
    }
  }

  private updateOrbitalPhysics(cursorPosition: THREE.Vector3): void {
    // Enhanced orbital speed for tighter, more responsive orbits
    const orbitalSpeed = 0.03 + (1.0 / (this.orbitalRadius + 0.5)) * 0.05;
    
    // Update orbital angle
    this.orbitalAngle += orbitalSpeed * this.cursorInfluenceStrength;
    
    // Calculate new orbital position relative to cursor
    const orbitalOffset = new THREE.Vector3(
      Math.cos(this.orbitalAngle) * this.orbitalRadius,
      Math.sin(this.orbitalAngle * 0.7) * this.orbitalRadius * 0.3, // Slight vertical movement
      Math.sin(this.orbitalAngle) * this.orbitalRadius
    );
    
    // Target position is cursor position + orbital offset
    const targetPosition = new THREE.Vector3().addVectors(cursorPosition, orbitalOffset);
    
    // Smooth interpolation to target position
    this.position.lerp(targetPosition, 0.1 * this.cursorInfluenceStrength);
    
    // Set velocity for smooth motion
    this.velocity.subVectors(targetPosition, this.position).multiplyScalar(0.1);
    
    // Update trail system for orbital motion
    if (this.trailSystem) {
      this.trailSystem.addTrailPoint(this.position);
    }
  }

  initializeTrailSystem(scene: THREE.Scene): void {
    if (!this.trailSystem) {
      const nodeColor = (this.mesh.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial).color;
      this.trailSystem = new NodeTrailSystem(scene, nodeColor);
    }
  }

  clearTrailSystem(): void {
    if (this.trailSystem) {
      this.trailSystem.clear();
      this.trailSystem = null;
    }
  }

  private calculateCylindricalDistance(cursorPosition: THREE.Vector3, camera?: THREE.Camera): number {
    if (!camera) {
      // Fallback to regular 3D distance if no camera provided
      return this.position.distanceTo(cursorPosition);
    }
    
    // Get camera's viewing direction (forward vector)
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    
    // Project both positions onto a plane perpendicular to the camera's view direction
    // This creates a cylindrical influence zone extending through depth
    const nodeProjected = this.projectToViewPlane(this.position, camera);
    const cursorProjected = this.projectToViewPlane(cursorPosition, camera);
    
    // Calculate 2D distance in the projected plane
    return nodeProjected.distanceTo(cursorProjected);
  }

  private projectToViewPlane(position: THREE.Vector3, camera: THREE.Camera): THREE.Vector3 {
    // Get camera position and forward direction
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    
    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    
    // Calculate the distance from camera to the position along the view direction
    const toPosition = new THREE.Vector3().subVectors(position, cameraPosition);
    const distanceAlongView = toPosition.dot(cameraForward);
    
    // Project the position onto the view plane by removing the depth component
    const projectedOffset = new THREE.Vector3().copy(cameraForward).multiplyScalar(distanceAlongView);
    const projectedPosition = new THREE.Vector3().subVectors(toPosition, projectedOffset).add(cameraPosition);
    
    return projectedPosition;
  }

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

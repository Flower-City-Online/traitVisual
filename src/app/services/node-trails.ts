import * as THREE from 'three';

export interface TrailPoint {
  position: THREE.Vector3;
  timestamp: number;
}

export class NodeTrailSystem {
  private trailMesh: THREE.Line | null = null;
  private trailPoints: TrailPoint[] = [];
  private maxTrailPoints: number = 12;
  private trailDuration: number = 1000; // ms
  private scene: THREE.Scene;
  private nodeColor: THREE.Color;

  constructor(scene: THREE.Scene, nodeColor: THREE.Color) {
    this.scene = scene;
    this.nodeColor = nodeColor;
  }

  addTrailPoint(position: THREE.Vector3): void {
    const currentTime = performance.now();
    
    // Add new point
    this.trailPoints.push({
      position: position.clone(),
      timestamp: currentTime
    });

    // Remove old points
    this.trailPoints = this.trailPoints.filter(point => 
      currentTime - point.timestamp < this.trailDuration
    );

    // Limit number of points
    if (this.trailPoints.length > this.maxTrailPoints) {
      this.trailPoints = this.trailPoints.slice(-this.maxTrailPoints);
    }

    this.updateTrailMesh();
  }

  private updateTrailMesh(): void {
    // Remove old trail mesh
    if (this.trailMesh) {
      this.scene.remove(this.trailMesh);
      this.trailMesh.geometry.dispose();
      (this.trailMesh.material as THREE.Material).dispose();
    }

    if (this.trailPoints.length < 2) {
      this.trailMesh = null;
      return;
    }

    // Create spline through trail points
    const splinePoints = this.trailPoints.map(point => point.position);
    const spline = new THREE.CatmullRomCurve3(splinePoints);
    
    // Generate smooth curve points
    const curvePoints = spline.getPoints(Math.max(20, this.trailPoints.length * 3));
    
    // Create geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
    
    // Create opacity array for gradient effect
    const opacities = new Float32Array(curvePoints.length);
    for (let i = 0; i < curvePoints.length; i++) {
      const progress = i / (curvePoints.length - 1);
      opacities[i] = progress * 0.8; // Fade from 0 to 0.8 opacity
    }
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    // Create material with custom shader for gradient opacity
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float opacity;
        varying float vOpacity;
        
        void main() {
          vOpacity = opacity;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vOpacity;
        
        void main() {
          gl_FragColor = vec4(color, vOpacity);
        }
      `,
      uniforms: {
        color: { value: this.nodeColor }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Create trail mesh
    this.trailMesh = new THREE.Line(geometry, material);
    this.scene.add(this.trailMesh);
  }

  clear(): void {
    this.trailPoints = [];
    if (this.trailMesh) {
      this.scene.remove(this.trailMesh);
      this.trailMesh.geometry.dispose();
      (this.trailMesh.material as THREE.Material).dispose();
      this.trailMesh = null;
    }
  }

  dispose(): void {
    this.clear();
  }
}
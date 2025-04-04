import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  ElementRef,
  OnInit,
  AfterViewInit,
  ViewChild,
  Renderer2,
  NgZone,
  HostListener,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { nodeData } from './data/nodes.data';
import {
  ISimulationConfigs,
  INodeData,
  ISwapAnimation,
  IHumanAttributes,
} from './app.types';

class Cluster extends THREE.Object3D {
  options: ISimulationConfigs;
  nodes: Node[];

  constructor(nodeData: INodeData[], options?: Partial<ISimulationConfigs>) {
    super();
    this.options = {
      sun: {
        attraction: 1,
        repulsion: 1,
        repulsionInitializationThreshold: 0.8,
      },
      planet: {
        attraction: 1,
        repulsion: 1,
        repulsionInitializationThreshold: 0.4,
      },
      maxVelocity: 0.02,
      velocityDamping: 0.8,
      minAttributeValue: 0,
      minPreferenceValue: 0,
      maxAttributeValue: 100,
      maxPreferenceValue: 100,
      ...options,
    };
    this.nodes = [];
    this.setUp(nodeData);
  }

  setUp(nodeData: INodeData[]): void {
    nodeData.forEach((data) => {
      const node = new Node(data, this.options);
      this.nodes.push(node);
      this.add(node);
    });
  }

  update(): void {
    this.nodes.forEach((node) => node.update(this.nodes));
  }
}

class Node extends THREE.Object3D {
  options: ISimulationConfigs;
  velocity: THREE.Vector3;
  isSun: boolean;
  attributes: number[];
  preferences: number[];
  preference: number = 0;
  mesh: THREE.Mesh;
  swap: ISwapAnimation | null = null;

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

    // Create a sphere mesh for visualization
    const sphereColor = new THREE.Color(data.color);
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 64, 64),
      new THREE.MeshStandardMaterial({
        color: sphereColor,
        metalness: 0.5,
        roughness: 0.3,
      })
    );
    this.add(this.mesh);
  }

  setSun(state: boolean = !this.isSun, preference?: number): void {
    this.isSun = state;
    // Use isSun to determine color: red for sun, green for planet.
    (this.mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(
      state ? 'red' : 'green'
    );
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
        2 * this.options.sun.attraction * error * compatibility + 0.018;
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
        const forceMagnitude = attractionConstant * compatibility - 0.0014;
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
            0.0001;
          const repulsionDirection = new THREE.Vector3()
            .subVectors(this.position, other.position)
            .normalize();
          repulsionForce.add(repulsionDirection.multiplyScalar(repulsion));
        }
      }
    });
    return repulsionForce;
  }

  update(nodes: Node[]): void {
    if (this.swap) {
      this.handleSwapAnimation();
      return;
    }
    if (this.isSun) return;
    let totalForce = new THREE.Vector3();
    const sun = nodes.find((n) => n.isSun);
    if (sun) {
      totalForce.add(this.calculateSunForce(sun));
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('rendererCanvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('tooltip', { static: true }) tooltipRef!: ElementRef;
  @ViewChild('dropdown', { static: true }) dropdownRef!: ElementRef;
  @ViewChild('attrDropdown', { static: true }) attrDropdownRef!: ElementRef;
  @ViewChild('contextMenu', { static: true }) contextMenuRef!: ElementRef;

  public increaseNodes: boolean = false;
  public originalNodeData: INodeData[] = nodeData;
  private smokeTexture!: THREE.Texture;
  private smokeParticles!: THREE.Points;
  private smokeParticleCount = 150; // Adjust density
  hiddenNodes: Node[] = [];

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  mouse: THREE.Vector2 = new THREE.Vector2();
  cluster!: Cluster;
  tooltipVisible = false;
  selectedAttrNode: Node | null = null;
  selectedNode: Node | null = null;
  draggingNode: Node | null = null;
  dragPlane: THREE.Plane = new THREE.Plane();
  dragOffset: THREE.Vector3 = new THREE.Vector3();
  newNodeCounter: number = 1;
  cursorSphere!: THREE.Mesh;

  constructor(private renderer2: Renderer2, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.initScene();
    this.loadNodes();
  }

  ngAfterViewInit(): void {
    this.animate();

    this.renderer2.listen(
      this.canvasRef.nativeElement,
      'contextmenu',
      (event: MouseEvent) => this.onRightClick(event)
    );

    this.renderer2.listen('window', 'mousemove', (event: MouseEvent) =>
      this.onMouseMove(event)
    );
    window.addEventListener('resize', () => this.onWindowResize());

    const canvas = this.canvasRef.nativeElement;
    this.renderer2.listen(canvas, 'mousedown', (event: MouseEvent) =>
      this.onDragStart(event)
    );
    this.renderer2.listen(canvas, 'mousemove', (event: MouseEvent) =>
      this.onDragMove(event)
    );
    this.renderer2.listen(canvas, 'mouseup', (event: MouseEvent) =>
      this.onDragEnd(event)
    );
    this.renderer2.listen(canvas, 'mouseleave', (event: MouseEvent) =>
      this.onDragEnd(event)
    );
  }

  get editableNode(): Node | null {
    if (this.selectedAttrNode) return this.selectedAttrNode;
    const nonSuns = this.cluster
      ? this.cluster.nodes.filter((n) => !n.isSun)
      : [];
    return nonSuns.length ? nonSuns[0] : this.currentCentral;
  }

  get currentCentral(): Node | null {
    if (!this.cluster) return null;
    return this.cluster.nodes.find((node) => node.isSun) || null;
  }

  get nonSuns(): Node[] {
    if (!this.cluster) return [];
    return this.cluster.nodes.filter((node) => !node.isSun);
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(-1, -1, -1);
    this.scene.add(pointLight);

    // Load smoke texture
    const textureLoader = new THREE.TextureLoader();
    this.smokeTexture = this.createSmokeTexture();

    // Initialize smoke (but don't add to scene yet)
    this.initSmokeEffect();

    // <-- NEW: Create and add the cursor sphere
    this.cursorSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 1.0, // Fully metallic for mirror effect
        roughness: 0.0, // Smooth surface for clear reflections
        transmission: 0.9, // Glass-like transparency
        transparent: true,
        opacity: 0.8, // Slightly see-through
        clearcoat: 1.0,
        clearcoatRoughness: 0.0,
        ior: 1.5, // Index of refraction (glass is ~1.5)
        envMapIntensity: 1.0, // Strong environment reflections
      })
    );
    this.scene.add(this.cursorSphere);
    this.cursorSphere.add(this.smokeParticles);
  }

  private createSmokeTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const centerX = size / 2;
    const centerY = size / 2;
    const innerRadius = size * 0.05; // ~6.4 px
    const outerRadius = size * 0.06; // ~7.7 px

    // Base ring shape
    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      innerRadius,
      centerX,
      centerY,
      outerRadius
    );
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Add random turbulence
    const imageData = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const alpha = imageData.data[i + 3];
      if (alpha > 0) {
        const noise = Math.random() * 0.3;
        imageData.data[i + 3] = Math.min(255, alpha * (0.8 + noise));
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initSmokeEffect(): void {
    this.smokeTexture = this.createSmokeTexture(); // Instead of loading from URL
    const smokeGeometry = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(this.smokeParticleCount * 3);
    const smokeScales = new Float32Array(this.smokeParticleCount);

    // Initialize particle positions around origin (will follow cursor sphere)
    for (let i = 0; i < this.smokeParticleCount; i++) {
      const radius = 0.25 + Math.random() * 0.15; // Tight radius around sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      smokePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      smokePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      smokePositions[i * 3 + 2] = radius * Math.cos(phi);

      smokeScales[i] = 0.1 + Math.random() * 0.15; // Small, subtle particles
    }

    smokeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(smokePositions, 3)
    );
    smokeGeometry.setAttribute(
      'scale',
      new THREE.BufferAttribute(smokeScales, 1)
    );

    const smokeMaterial = new THREE.PointsMaterial({
      map: this.smokeTexture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      size: 0.2,
      sizeAttenuation: true,
      color: 0xaaaaaa, // Soft gray smoke
    });

    this.smokeParticles = new THREE.Points(smokeGeometry, smokeMaterial);
  }

  private loadNodes(): void {
    this.cluster = new Cluster(nodeData);
    this.scene.add(this.cluster);
    const initialCentral =
      this.cluster.nodes.find((node) => node.isSun) || this.cluster.nodes[0];
    initialCentral.setSun(true, 5);
    initialCentral.mesh.scale.set(2, 2, 2);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onRightClick(event: MouseEvent): void {
    event.preventDefault();
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.cluster.children,
      true
    );
    if (intersects.length > 0) {
      this.selectedNode = intersects[0].object.parent as Node;
      const nodeName = this.selectedNode.userData['name'] || 'Node';
      const menuElement = this.contextMenuRef.nativeElement;
      menuElement.style.display = 'block';
      menuElement.style.left = `${event.clientX}px`;
      menuElement.style.top = `${event.clientY}px`;
      menuElement.querySelector('#contextNodeName').textContent = nodeName;
      this.renderer2.listen('document', 'click', () => {
        menuElement.style.display = 'none';
      });
    }
  }

  onSetAsSun(): void {
    if (!this.selectedNode || !this.cluster) return;
    const newCentral = this.selectedNode;
    const oldCentral = this.cluster.nodes.find((node) => node.isSun);
    if (!newCentral || !oldCentral || newCentral === oldCentral) return;
    const newPosition = newCentral.position.clone();
    const oldPosition = oldCentral.position.clone();
    newCentral.swap = {
      start: newPosition,
      end: new THREE.Vector3(0, 0, 0),
      startTime: performance.now(),
      duration: 5000,
    };
    oldCentral.swap = {
      start: oldPosition,
      end: newPosition,
      startTime: performance.now(),
      duration: 5000,
    };
    oldCentral.setSun(false);
    newCentral.setSun(true, 5);
    oldCentral.mesh.scale.set(1, 1, 1);
    newCentral.mesh.scale.set(3, 3, 3);
    this.contextMenuRef.nativeElement.style.display = 'none';
  }

  onAddNode(): void {
    if (!this.cluster) return;
    const newId = Date.now();
    const newName = `New-Node-[${this.newNodeCounter++}]`;
    const randomPosition: [number, number, number] = [
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
    ];
    function randomAttributes(): IHumanAttributes {
      return {
        attrOne: Math.floor(Math.random() * 100),
        attrTwo: Math.floor(Math.random() * 100),
        attrThree: Math.floor(Math.random() * 100),
      };
    }
    function randomPreferences(): IHumanAttributes {
      return {
        attrOne: Math.floor(Math.random() * 100),
        attrTwo: Math.floor(Math.random() * 100),
        attrThree: Math.floor(Math.random() * 100),
      };
    }
    function generateRandomColor(): string {
      let color: string;
      do {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        color = `#${r.toString(16).padStart(2, '0')}${g
          .toString(16)
          .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      } while (isColorInForbiddenRange(color));
      return color;
    }
    function isColorInForbiddenRange(color: string): boolean {
      const r = parseInt(color.substring(1, 3), 16);
      return r >= 153 && r <= 255;
    }
    const newColor = generateRandomColor();
    console.log(newColor);
    const newNodeData: INodeData = {
      id: newId,
      name: newName,
      color: generateRandomColor(),
      isSun: false,
      initialPosition: randomPosition,
      attributes: randomAttributes(),
      preferences: randomPreferences(),
    };
    const newNode = new Node(newNodeData, this.cluster.options);
    this.cluster.nodes.push(newNode);
    this.cluster.add(newNode);
  }

  // Add this function
  private updateCursorSpherePosition(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(planeZ, intersection)) {
      this.cursorSphere.position.copy(intersection);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.draggingNode) return;
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.tooltipRef.nativeElement.style.left = event.clientX + 10 + 'px';
    this.tooltipRef.nativeElement.style.top = event.clientY + 10 + 'px';
  }

  private onDragStart(event: MouseEvent): void {
    event.preventDefault();
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.cluster.children,
      true
    );
    if (intersects.length > 0) {
      this.draggingNode = intersects[0].object.parent as Node;
      this.controls.enabled = false;
      const planeNormal = this.camera
        .getWorldDirection(new THREE.Vector3())
        .clone()
        .negate();
      this.dragPlane.setFromNormalAndCoplanarPoint(
        planeNormal,
        intersects[0].point
      );
      this.dragOffset.copy(intersects[0].point).sub(this.draggingNode.position);
    }
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.draggingNode) return;
    event.preventDefault();
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      this.draggingNode.position.copy(intersection.sub(this.dragOffset));
    }
  }

  private onDragEnd(event: MouseEvent): void {
    if (!this.draggingNode) return;
    event.preventDefault();
    this.draggingNode = null;
    this.controls.enabled = true;
  }

  onAttrDropdownChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value;
    if (!this.cluster) return;
    const node = this.cluster.nodes.find(
      (node) => node.userData['id'].toString() === selectedId
    );
    this.selectedAttrNode = node || null;
  }

  onAttributeChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newValue = Number(input.value);
    if (this.editableNode) {
      this.editableNode.attributes[index] = newValue;
      this.editableNode.velocity.add(new THREE.Vector3(0.02, 0.02, 0.02));
      const scaleFactor = 1 + this.editableNode.attributes[0] / 100;
      this.editableNode.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  }

  onPreferenceChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newValue = Number(input.value);
    if (this.currentCentral) {
      this.currentCentral.preferences[index] = newValue;
      this.currentCentral.velocity.add(new THREE.Vector3(0.02, 0.02, 0.02));
    }
  }

  onNodesToggle(event: Event): void {
    let newNodeData: INodeData[];
    if (this.increaseNodes) {
      newNodeData = [
        ...this.originalNodeData,
        ...this.originalNodeData.map((node, index) => ({
          ...node,
          id: node.id + this.originalNodeData.length,
          name: node.name + ' copy',
          initialPosition: [
            node.initialPosition[0] + Math.random() * 5,
            node.initialPosition[1] + Math.random() * 5,
            node.initialPosition[2] + Math.random() * 5,
          ] as [number, number, number],
        })),
      ];
    } else {
      newNodeData = this.originalNodeData;
    }
    if (this.cluster) {
      this.scene.remove(this.cluster);
    }
    this.cluster = new Cluster(newNodeData);
    this.scene.add(this.cluster);
    const newCentral =
      this.cluster.nodes.find((node) => node.isSun) || this.cluster.nodes[0];
    newCentral.setSun(true, 5);
    newCentral.mesh.scale.set(2, 2, 2);
    this.selectedAttrNode = null;
  }

  onHideNode(): void {
    if (!this.selectedNode || this.selectedNode.isSun) return;
    this.cluster.remove(this.selectedNode);
    const index = this.cluster.nodes.indexOf(this.selectedNode);
    if (index > -1) {
      this.cluster.nodes.splice(index, 1);
    }
    this.hiddenNodes.push(this.selectedNode);
    this.contextMenuRef.nativeElement.style.display = 'none';
  }

  private animate(): void {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        requestAnimationFrame(loop);

        // Existing updates
        this.controls.update();
        if (this.cluster) this.cluster.update();
        this.updateCursorSpherePosition();

        // Animate smoke particles (if they exist)
        if (this.smokeParticles) {
          const positions =
            this.smokeParticles.geometry.attributes['position'].array;
          for (let i = 0; i < this.smokeParticleCount; i++) {
            // Gentle upward drift + slight randomness
            positions[i * 3 + 1] += 0.003 + Math.random() * 0.002;
            positions[i * 3] += (Math.random() - 0.5) * 0.001;

            // Reset particles that drift too far
            if (positions[i * 3 + 1] > 0.3) {
              positions[i * 3 + 1] = -0.3;
            }
          }
          this.smokeParticles.geometry.attributes['position'].needsUpdate =
            true;
        }

        this.renderer.render(this.scene, this.camera);
      };
      loop();
    });
  }
}

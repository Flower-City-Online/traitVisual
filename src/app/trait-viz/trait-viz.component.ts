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
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { nodeData } from './trait-viz.data';
import {
  ISimulationConfigs,
  INodeData,
  ISwapAnimation,
} from './trait-viz.types';

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
      new THREE.SphereGeometry(0.1, 64, 64),
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

  /**
   * Computes the compatibility between the sun’s preferences and this planet’s attributes.
   * Returns a value between 0 (completely incompatible) and 1 (perfect match).
   */
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

  /**
   * Computes the compatibility between this planet and another planet based on their attributes.
   * Returns a value between 0 (incompatible) and 1 (perfect match).
   */
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

  update(nodes: Node[]): void {
    if (this.swap) {
      this.handleSwapAnimation();
      return;
    }

    if (this.isSun) return;

    let totalForce = new THREE.Vector3();

    // Get Sun (Central Node)
    const sun = nodes.find((n) => n.isSun);
    if (sun) {
      totalForce.add(this.calculateSunForce(sun));
    }

    // Calculate Repulsion from Other Planets
    totalForce.add(this.calculatePlanetRepulsion(nodes));

    // Calculate a small Attraction Force from Other Planets
    totalForce.add(this.calculatePlanetAttraction(nodes));

    // Update velocity and position
    this.applyForces(totalForce);
  }

  // Handles attraction and repulsion between the sun and planets.
  private calculateSunForce(sun: Node): THREE.Vector3 {
    let force = new THREE.Vector3();
    const compatibility = this.calculatePreferredCompatibility(sun);

    // Updated desired distance: maps compatibility [0,1] to distance [3,1]
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

  // Inside the Node class
  private calculatePlanetAttraction(nodes: Node[]): THREE.Vector3 {
    let attractionForce = new THREE.Vector3();
    const attractionConstant = 0.001; // Change this to 0.0001 if desired

    nodes.forEach((other) => {
      if (other !== this && !other.isSun) {
        const compatibility = this.calculateAttributeCompatibility(other);
        // Force magnitude proportional to compatibility.
        const forceMagnitude = attractionConstant * compatibility - 0.0014;
        // Direction from this planet to the other planet.
        const attractionDirection = new THREE.Vector3()
          .subVectors(other.position, this.position)
          .normalize();
        attractionForce.add(attractionDirection.multiplyScalar(forceMagnitude));
      }
    });

    return attractionForce;
  }

  // Handles repulsion between planets based on attribute similarity.
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

  // Applies forces, updates velocity and position.
  private applyForces(force: THREE.Vector3): void {
    this.velocity.add(force);
    if (this.velocity.length() > this.options.maxVelocity) {
      this.velocity.setLength(this.options.maxVelocity);
    }
    this.velocity.multiplyScalar(this.options.velocityDamping);
    this.position.add(this.velocity);

    // this.position.x = Math.max(-5, Math.min(5, this.position.x));
    // this.position.y = Math.max(-5, Math.min(5, this.position.y));
    // this.position.z = Math.max(-5, Math.min(5, this.position.z));
  }

  // Handles swap animation if active
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
  selector: 'app-trait-viz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trait-viz.component.html',
  styleUrls: ['./trait-viz.component.scss'],
})
export class TraitVizComponent implements OnInit, AfterViewInit {
  @ViewChild('rendererCanvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('tooltip', { static: true }) tooltipRef!: ElementRef;
  @ViewChild('dropdown', { static: true }) dropdownRef!: ElementRef;
  @ViewChild('attrDropdown', { static: true }) attrDropdownRef!: ElementRef;
  @ViewChild('contextMenu', { static: true }) contextMenuRef!: ElementRef;

  public increaseNodes: boolean = false;
  public originalNodeData: INodeData[] = nodeData;
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
    // If a non-sun node has been selected, use it.
    if (this.selectedAttrNode) return this.selectedAttrNode;
    // Otherwise, choose the first non-sun node, if available.
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
    this.camera.position.z = 8;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);
  }

  private loadNodes(): void {
    this.cluster = new Cluster(nodeData);
    this.scene.add(this.cluster);
    const initialCentral =
      this.cluster.nodes.find((node) => node.isSun) || this.cluster.nodes[0];
    initialCentral.setSun(true, 5);
    initialCentral.mesh.scale.set(2, 2, 2);
  }

  private animate(): void {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        requestAnimationFrame(loop);
        this.controls.update();
        if (this.cluster) this.cluster.update();
        this.renderer.render(this.scene, this.camera);
      };
      loop();
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onRightClick(event: MouseEvent): void {
    event.preventDefault(); // Prevent the default browser menu

    // Convert mouse position to Three.js coordinates
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

      // Position and display the context menu
      const menuElement = this.contextMenuRef.nativeElement;
      menuElement.style.display = 'block';
      menuElement.style.left = `${event.clientX}px`;
      menuElement.style.top = `${event.clientY}px`;

      // Update menu content
      menuElement.querySelector('#contextNodeName').textContent = nodeName;

      // Hide menu when clicking elsewhere
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
    newCentral.mesh.scale.set(2, 2, 2);

    this.contextMenuRef.nativeElement.style.display = 'none';
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.draggingNode) return;

    // Update mouse coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the position of the tooltip based on the mouse coordinates
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

      // Example: Update the scale based on attribute 1 (normalize to a suitable range)
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
  
}

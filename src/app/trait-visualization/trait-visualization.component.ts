import { CommonModule } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { nodeData } from './node-data';
import { INodeData, IHumanAttributes } from './node-data';

interface ClusterOptions {
  kAttraction: number;
  kRepulsion: number;
  dampingFactor: number;
  minDistance: number;
  stopDistance: number;
  maxAttrValue: number;
}

interface SwapAnimation {
  start: THREE.Vector3;
  end: THREE.Vector3;
  startTime: number;
  duration: number;
}

class Node extends THREE.Object3D {
  options: ClusterOptions;
  attributes: number[];
  velocity: THREE.Vector3;
  preference: number = 0;
  isCentralNode: boolean;
  mesh: THREE.Mesh;
  swap: SwapAnimation | null = null;

  constructor(data: INodeData, options: ClusterOptions) {
    super();
    this.options = options;
    this.position.fromArray(data.position);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.userData = { ...data };
    this.isCentralNode = data.isCentral;

    this.attributes = data.attributes
      ? Object.values(data.attributes)
      : Array.from({ length: 10 }, () => Math.floor(Math.random() * 99));

    // Use the provided color from NODE_DATA
    const sphereColor = new THREE.Color(data.color);
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({
        color: sphereColor,
        metalness: 0.5,
        roughness: 0.3,
      })
    );
    this.add(this.mesh);
  }

  setCentralNode(
    state: boolean = !this.isCentralNode,
    preference?: number
  ): void {
    this.isCentralNode = state;
    // Force red for central; otherwise, use green as a fallback.
    (this.mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(
      state ? 'red' : 'green'
    );
    if (preference !== undefined) {
      this.preference = preference;
    }
  }

  // Calculates compatibility with a given central node based on attributes.
  calculateCompatibility(centralNode: Node): number {
    if (!centralNode.attributes || !this.attributes) return 0;

    const weights: Record<keyof IHumanAttributes, number> = {
      intelligence: 1,
      empathy: 1,
      creativity: 1,
      sociability: 1,
      resilience: 1,
      curiosity: 1,
      adaptability: 1,
      motivation: 1,
      integrity: 1,
      leadership: 1,
    };

    let sumDiff = 0;
    let maxDiff = 0;

    const attributeKeys: (keyof IHumanAttributes)[] = [
      'intelligence',
      'empathy',
      'creativity',
      'sociability',
      'resilience',
      'curiosity',
      'adaptability',
      'motivation',
      'integrity',
      'leadership',
    ];

    for (let i = 0; i < attributeKeys.length; i++) {
      const key = attributeKeys[i];
      const diff = Math.abs(this.attributes[i] - centralNode.attributes[i]);
      sumDiff += diff * weights[key];
      maxDiff += 100 * weights[key]; // assuming attributes are on a 0-100 scale
    }

    const compatibility = 1 - sumDiff / maxDiff;
    return Math.max(0, Math.min(1, compatibility));
  }

  calculateAttractionForce(centralNode: Node): THREE.Vector3 {
    const compatibility = this.calculateCompatibility(centralNode);
    const displacement = new THREE.Vector3().subVectors(
      centralNode.position,
      this.position
    );
    const distance = displacement.length();
    const forceMagnitude =
      (this.options.kAttraction * compatibility) / (distance + 10);
    return displacement.normalize().multiplyScalar(forceMagnitude);
  }

  calculateRepulsionForce(otherNode: Node): THREE.Vector3 {
    const displacement = new THREE.Vector3().subVectors(
      otherNode.position,
      this.position
    );
    const distance = this.position.distanceTo(otherNode.position);
    if (distance < this.options.minDistance) {
      // Fallback force if too close.
      return new THREE.Vector3(0, 1, 0.1);
    }
    const similarity = this.calculateCompatibility(otherNode);
    const forceMagnitude =
      (-this.options.kRepulsion * (1 - similarity)) / (distance * distance);
    return displacement.normalize().multiplyScalar(forceMagnitude);
  }

  update(nodes: Node[]): void {
    // Handle swap animation if active
    if (this.swap) {
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
      return;
    }
  
    // Skip update for central node
    if (this.isCentralNode) return;
  
    let force = new THREE.Vector3(0, 0, 0);
    const centralNode = nodes.find((n) => n.isCentralNode);
    if (centralNode) {
      force.add(this.calculateAttractionForce(centralNode));
    }
  
    // Add repulsion forces from other non-central nodes.
    nodes.forEach((other) => {
      if (other !== this && !other.isCentralNode) {
        force.add(this.calculateRepulsionForce(other));
      }
    });
  
    this.velocity.add(force);
    const maxSpeed = 0.1;
    if (this.velocity.length() > maxSpeed) {
      this.velocity.setLength(maxSpeed);
    }
    // Apply damping to the velocity
    this.velocity.multiplyScalar(this.options.dampingFactor);
  
    // Predict next position
    const predictedPos = this.position.clone().add(this.velocity);
  
    // Define boundaries (adjust these values to suit your needs)
    const boundaryMin = new THREE.Vector3(-20, -20, -20);
    const boundaryMax = new THREE.Vector3(20, 20, 20);
  
    // Clamp predicted position within boundaries
    predictedPos.x = THREE.MathUtils.clamp(predictedPos.x, boundaryMin.x, boundaryMax.x);
    predictedPos.y = THREE.MathUtils.clamp(predictedPos.y, boundaryMin.y, boundaryMax.y);
    predictedPos.z = THREE.MathUtils.clamp(predictedPos.z, boundaryMin.z, boundaryMax.z);
  
    // Optional: If you want the sphere to bounce off the boundary instead of stopping, 
    // you could reflect the velocity here.
  
    // Check for collisions (if necessary) and update position
    let tooClose = false;
    nodes.forEach((other) => {
      if (
        other !== this &&
        predictedPos.distanceTo(other.position) < this.options.stopDistance
      ) {
        tooClose = true;
      }
    });
    if (!tooClose) {
      this.position.copy(predictedPos);
    } else {
      this.velocity.set(0, 0, 0);
    }
  }
  
}

class Cluster extends THREE.Object3D {
  options: ClusterOptions;
  nodes: Node[];

  constructor(nodeData: INodeData[], options?: Partial<ClusterOptions>) {
    super();
    this.options = {
      kAttraction: 2,
      kRepulsion: 2,
      dampingFactor: 0.6,
      minDistance: 0.1,
      stopDistance: 2,
      maxAttrValue: 100,
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

@Component({
  selector: 'app-trait-visualization',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trait-visualization.component.html',
  styleUrl: './trait-visualization.component.scss',
})
export class TraitVisualizationComponent implements OnInit, AfterViewInit {
  @ViewChild('rendererCanvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('tooltip', { static: true }) tooltipRef!: ElementRef;
  @ViewChild('dropdown', { static: true }) dropdownRef!: ElementRef;
  @ViewChild('attrDropdown', { static: true }) attrDropdownRef!: ElementRef;

  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  controls!: OrbitControls;
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  mouse: THREE.Vector2 = new THREE.Vector2();
  cluster!: Cluster;
  tooltipVisible = false;
  // Holds the node whose attributes are being edited.
  selectedAttrNode: Node | null = null;

  constructor(private renderer2: Renderer2, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.initScene();
    this.loadNodes();
  }

  ngAfterViewInit(): void {
    this.animate();
    this.renderer2.listen('window', 'mousemove', (event: MouseEvent) =>
      this.onMouseMove(event)
    );
    window.addEventListener('resize', () => this.onWindowResize());
  }

  get editableNode(): Node | null {
    return this.selectedAttrNode ? this.selectedAttrNode : this.currentCentral;
  }

  get currentCentral(): Node | null {
    if (!this.cluster) return null;
    return this.cluster.nodes.find((node) => node.isCentralNode) || null;
  }

  get nonCentralNodes(): Node[] {
    if (!this.cluster) return [];
    return this.cluster.nodes.filter((node) => !node.isCentralNode);
  }

  get allNodes(): Node[] {
    return this.cluster ? this.cluster.nodes : [];
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 35;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    // Optional bounding box.
    // const boxGeo = new THREE.BoxGeometry(21, 21, 21);
    // const boxMat = new THREE.MeshBasicMaterial({
    //   color: 0xffffff,
    //   wireframe: true,
    //   transparent: true,
    //   opacity: 0.2,
    // });
    // const boundingBox = new THREE.Mesh(boxGeo, boxMat);
    // this.scene.add(boundingBox);
  }

  private loadNodes(): void {
    this.cluster = new Cluster(nodeData);
    this.scene.add(this.cluster);

    // Set initial central node's appearance.
    const initialCentral =
      this.cluster.nodes.find((node) => node.isCentralNode) ||
      this.cluster.nodes[0];
    initialCentral.setCentralNode(true, 5);
    initialCentral.mesh.scale.set(2, 2, 2);
  }

  private animate(): void {
    this.ngZone.runOutsideAngular(() => {
      const loop = () => {
        requestAnimationFrame(loop);
        this.controls.update();
        if (this.cluster) {
          this.cluster.update();
        }
        this.renderer.render(this.scene, this.camera);
        this.checkHover();
      };
      loop();
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.tooltipRef.nativeElement.style.left = event.clientX + 10 + 'px';
    this.tooltipRef.nativeElement.style.top = event.clientY + 10 + 'px';
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.cluster) return;
    const intersects = this.raycaster.intersectObjects(
      this.cluster.children,
      true
    );
    if (intersects.length > 0) {
      const hoveredNode = intersects[0].object.parent as Node;
      const nodeIndex = this.cluster.nodes.indexOf(hoveredNode);
      if (nodeIndex !== -1) {
        this.tooltipRef.nativeElement.innerText =
          hoveredNode.userData['name'] || `Node ${nodeIndex + 1}`;
        if (!this.tooltipVisible) {
          this.tooltipVisible = true;
          this.tooltipRef.nativeElement.style.opacity = '1';
          this.tooltipRef.nativeElement.style.display = 'block';
        }
        return;
      }
    }
    if (this.tooltipVisible) {
      this.tooltipVisible = false;
      this.tooltipRef.nativeElement.style.opacity = '0';
      setTimeout(() => {
        if (!this.tooltipVisible) {
          this.tooltipRef.nativeElement.style.display = 'none';
        }
      }, 200);
    }
  }

  // Handles changing the central node.
  onDropdownChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const index = parseInt(target.value);
    if (!this.cluster) return;
    const newCentral = this.cluster.nodes[index];
    const oldCentral = this.cluster.nodes.find((node) => node.isCentralNode);
    if (!newCentral || !oldCentral || newCentral === oldCentral) return;

    const newPos = newCentral.position.clone();
    const oldPos = oldCentral.position.clone();
    newCentral.swap = {
      start: newPos,
      end: new THREE.Vector3(0, 0, 0),
      startTime: performance.now(),
      duration: 5000,
    };
    oldCentral.swap = {
      start: oldPos,
      end: newPos,
      startTime: performance.now(),
      duration: 5000,
    };

    oldCentral.setCentralNode(false);
    newCentral.setCentralNode(true, 5);
    oldCentral.mesh.scale.set(1, 1, 1);
    newCentral.mesh.scale.set(2, 2, 2);

    // If the central node changes, and no non-central node is selected for editing,
    // the attribute table will fall back to displaying the central node's attributes.
    if (!this.selectedAttrNode) {
      // Trigger change detection for the attribute panel by reassigning.
      this.selectedAttrNode = null;
    }
  }

  // Handles selection of a node for attribute editing.
  onAttrDropdownChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value;
    if (!this.cluster) return;
    // Find the non-central node with the matching ID.
    const node = this.cluster.nodes.find(
      (node) => node.userData['id'].toString() === selectedId
    );
    this.selectedAttrNode = node || null;
  } 

  // Updates an attribute for the currently editable node.
  onAttributeChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newValue = Number(input.value);
    if (this.editableNode) {
      this.editableNode.attributes[index] = newValue;
      // Apply a small impulse so that the new forces become visible.
      // For non-central nodes, this helps to "reheat" the simulation.
      this.editableNode.velocity.add(new THREE.Vector3(0.02, 0.02, 0.02));
    }
  }
}

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
import { nodeData } from './data/nodes.data';
import { INodeData, IHumanAttributes } from './app.types';
import { Cluster } from './objects/Cluster';
import { Node } from './objects/Node';
import { handleRightClick } from './utils/on-right-click.util';
import {
  createSmokeTexture,
  createSmokeParticles,
  createCursorSphere,
} from './services/cursorEffects';

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

  private smokeTexture!: THREE.Texture;
  private smokeParticles!: THREE.Points;
  private smokeParticleCount = 150;

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
    // ... add lights

    // Use the imported functions to create smoke texture, particles, and cursor sphere.
    this.smokeTexture = createSmokeTexture();
    this.smokeParticles = createSmokeParticles(
      this.smokeTexture,
      this.smokeParticleCount
    );
    this.cursorSphere = createCursorSphere(this.smokeParticles);
    this.scene.add(this.cursorSphere);
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
    this.renderer2.listen(
      this.canvasRef.nativeElement,
      'contextmenu',
      (event: MouseEvent) =>
        handleRightClick(
          event,
          this.mouse,
          this.camera,
          this.raycaster,
          this.cluster,
          this.contextMenuRef,
          this.renderer2,
          (node: Node) => (this.selectedNode = node)
        )
    );
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

  // onNodesToggle(event: Event): void {
  //   let newNodeData: INodeData[];
  //   if (this.increaseNodes) {
  //     newNodeData = [
  //       ...this.originalNodeData,
  //       ...this.originalNodeData.map((node, index) => ({
  //         ...node,
  //         id: node.id + this.originalNodeData.length,
  //         name: node.name + ' copy',
  //         initialPosition: [
  //           node.initialPosition[0] + Math.random() * 5,
  //           node.initialPosition[1] + Math.random() * 5,
  //           node.initialPosition[2] + Math.random() * 5,
  //         ] as [number, number, number],
  //       })),
  //     ];
  //   } else {
  //     newNodeData = this.originalNodeData;
  //   }
  //   if (this.cluster) {
  //     this.scene.remove(this.cluster);
  //   }
  //   this.cluster = new Cluster(newNodeData);
  //   this.scene.add(this.cluster);
  //   const newCentral =
  //     this.cluster.nodes.find((node) => node.isSun) || this.cluster.nodes[0];
  //   newCentral.setSun(true, 5);
  //   newCentral.mesh.scale.set(2, 2, 2);
  //   this.selectedAttrNode = null;
  // }

  onRemoveNode(): void {
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

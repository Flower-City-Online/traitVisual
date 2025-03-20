import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  Renderer2,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

@Component({
  selector: 'app-tool-tip',
  imports: [],
  template: `<canvas #rendererCanvas></canvas>
    <div #tooltip class="tooltip">Big Sphere</div>`,
  styles: [
    `
      #rendererCanvas {
        display: block;
        width: 100%;
        height: 100vh;
        overflow: hidden;
      }
      .tooltip {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 5px;
        border-radius: 5px;
        pointer-events: none;
        display: none;
      }
    `,
  ],
})

export class ToolTipComponent implements OnInit, AfterViewInit {
  @ViewChild('rendererCanvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('tooltip', { static: true }) tooltipRef!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private sphere!: THREE.Mesh;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private tooltipVisible = false;

  constructor(private renderer2: Renderer2) {}

  ngOnInit() {
    this.initScene();
  }

  ngAfterViewInit() {
    this.animate();
    this.renderer2.listen('window', 'mousemove', (event) =>
      this.onMouseMove(event)
    );
  }

  private initScene() {
    // Create Scene
    this.scene = new THREE.Scene();

    // Camera Setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);

    // Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Sphere (Centered at 0,0,0)
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.scene.add(this.sphere);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Handle Resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.checkIntersections();
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent) {
    // Convert mouse position to normalized device coordinates
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private checkIntersections() {
    // Update the raycaster with the current mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Calculate objects intersecting the raycaster
    const intersects = this.raycaster.intersectObject(this.sphere);

    if (intersects.length > 0) {
      if (!this.tooltipVisible) {
        this.tooltipVisible = true;
        this.tooltipRef.nativeElement.style.display = 'block';
      }
      // Position the tooltip near the mouse cursor
      this.tooltipRef.nativeElement.style.left = `${
        ((this.mouse.x + 1) * window.innerWidth) / 2 + 10
      }px`;
      this.tooltipRef.nativeElement.style.top = `${
        ((-this.mouse.y + 1) * window.innerHeight) / 2 + 10
      }px`;
    } else {
      if (this.tooltipVisible) {
        this.tooltipVisible = false;
        this.tooltipRef.nativeElement.style.display = 'none';
      }
    }
  }
}

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
import { SPHERES_DATA } from './sphereData';

// sphere data structure id: number; name: string; position: [number, number, number]; isCentral: boolean; color: string;

@Component({
  selector: 'app-solar-system',
  imports: [],
  standalone: true,
  template: `
    <canvas #rendererCanvas></canvas>
    <div #tooltip class="tooltip"></div>
  `,
  styles: [
    `
      #rendererCanvas {
        display: block;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        position: relative;
      }
      canvas {
        display: block;
      }
      .tooltip {
        position: absolute;
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        padding: 6px 10px;
        border-radius: 4px;
        pointer-events: none; /* Prevents blocking interactions */
        font-size: 14px;
        white-space: nowrap;
        transition: opacity 0.2s ease-in-out;
        opacity: 0;
      }
    `,
  ],
})
export class SolarSystemComponent implements OnInit, AfterViewInit {
  @ViewChild('rendererCanvas', { static: true }) canvasRef!: ElementRef;
  @ViewChild('tooltip', { static: true }) tooltipRef!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private tooltipVisible = false;

  // Array to store all spheres
  private spheres: THREE.Mesh[] = [];

  constructor(private renderer2: Renderer2) {}

  ngOnInit() {
    this.initScene();
  }

  ngAfterViewInit() {
    this.animate();
    // Listen to mouse movements on the window
    this.renderer2.listen('window', 'mousemove', (event: MouseEvent) =>
      this.onMouseMove(event)
    );
  }

  private initScene() {
    // Create Scene
    this.scene = new THREE.Scene();

    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 20);

    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Create spheres from SPHERES_DATA array
    SPHERES_DATA.forEach((data) => {
      const geometry = new THREE.SphereGeometry(0.5, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(data.color),
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(data.position[0], data.position[1], data.position[2]);

      // Central
      if (data.isCentral) {
        sphere.scale.set(2, 2, 2);
      }

      // Store sphere name in userData for tooltip
      sphere.userData['name'] = data.name;
      this.scene.add(sphere);
      this.spheres.push(sphere);
    });

    // Add Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Initialize OrbitControls for camera movement
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Handle window resize
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
    // Convert the mouse position to normalized device coordinates (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
    // Update tooltip position dynamically
    this.tooltipRef.nativeElement.style.left = `${event.clientX + 10}px`;
    this.tooltipRef.nativeElement.style.top = `${event.clientY + 10}px`;
  }
  

  private checkIntersections() {
    // Update raycaster based on current mouse coordinates and camera
    this.raycaster.setFromCamera(this.mouse, this.camera);
    // Check intersections with all spheres
    const intersects = this.raycaster.intersectObjects(this.spheres);
  
    if (intersects.length > 0) {
      const intersectedSphere = intersects[0].object;
      const sphereName = intersectedSphere.userData['name'] || 'Sphere';
  
      // Update tooltip text
      this.tooltipRef.nativeElement.innerText = sphereName;
  
      if (!this.tooltipVisible) {
        this.tooltipVisible = true;
        this.tooltipRef.nativeElement.style.opacity = '1'; // Fade in
        this.tooltipRef.nativeElement.style.display = 'block';
      }
    } else {
      if (this.tooltipVisible) {
        this.tooltipVisible = false;
        this.tooltipRef.nativeElement.style.opacity = '0'; // Fade out
        setTimeout(() => {
          if (!this.tooltipVisible) {
            this.tooltipRef.nativeElement.style.display = 'none';
          }
        }, 200);
      }
    }
  }
  
}

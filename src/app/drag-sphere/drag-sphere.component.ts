import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-drag-sphere',
  imports: [],
  standalone: true,
  template: `<canvas #canvas></canvas>`,
  styles: [
    `
      canvas {
        width: 100%;
        height: 100vh;
        display: block;
      }
    `,
  ],
})
export class DragSphereComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId: number | undefined;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private dragPlane = new THREE.Plane();
  private dragOffset = new THREE.Vector3();
  private selectedMesh: THREE.Mesh | null = null;
  private sphereMeshes: THREE.Mesh[] = [];

  ngAfterViewInit(): void {
    this.initScene();
    this.addEventListeners();
    this.animate();
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    this.camera.position.z = 5;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    
    // Create sphere geometry and material
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    
    // Create and position three spheres
    const positions = [-2, 0, 2];
    positions.forEach(xPos => {
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.x = xPos;
      this.scene.add(sphere);
      this.sphereMeshes.push(sphere);
    });
    
    // Add lights to the scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    this.renderer.render(this.scene, this.camera);
  }

  private addEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
  }

  private removeEventListeners(): void {
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseUp);
  }

  private getMousePosition(event: MouseEvent): THREE.Vector2 {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private onMouseDown = (event: MouseEvent): void => {
    event.preventDefault();
    this.mouse = this.getMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.sphereMeshes);
    if (intersects.length > 0) {
      this.selectedMesh = intersects[0].object as THREE.Mesh;
      // Setup the drag plane: its normal is opposite to camera's direction
      this.dragPlane.setFromNormalAndCoplanarPoint(
        this.camera.getWorldDirection(new THREE.Vector3()).negate(),
        intersects[0].point
      );
      // Compute offset between mesh position and intersection point
      this.dragOffset.copy(intersects[0].point).sub(this.selectedMesh.position);
    }
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.selectedMesh) {
      return;
    }
    event.preventDefault();
    this.mouse = this.getMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersection = new THREE.Vector3();
    // Get the point where the ray intersects the drag plane
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
      // Adjust the sphere position with the previously computed offset
      this.selectedMesh.position.copy(intersection.sub(this.dragOffset));
    }
  }

  private onMouseUp = (event: MouseEvent): void => {
    event.preventDefault();
    this.selectedMesh = null;
  }
}

// src/app/utils/on-right-click.util.ts
import * as THREE from 'three';
import { Node } from '../objects/Node';
import {
  ElementRef,
  Renderer2,
} from '@angular/core';

export function handleRightClick(
  event: MouseEvent,
  mouse: THREE.Vector2,
  camera: THREE.PerspectiveCamera,
  raycaster: THREE.Raycaster,
  cluster: THREE.Object3D,
  contextMenuRef: ElementRef,
  renderer2: Renderer2,
  setSelectedNode: (node: Node) => void
): void {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(cluster.children, true);

  if (intersects.length > 0) {
    const selected = intersects[0].object.parent as Node;
    setSelectedNode(selected);
    const nodeName = selected.userData['name'] || 'Node';

    const menuElement = contextMenuRef.nativeElement;
    menuElement.style.display = 'block';
    menuElement.style.left = `${event.clientX}px`;
    menuElement.style.top = `${event.clientY}px`;
    menuElement.querySelector('#contextNodeName').textContent = nodeName;

    renderer2.listen('document', 'click', () => {
      menuElement.style.display = 'none';
    });
  }
}

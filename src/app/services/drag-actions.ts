import * as THREE from 'three';
import { Cluster } from '../objects/Cluster';
import { Node } from '../objects/Node';

// export function onDragStart(event: MouseEvent, cluster: Cluster, selectedNode: Node | null): void {
//   if (!selectedNode) return;

//   // Assuming selectedNode has position property
//   selectedNode.initialPosition = selectedNode.position.clone();
  
//   // Additional drag setup logic here, e.g., marking the object as dragged
// }

// export function onDragMove(event: MouseEvent, cluster: Cluster, selectedNode: Node | null): void {
//   if (!selectedNode || !selectedNode.initialPosition) return;

//   // Compute new position based on the mouse move event
//   const deltaX = event.movementX; // Get the movement in X direction
//   const deltaY = event.movementY; // Get the movement in Y direction

//   // Update the node's position based on the drag movement
//   selectedNode.position.set(
//     selectedNode.initialPosition.x + deltaX,
//     selectedNode.initialPosition.y + deltaY,
//     selectedNode.position.z // Keep Z position fixed for 2D dragging
//   );

//   // Update the cluster or other structures as needed (e.g., re-render the scene)
//   cluster.updateNode(selectedNode);
// }

// export function onDragEnd(event: MouseEvent, cluster: Cluster, selectedNode: Node | null): void {
//   if (!selectedNode) return;

//   // Finalize the drag action, e.g., update node position, handle snapping, etc.
//   selectedNode.initialPosition = null; // Reset initial position after drag ends
//   cluster.updateNode(selectedNode);
// }

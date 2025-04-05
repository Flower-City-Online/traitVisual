import * as THREE from 'three';
import {
  ISimulationConfigs,
  INodeData,
} from '../app.types';
import { Node } from './Node';

export class Cluster extends THREE.Object3D {
  options: ISimulationConfigs;
  nodes: Node[];

  constructor(nodeData: INodeData[], options?: Partial<ISimulationConfigs>) {
    super();
    this.options = {
      sun: {
        attraction: 1,
        repulsion: 1,
        repulsionInitializationThreshold: 0.4,
      },
      planet: {
        attraction: 1,
        repulsion: 1,
        repulsionInitializationThreshold: 0.2,
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

    // Bound the position within (-8, -8, -8) and (8, 8, 8)
    const BOUND = 8;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -BOUND, BOUND);
    this.position.y = THREE.MathUtils.clamp(this.position.y, -BOUND, BOUND);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -BOUND, BOUND);
  }
}
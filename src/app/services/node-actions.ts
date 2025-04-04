import * as THREE from 'three';
import { INodeData, IHumanAttributes } from '../app.types';
import { Node } from '../objects/Node';
import { Cluster } from '../objects/Cluster';

export function addNode(cluster: Cluster, newNodeCounter: number): number {
  const newId = Date.now();
  const newName = `New-Node-[${newNodeCounter}]`;
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
  const newNode = new Node(newNodeData, cluster.options);
  cluster.nodes.push(newNode);
  cluster.add(newNode);
  return newNodeCounter + 1;
}

export function removeNode(
  cluster: Cluster,
  selectedNode: Node | null,
  hiddenNodes: Node[],
  contextMenuElement: HTMLElement
): void {
  if (!selectedNode || selectedNode.isSun) return;
  cluster.remove(selectedNode);
  const index = cluster.nodes.indexOf(selectedNode);
  if (index > -1) {
    cluster.nodes.splice(index, 1);
  }
  hiddenNodes.push(selectedNode);
  contextMenuElement.style.display = 'none';
}

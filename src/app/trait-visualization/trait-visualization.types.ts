import * as THREE from 'three';

export interface ClusterOptions {
  kAttraction: number;
  kRepulsion: number;
  dampingFactor: number;
  minDistance: number;
  stopDistance: number;
  maxAttrValue: number;
  maxAttractionDistance: number;
}

export interface SwapAnimation {
  start: THREE.Vector3;
  end: THREE.Vector3;
  startTime: number;
  duration: number;
}
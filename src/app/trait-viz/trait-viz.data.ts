import { Vector3 } from 'three';
import { INodeData } from './trait-viz.types';

/**
 * Returns a random Vector3 with a fixed magnitude.
 * Here, the generated vector is normalized and then scaled to 'distance'.
 */
function randomPositionFixed(distance: number): Vector3 {
  const pos = new Vector3(
    Math.random() - 0.5,  // random value between -0.5 and 0.5
    Math.random() - 0.5,
    Math.random() - 0.5
  );
  return pos.normalize().multiplyScalar(distance);
}

export const nodeData: INodeData[] = [
  {
    id: 1,
    name: 'James',
    initialPosition: [0, 0, 0],  // Sun at the center
    isSun: true,
    color: '#FF0000',
    attributes: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
    preferences: {
      attrOne: 100,
      attrTwo: 100,
      attrThree: 100,
    },
  },
  {
    id: 2,
    name: 'John',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#00ff00',
    attributes: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 3,
    name: 'Alice',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#0000ff',
    attributes: {
      attrOne: 25,
      attrTwo: 25,
      attrThree: 25,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 4,
    name: 'Robert',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ffff00',
    attributes: {
      attrOne: 50,
      attrTwo: 50,
      attrThree: 50,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 5,
    name: 'Emma',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ff00ff',
    attributes: {
      attrOne: 75,
      attrTwo: 75,
      attrThree: 75,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 6,
    name: 'Michael',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#00ffff',
    attributes: {
      attrOne: 100,
      attrTwo: 100,
      attrThree: 100,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  // Additional 15 nodes
  {
    id: 7,
    name: 'Sophia',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ff9900',
    attributes: {
      attrOne: 10,
      attrTwo: 30,
      attrThree: 50,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 8,
    name: 'William',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#9900ff',
    attributes: {
      attrOne: 20,
      attrTwo: 40,
      attrThree: 60,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 9,
    name: 'Olivia',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#009900',
    attributes: {
      attrOne: 30,
      attrTwo: 60,
      attrThree: 90,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 10,
    name: 'Benjamin',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ff5050',
    attributes: {
      attrOne: 40,
      attrTwo: 20,
      attrThree: 80,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 11,
    name: 'Ava',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#5050ff',
    attributes: {
      attrOne: 50,
      attrTwo: 70,
      attrThree: 30,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 12,
    name: 'Henry',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#50ff50',
    attributes: {
      attrOne: 60,
      attrTwo: 80,
      attrThree: 40,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 13,
    name: 'Mia',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ff50ff',
    attributes: {
      attrOne: 70,
      attrTwo: 90,
      attrThree: 50,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 14,
    name: 'Alexander',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#50ffff',
    attributes: {
      attrOne: 80,
      attrTwo: 60,
      attrThree: 20,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 15,
    name: 'Charlotte',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ffff50',
    attributes: {
      attrOne: 90,
      attrTwo: 50,
      attrThree: 10,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 16,
    name: 'Daniel',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ff6600',
    attributes: {
      attrOne: 100,
      attrTwo: 40,
      attrThree: 70,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 17,
    name: 'Amelia',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#0066ff',
    attributes: {
      attrOne: 15,
      attrTwo: 85,
      attrThree: 55,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 18,
    name: 'Ethan',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#66ff00',
    attributes: {
      attrOne: 25,
      attrTwo: 95,
      attrThree: 65,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 19,
    name: 'Isabella',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ff0066',
    attributes: {
      attrOne: 35,
      attrTwo: 75,
      attrThree: 85,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 20,
    name: 'Matthew',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#6600ff',
    attributes: {
      attrOne: 45,
      attrTwo: 65,
      attrThree: 95,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
  {
    id: 21,
    name: 'Evelyn',
    initialPosition: randomPositionFixed(3).toArray(),
    isSun: false,
    color: '#ffcc00',
    attributes: {
      attrOne: 55,
      attrTwo: 55,
      attrThree: 45,
    },
    preferences: {
      attrOne: 0,
      attrTwo: 0,
      attrThree: 0,
    },
  },
];
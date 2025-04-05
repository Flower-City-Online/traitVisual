import { Vector3 } from 'three';
import { INodeData } from '../app.types';

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

const colors = ['#60a5fa', '#c084fc']; // Tailwind blue-400 and purple-400

export const nodeData: INodeData[] = [
  {
    id: 1,
    name: 'James',
    initialPosition: [0, 0, 0],
    isSun: true,
    color: '#c084fc', // Purple for Sun
    attributes: { attrOne: 0, attrTwo: 0, attrThree: 0 },
    preferences: { attrOne: 100, attrTwo: 100, attrThree: 100 },
  },
  ...[...Array(20)].map((_, i) => {
    const id = i + 2;
    const names = [
      'John', 'Alice', 'Robert', 'Emma', 'Michael', 'Sophia', 'William', 'Olivia',
      'Benjamin', 'Ava', 'Henry', 'Mia', 'Alexander', 'Charlotte', 'Daniel',
      'Amelia', 'Ethan', 'Isabella', 'Matthew', 'Evelyn'
    ];

    return {
      id,
      name: names[i],
      initialPosition: randomPositionFixed(3).toArray(),
      isSun: false,
      color: colors[i % 2], // Alternate between blue-400 and purple-400
      attributes: {
        attrOne: (i * 5) % 101,
        attrTwo: (i * 10 + 20) % 101,
        attrThree: (i * 15 + 30) % 101,
      },
      preferences: {
        attrOne: 0,
        attrTwo: 0,
        attrThree: 0,
      },
    };
  }),
];

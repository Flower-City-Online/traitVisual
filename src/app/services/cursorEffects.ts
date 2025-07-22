import * as THREE from 'three';

/**
 * Creates a smoke texture by drawing on a canvas.
 */
export function createSmokeTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.g
  ctx.fillRect(0, 0, size, size);

  // Add random turbulence to the alpha channel.
  const imageData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const alpha = imageData.data[i + 3];
    if (alpha > 0) {
      const noise = Math.random() * 0.3;
      imageData.data[i + 3] = Math.min(255, alpha * (0.8 + noise));
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Initializes the smoke particles using the given texture.
 */
export function createSmokeParticles(smokeTexture: THREE.Texture, smokeParticleCount: number): THREE.Points {
  const smokeGeometry = new THREE.BufferGeometry();
  const smokePositions = new Float32Array(smokeParticleCount * 3);
  const smokeScales = new Float32Array(smokeParticleCount);

  // Distribute particle positions around the origin.
  for (let i = 0; i < smokeParticleCount; i++) {
    const radius = 0.25 + Math.random() * 0.15;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    smokePositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    smokePositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    smokePositions[i * 3 + 2] = radius * Math.cos(phi);

    smokeScales[i] = 0.1 + Math.random() * 0.15;
  }

  smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
  smokeGeometry.setAttribute('scale', new THREE.BufferAttribute(smokeScales, 1));

  const smokeMaterial = new THREE.PointsMaterial({
    map: smokeTexture,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    size: 0.2,
    sizeAttenuation: true,
    color: 0xaaaaaa,
  });

  return new THREE.Points(smokeGeometry, smokeMaterial);
}

/**
 * Creates the cursor sphere mesh and attaches the smoke particles as its child.
 */
export function createCursorSphere(smokeParticles: THREE.Points): THREE.Mesh {
  const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const sphereMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.0,
    transmission: 0.9,
    transparent: true,
    opacity: 0.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    ior: 1.5,
    envMapIntensity: 1.0,
  });
  const cursorSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  cursorSphere.add(smokeParticles);
  return cursorSphere;
}

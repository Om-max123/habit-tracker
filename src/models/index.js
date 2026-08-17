// ============================================================================
// 3D Model Definitions
// ============================================================================

import * as THREE from 'three';
import { IridescentShader } from '../shaders.js';

// ============================================================================
// Project 1: VOID_SKULL — Iridescent liquid metal skull model
// ============================================================================

export async function createVoidSkull() {
  // Create the skull base geometry with high detail
  const geometry = new THREE.DodecahedronGeometry(1, 3);

  // Deform vertices to create skull-like shape
  const vertices = geometry.attributes.position.array;
  const vertexCount = vertices.length / 3;

  for (let i = 0; i < vertexCount; i++) {
    // Get vertex position
    const ix = vertices[i * 3];
    const iy = vertices[i * 3 + 1];
    const iz = vertices[i * 3 + 2];

    // Calculate elevation and angle
    const elevation = iy / 1;
    const angle = Math.atan2(iz, ix);
    const radius = Math.sqrt(ix * ix + iz * iz);

    // Create skull cavity by modifying front/back proportions
    // Front (y < 0) pushes vertices forward, back recedes
    let deformation = 1.0;
    if (iy < -0.1) {
      // Jaw/cheek area
      deformation *= 1.0 + Math.exp(-iy * 3) * 0.15;
    }
    if (iy > 0.2) {
      // Forehead
      deformation *= 1.0 - iy * 0.2;
    }

    // Eye sockets
    const leftEyeDist = Math.sqrt((ix - 0.35) * (ix - 0.35) + (iy - 0.1) * (iy - 0.1) + iz * iz);
    const rightEyeDist = Math.sqrt((ix + 0.35) * (ix + 0.35) + (iy - 0.1) * (iy - 0.1) + iz * iz);
    if (leftEyeDist < 0.25 || rightEyeDist < 0.25) {
      deformation *= 0.7; // Inflate outward for socket effect
    }

    // Nose bridge depression
    const noseDist = Math.sqrt(ix * ix + (iy + 0.2) * (iy + 0.2) + (iz - 0.2) * (iz - 0.2));
    if (noseDist < 0.3) {
      deformation *= 0.85;
    }

    // Jaw line
    const jawFactor = Math.exp(-iy * 2) * (1 - Math.cosh(ix * 1.5));
    deformation += jawFactor * 0.1;

    // Apply deformation
    vertices[i * 3] *= deformation;
    vertices[i * 3 + 1] *= deformation;
    vertices[i * 3 + 2] *= deformation;
  }

  geometry.computeVertexNormals();

  // Create iridescent material using custom shader
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: new THREE.Vector2(0, 0) },
      u_iridescence: { value: 0.5 },
      u_intensity: { value: 0.6 },
      u_thickness: { value: 0.3 },
      u_roughness: { value: 0.2 },
      u_metalness: { value: 0.9 },
      u_clearcoat: { value: 0.5 },
      u_clearcoat_roughness: { value: 0.1 },
      u_color1: { value: new THREE.Color(0x00E5FF) },
      u_color2: { value: new THREE.Color(0xFF00FF) },
      u_color3: { value: new THREE.Color(0xFFD700) },
      u_light_color: { value: new THREE.Color(0xFFFFFF) },
      u_light_position: { value: new THREE.Vector3(5, 8, 5) },
      u_view_position: { value: new THREE.Vector3(0, 0, 10) }
    },
    vertexShader: IridescentShader.vertexShader,
    fragmentShader: IridescentShader.fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  // Create mesh
  const skull = new THREE.Mesh(geometry, material);
  skull.userData = { type: 'void_skull' };

  // Add edges for wireframe overlay effect
  const edgesGeometry = new THREE.EdgesGeometry(geometry, 10);
  const edgesMaterial = new THREE.LineBasicMaterial({
    color: 0x00E5FF,
    transparent: true,
    opacity: 0.3,
    linewidth: 2,
    blending: THREE.AdditiveBlending
  });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  skull.add(edges);

  // Add inner glow sphere
  const glowGeometry = new THREE.SphereGeometry(0.95, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF00FF,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide,
    depthWrite: false
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  skull.add(glow);

  // Store references
  skull.userData.material = material;
  skull.userData.edges = edges;
  skull.userData.glow = glow;

  return skull;
}

// ============================================================================
// Project 2: KINETIC_STRUCTURE — Procedural wireframe geometry
// ============================================================================

export async function createKineticStructure() {
  // Create group container for the kinetic structure
  const group = new THREE.Group();
  group.userData = { type: 'kinetic_structure' };

  // Main geometry
  const geometry = new THREE.IcosahedronGeometry(1, 1);

  // Deform vertices for irregular structure
  const vertices = geometry.attributes.position.array;
  const vertexCount = vertices.length / 3;

  for (let i = 0; i < vertexCount; i++) {
    const ix = vertices[i * 3];
    const iy = vertices[i * 3 + 1];
    const iz = vertices[i * 3 + 2];

    // Procedural noise-based displacement
    const time = performance.now() * 0.001;
    const noise = Math.sin(ix * 2.1 + time * 0.5) *
                  Math.cos(iy * 1.7 + time * 0.3) *
                  Math.sin(iz * 2.3 + time * 0.7);

    const displacement = noise * 0.3;

    vertices[i * 3] += ix * displacement;
    vertices[i * 3 + 1] += iy * displacement;
    vertices[i * 3 + 2] += iz * displacement;
  }

  geometry.computeVertexNormals();

  // Wireframe material
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF00FF,
    transparent: true,
    opacity: 0.2,
    wireframes: false
  });

  // Wireframe line material
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00E5FF,
    transparent: true,
    opacity: 0.8,
    linewidth: 2,
    blending: THREE.AdditiveBlending
  });

  // Create solid mesh
  const mesh = new THREE.Mesh(geometry, wireframeMaterial);
  group.add(mesh);

  // Create wireframe overlay
  const edges = new THREE.EdgesGeometry(geometry);
  const lineSegments = new THREE.LineSegments(edges, lineMaterial);
  group.add(lineSegments);

  // Add internal geometry - connecting lines between vertices
  const connectionGeometry = new THREE.BufferGeometry();
  const connectionPositions = [];
  const connectionColors = [];

  for (let i = 0; i < vertexCount; i++) {
    const i3 = i * 3;
    for (let j = i + 1; j < vertexCount; j++) {
      const j3 = j * 3;
      const dx = vertices[i3] - vertices[j3];
      const dy = vertices[i3 + 1] - vertices[j3 + 1];
      const dz = vertices[i3 + 2] - vertices[j3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Connect nearby vertices
      if (dist < 1.2) {
        connectionPositions.push(vertices[i3], vertices[i3 + 1], vertices[i3 + 2]);
        connectionPositions.push(vertices[j3], vertices[j3 + 1], vertices[j3 + 2]);

        // Color based on distance
        const t = 1.0 - (dist / 1.2);
        connectionColors.push(t, 0, 1 - t, 1, 0, 1 - t);
      }
    }
  }

  connectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectionPositions, 3));
  connectionGeometry.setAttribute('color', new THREE.Float32BufferAttribute(connectionColors, 3));

  const connectionMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    linewidth: 3
  });

  const connections = new THREE.LineSegments(connectionGeometry, connectionMaterial);
  group.add(connections);

  // Add orbiting nodes at vertices
  const nodeGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  const nodeMaterial = new THREE.MeshBasicMaterial({
    color: 0xFFD700,
    transparent: true,
    opacity: 0.9
  });

  for (let i = 0; i < vertexCount; i++) {
    const ix = vertices[i * 3];
    const iy = vertices[i * 3 + 1];
    const iz = vertices[i * 3 + 2];
    const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
    node.position.set(ix, iy, iz);
    group.add(node);
  }

  // Store geometry references for animation
  group.userData.geometry = geometry;
  group.userData.edges = edges;
  group.userData.connections = connectionGeometry;
  group.userData.connectionMaterial = connectionMaterial;
  group.userData.baseVertices = [...vertices];

  return group;
}

// ============================================================================
// Project 3: MATRIX_CORE — Cyber command center visualization
// ============================================================================

export async function createMatrixCore() {
  // Create group container
  const group = new THREE.Group();
  group.userData = { type: 'matrix_core' };

  // Central core structure
  const coreGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16, 1);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0x00E5FF,
    wireframe: true,
    transparent: true,
    opacity: 0.7
  });

  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.rotation.y = 0.5;
  group.add(core);

  // Particle field
  const particleCount = 800;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Distribute in cylindrical coordinates around the core
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 3 + Math.random() * 2;
    const height = (Math.random() - 0.5) * 6;

    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = height;
    positions[i3 + 2] = Math.sin(angle) * radius;

    // Color particles in cyan-magenta-gold spectrum
    const colorChoice = Math.random();
    if (colorChoice < 0.33) {
      colors[i3] = 0.0;
      colors[i3 + 1] = 0.9;
      colors[i3 + 2] = 1.0; // Cyan
    } else if (colorChoice < 0.66) {
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.0;
      colors[i3 + 2] = 1.0; // Magenta
    } else {
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.89;
      colors[i3 + 2] = 0.0; // Gold
    }

    sizes[i] = Math.random() * 0.3 + 0.1;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  group.add(particleSystem);

  // Particle velocities for animation
  const velocities = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i++) {
    velocities[i] = (Math.random() - 0.5) * 0.005;
  }

  particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

  // Add grid floor
  const gridGeometry = new THREE.PlaneGeometry(20, 20);
  const gridMaterial = new THREE.MeshBasicMaterial({
    color: 0x00E5FF,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide
  });

  const gridHelper = new THREE.GridHelper(20, 40, 0xFF00FF, 0x00E5FF);
  gridHelper.position.y = -3;
  (gridHelper.material as THREE.LineBasicMaterial).transparent = true;
  (gridHelper.material as THREE.LineBasicMaterial).opacity = 0.3;
  group.add(gridHelper);

  // Data streams (animated lines)
  for (let s = 0; s < 5; s++) {
    const streamGeometry = new THREE.BufferGeometry();
    const streamPositions = [];
    const streamColors = [];

    for (let j = 0; j < 100; j++) {
      const angle = (j / 100) * Math.PI * 2;
      const radius = 1 + Math.sin(j * 0.5) * 0.5;
      const height = (j - 50) * 0.1;

      streamPositions.push(
        Math.cos(angle) * radius + s * 0.5,
        height,
        Math.sin(angle) * radius
      );

      const t = j / 100;
      const colorSeed = (s + t) % 3;
      if (colorSeed === 0) {
        streamColors.push(0, 0.9, 1);
      } else if (colorSeed === 1) {
        streamColors.push(1, 0, 1);
      } else {
        streamColors.push(1, 0.89, 0);
      }
    }

    streamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(streamPositions, 3));
    streamGeometry.setAttribute('color', new THREE.Float32BufferAttribute(streamColors, 3));

    const streamMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      linewidth: 2
    });

    const stream = new THREE.Line(streamGeometry, streamMaterial);
    stream.userData.index = s;
    group.add(stream);
  }

  // Store references for animation
  group.userData.core = core;
  group.userData.particleSystem = particleSystem;
  group.userData.particleGeometry = particleGeometry;
  group.userData.gridHelper = gridHelper;

  return group;
}

// ============================================================================
// Utility: Model metadata
// ============================================================================

export const MODEL_METADATA = {
  void_skull: {
    name: 'VOID_SKULL',
    description: 'Iridescent liquid metal skull with chromatic aberration shader',
    tags: ['custom-shader', 'iridescence', 'post-process'],
    color: '#00E5FF'
  },
  kinetic_structure: {
    name: 'KINETIC_STRUCTURE',
    description: 'Procedural wireframe geometry with audio-reactive morphing',
    tags: ['procedural', 'audio-reactive', 'morphing'],
    color: '#FF00FF'
  },
  matrix_core: {
    name: 'MATRIX_CORE',
    description: 'Cyber command center visualization with particle field',
    tags: ['particles', 'gpu-compute', 'instancing'],
    color: '#FFD700'
  }
};
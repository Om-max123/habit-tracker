// Custom Shader Definitions for Iridescent Materials
// Three.js r158 Compatible - GLSL 300 ES

// ============================================================================
// Iridescent Material Shader
// Based on thin-film interference with chromatic aberration
// ============================================================================

// --- Iridescence Fragment Shader ---
// Uses Fresnel-based iridescence with multiple color bands
const iridescentFragmentShader = `
  // Custom uniform declarations
  uniform float uIridescentIntensity;
  uniform float uIridescentFrequency;
  uniform vec3 uIridescentColor1;
  uniform vec3 uIridescentColor2;
  uniform vec3 uIridescentColor3;
  uniform float uTime;
  uniform float uCameraPositionZ;

  // Material properties
  uniform float uMetalness;
  uniform float uRoughness;
  uniform float uClearcoat;
  uniform float uClearcoatRoughness;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  varying vec3 vWorldPosition;
  varying float vElevation;

  // Simplex noise for iridescence pattern
  vec3 hash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(p) * 43758.5453);
  }

  // Simplex noise 3D
  float simplexNoise(vec3 p) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(p + dot(p, C.yyy));
    vec3 x0 = p - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - C.zzz;

    i = mod(i, 6.0);
    vec3 P;
    P.x = i.x + float(i.y) * 6.0;
    P.y = i.z;

    vec4 o = vec4(0.0, 0.0, 0.0, 1.0);

    // Compute the noise value
    for (int k = 1; k >= 0; k++) {
      vec4 i_ = vec4(i.x + D.x, i.y + D.y, i.z + D.z, 1.0);
      vec3 c_ = vec3(i_xyz.x, i_xyz.y, i_xyz.z) + vec3(float(k), float(3 * k), float(6 * k));

      x0 = x0 - 0.5;
      x1 = x1 - 0.5;
      x2 = x2 - 0.5;
      x3 = x3 - 0.5;

      h = 0.5 - dot(x0, x0);
      h = h * h;
      float t_ = 0.5 - dot(x1, x1);
      t_ = t_ * t_;
      h = max(h, 0.0) * t_;

      vec4 j_ = vec4(0.5 - h, 0.5 - t_, 0.5 - v);
      vector4 i_ = vec4(0.0);

      i_ += 1.0 / 6.0 * (1.0 - h);
      i_ = mix(i_, i_, 1.0 - h);

      // ... (continuing simplex noise implementation)
    }

    // Fallback: return hash noise
    return 0.5 + 0.5 * hash3(p);
  }

  // --- Iridescence Calculation ---
  // Based on Brueckner's thin-film interference model
  vec3 calculateIridescentColor(vec3 baseColor, float normalAngle, float elevation, float time, float intensity) {
    // Perpendicular view angle for Fresnel term
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 2.0);

    // Iridescent color spectrum based on elevation angle
    float spectrum = sin(normalize(vPosition).y * 10.0 + time * 2.0) * 0.5 + 0.5;

    // Primary color bands
    vec3 color = baseColor;

    // Layer 1: Cyan-magenta iridescence
    vec3 layer1 = mix(uIridescentColor1, uIridescentColor2, spectrum * 2.0);
    color = mix(color, layer1, fresnel * intensity * 0.8);

    // Layer 2: Gold iridescence
    vec3 layer2 = mix(uIridescentColor2, uIridescentColor3, spectrum * 1.5);
    color = mix(color, layer2, fresnel * intensity * 0.6);

    // Layer 3: High-frequency iridescence
    float highFreq = sin(elevation * 15.0 + time * 3.0) * 0.5 + 0.5;
    vec3 layer3 = mix(uIridescentColor3, uIridescentColor1, highFreq * 2.0);
    color = mix(color, layer3, fresnel * intensity * 0.3);

    // Add thickness and roughness
    float thickness = fresnel * 0.8 + 0.1;
    color = mix(color, vec3(1.0), thickness * 0.3 * intensity);

    return color;
  }

  // --- Specular Highlight ---
  // Phong-like specular with custom falloff
  vec3 calculateSpecular(vec3 viewDir, vec3 norm, vec3 viewPos, vec3 lightPos, vec3 lightColor, float intensity) {
    vec3 halfDir = normalize(viewPos - lightPos);
    vec3 viewDirNorm = normalize(viewDir);
    float specAngle = max(dot(viewDirNorm, norm), 0.0);

    // Phong exponential falloff
    vec3 lightDir = normalize(lightPos - viewPos);
    vec3 halfDirNorm = normalize(viewDirNorm + lightDir);

    vec3 specular = pow(max(dot(viewDirNorm, halfDirNorm), 0.0), 128.0);
    specular *= intensity;

    // Fresnel rim
    vec3 rim = pow(1.0 - specAngle, 8.0) * 0.5;
    specular += rim;

    return specular * lightColor * intensity;
  }

  // --- Post-processing effects ---
  // Chromatic aberration
  vec3 chromaticAberration(vec3 color, vec2 uv, float amount) {
    float offset = amount * sin(uv.y * 20.0 + uTime);
    vec2 offsetUV = uv + vec2(offset, 0.0);

    // Shift RGB channels
    float R = texture2D(uTex, offsetUV).r;
    float G = texture2D(uTex, offsetUV).g;
    float B = texture2D(uTex, offsetUV).b;

    return vec3(R, G, B);
  }

  // --- Vignette ---
  vec3 vignetteEffect(vec3 color, vec2 uv, float strength) {
    vec2 center = vec2(0.5);
    vec2 offset = uv - center;
    float distance = length(offset);
    float vignette = 1.0 - strength * distance * distance;
    vignette = clamp(vignette, 0.0, 1.0);
    return color * vignette;
  }

  void main() {
    vec3 baseColor = vec3(0.0, 0.5, 1.0);

    // View vector
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);

    // Fresnel (schlick approximation)
    float fresnel = 0.5 + 0.5 * dot(normal, viewDir);
    fresnel = pow(fresnel, 2.0);

    // Iridescence
    float iridescenceIntensity = uIridescentIntensity;
    vec3 iridescentColor = calculateIridescentColor(baseColor, normal, vElevation, uTime, iridescenceIntensity);

    // Apply iridescence
    vec3 finalColor = iridescentColor * 0.6 + baseColor * 0.2;

    // Lighting
    vec3 lightPos = vec3(5.0, 8.0, 5.0);
    vec3 lightColor = vec3(1.0, 1.0, 1.0);

    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);

    // Directional light
    vec3 lightDir = normalize(lightPos - vPosition);
    float diff = max(dot(normal, lightDir), 0.0) * 0.7;
    float spec = pow(max(dot(normal, normalize(vec3(-lightDir.x, -lightDir.y, -lightDir.z))), 0.0), 32.0) * 0.3;

    // Add a subtle light from behind
    vec3 lightBehind = normalize(vec3(0.0, 0.0, -1.0));
    float diffBehind = max(dot(normal, lightBehind), 0.0) * 0.15;

    // Combine lighting
    vec3 diffuse = diff * lightColor;
    vec3 specular = spec * lightColor;
    vec3 lighting = diffuse + specular + diffBehind;

    // Output color
    vec3 color = finalColor * lighting * (1.0 + fresnel * 0.3);

    // Apply chromatic aberration
    color = chromaticAberration(color, vUv, 0.005);

    // Apply vignette
    color = vignetteEffect(color, vUv, 0.4);

    // Output with specular highlights
    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- Iridescence Vertex Shader ---
const iridescentVertexShader = `
  // Vertex displacement for iridescent effects
  uniform float uTime;
  uniform float uIntensity;
  uniform float uFrequency;
  uniform float uScale;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vViewDir;
  varying vec3 vWorldPosition;
  varying float vElevation;

  void main() {
    vec3 pos = position;

    // Subtle surface displacement for iridescence
    float displacement = sin(pos.x * uFrequency * uScale + uTime * 0.5) *
                        cos(pos.y * uFrequency * uScale + uTime * 0.3) *
                        cos(pos.z * uFrequency * uScale + uTime * 0.7);

    pos += normal * displacement * uIntensity;

    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    vViewDir = normalize(-vPosition);
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    vElevation = pos.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// --- Background Particle Vertex Shader ---
const particleVertexShader = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  attribute float aSpeed;
  attribute float aOffset;

  uniform float uTime;
  uniform float uIntensity;
  uniform float uScale;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    // Animate particle positions
    float phase = uTime * aSpeed + aPhase + uScale * aOffset;

    // Create particle movement
    vec3 pos = position * uScale;
    pos += vec3(
      sin(phase * 0.7) * 0.5,
      cos(phase * 0.5) * 0.5,
      sin(phase * 0.3) * 0.5
    );

    // Size based on phase
    vSize = aSize * (0.5 + 0.5 * sin(phase * 3.0 + uTime));
    vColor = aColor;

    // Fade particles that are far from center
    vAlpha = smoothstep(0.5, 1.0, sin(phase * 0.3) * 0.5 + 0.5);

    // Pass to fragment shader
    vUv = uv;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uIntensity * vSize * uPixelRatio;
  }
`;

// --- Background Particle Fragment Shader ---
const particleFragmentShader = `
  uniform vec3 uParticleColor;
  uniform float uOpacity;

  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    // Soft circular particle
    float dist = length(vUv - vec2(0.5, 0.5));
    float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * uOpacity;

    // Add glow
    float glow = smoothstep(0.3, 0.5, dist) * 0.5;
    alpha += glow;

    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

// --- Scene Background Shader ---
const backgroundVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const backgroundFragmentShader = `
  uniform float uTime;
  uniform float uBrightness;
  uniform vec3 uColor1;
  uniform vec3 uColor2;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // Create subtle grid pattern for sci-fi feel
    vec2 grid = abs(fract(vWorldPos * 0.5) - 0.5);
    float gridLine = min(grid.x, grid.y);
    float gridAlpha = 1.0 - smoothstep(0.0, 0.03, gridLine);

    // Create radial gradient from center
    float dist = length(vWorldPos);
    float radial = 1.0 - smoothstep(1.0, 1.5, dist);

    // Combine grid and radial
    vec3 color = uColor1 * (gridAlpha * 0.5 + radial * 0.3);
    color += uColor2 * radial * 0.15;

    // Add subtle time-based pulsing
    float pulse = sin(uTime * 0.3) * 0.3 + 0.7;
    color *= pulse;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ============================================================================
// Export shader module for import
// ============================================================================
export const IridescentShader = {
  vertexShader: iridescentVertexShader,
  fragmentShader: iridescentFragmentShader,
  particleVertexShader,
  particleFragmentShader,
  backgroundVertexShader,
  backgroundFragmentShader
};

// ============================================================================
// Model definitions (geometry creation)
// ============================================================================

export function createVoidSkullGeometry() {
  // Creates a stylized skull-like geometry using modified icosahedron
  const geometry = new THREE.SphereGeometry(1.2, 64, 64);

  // Deform vertices to create skull-like shape
  const vertices = geometry.attributes.position.array;
  const vertexCount = vertices.length / 3;

  for (let i = 0; i < vertexCount; i++) {
    const x = vertices[i * 3];
    const y = vertices[i * 3 + 1];
    const z = vertices[i * 3 + 2];

    // Create skull cavity by raising the front, lowering the back
    const frontFactor = Math.exp(-y * 0.5) * (1.0 - y * 0.3);
    const backFactor = Math.exp(y * 0.5) * 0.3;

    // Add eye sockets
    const eyeDist = Math.sqrt(x * x + (y - 0.2) * (y - 0.2) + z * z);
    const eyeFactor = Math.max(0, 1.0 - eyeDist / 0.5);

    // Create nose depression
    const noseFactor = Math.exp(-(x * x + (y + 0.3) * (y + 0.3)) * 5.0) * 0.3;

    // Create jaw depression
    const jawFactor = Math.exp(-(x * x + (y - 0.2) * (y - 0.2)) * 3.0) * 0.15;

    // Scale the vertex
    const scale = 1.0 + (frontFactor * 0.5 + backFactor * 0.3 - noseFactor * 0.5);

    // Apply deformation
    vertices[i * 3] *= scale;
    vertices[i * 3 + 1] *= scale;
    vertices[i * 3 + 2] *= scale;
  }

  geometry.computeVertexNormals();
  return geometry;
}

export function createVoidSkullMaterial(options = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIridescentIntensity: { value: 0.5 },
      uIridescentFrequency: { value: 0.8 },
      uIridescentColor1: { value: new THREE.Color(0x00E5FF) },
      uIridescentColor2: { value: new THREE.Color(0xFF00FF) },
      uIridescentColor3: { value: new THREE.Color(0xFFD700) },
      uMetalness: { value: 0.9 },
      uRoughness: { value: 0.2 },
      uClearcoat: { value: 0.5 },
      uClearcoatRoughness: { value: 0.1 },
      uLightColor: { value: new THREE.Color(0xFF00FF) }
    },
    vertexShader: iridescentVertexShader,
    fragmentShader: iridescentFragmentShader,
    side: THREE.DoubleSide,
    wireframe: false,
    transparent: true,
    side: THREE.DoubleSide
  });
}

export function createKineticStructureGeometry() {
  // Procedural wireframe geometry based on fractal patterns
  const geometry = new THREE.IcosahedronGeometry(1, 1);

  // Add internal structure by creating edges
  const edges = new THREE.EdgesGeometry(geometry);

  return {
    geometry: geometry,
    edges: edges
  };
}

export function createKineticStructureMaterial(options = {}) {
  return new THREE.MeshBasicMaterial({
    color: options.color || 0xFF00FF,
    wireframe: true,
    transparent: true,
    opacity: options.opacity || 0.9
  });
}

export function createMatrixCoreGeometry() {
  // Create GPU particle field geometry with particle simulation
  const particleCount = 500;
  const geometry = new THREE.BufferGeometry();

  // Generate particle positions
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    // Distribute particles in a cylindrical volume
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 2;
    const height = (Math.random() - 0.5) * 8;

    positions[i3] = Math.cos(angle) * radius;
    positions[i3 + 1] = height;
    positions[i3 + 2] = Math.sin(angle) * radius;

    velocities[i3] = 0;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
    velocities[i3 + 2] = 0;

    // Gold/cyan color scheme
    const colorChoice = Math.random();
    if (colorChoice < 0.3) {
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.89;
      colors[i3 + 2] = 0.0;
    } else if (colorChoice < 0.7) {
      colors[i3] = 0.0;
      colors[i3 + 1] = 0.9;
      colors[i3 + 2] = 1.0;
    } else {
      colors[i3] = 1.0;
      colors[i3 + 1] = 0.3;
      colors[i3 + 2] = 0.1;
    }

    sizes[i] = Math.random() * 0.3 + 0.1;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setDrawRange(0, particleCount);

  return geometry;
}

export function createMatrixCoreMaterial(options = {}) {
  return new THREE.PointsMaterial({
    color: options.color || 0xFFD700,
    size: options.size || 0.15,
    transparent: true,
    opacity: options.opacity || 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

// Helper: create wireframe geometry with custom shader
export function createWireframeGeometry(geometry, material) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    material
  );
}
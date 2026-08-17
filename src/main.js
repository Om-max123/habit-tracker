// Core Three.js Portfolio Application
// Version 1.0.0 - Main Scene Setup

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { IridescentShader } from './shaders.js';
import { AudioSystem } from './audio.js';
import { createVoidSkull, createKineticStructure, createMatrixCore } from './models/index.js';

class PortfolioApp {
  constructor() {
    this.container = document.getElementById('canvas');
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.currentModel = null;
    this.targetModel = 'void_skull';
    this.models = {};
    this.audioSystem = null;
    this.clock = new THREE.Clock();
    this.stats = {
      tris: 0,
      draws: 0,
      fps: 60,
      lastFrameTime: 0
    };
    this.isAudioEnabled = true;
    this.postProcessing = {
      bloom: true,
      chromaticAberration: true,
      vignette: true,
      renderTargetOne: null,
      renderTargetTwo: null,
      bloomPass: null,
      chromaticPass: null
    };
    this.isFullscreen = false;
    this.mobile = false;
    this.init = this.init.bind(this);
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onModelSelect = this.onModelSelect.bind(this);
    this.onAudioToggle = this.onAudioToggle.bind(this);
    this.updateStats = this.updateStats.bind(this);
  }

  init() {
    this.mobile = this.detectMobile();
    this.setupRenderer();
    this.setupScene();
    this.setupLighting();
    this.loadModels();
    this.setupControls();
    this.setupAudio();
    this.setupPostProcessing();
    this.setupEventListeners();
    this.setupNavigation();
    this.setupParticleSystem();
    this.startAnimation();
  }

  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  setupRenderer() {
    this.container = document.getElementById('canvas');

    // Create WebGL renderer with high performance settings
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
      stencil: false,
      depth: true
    });

    // Configure renderer for best performance
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.sortObjects = false;
    this.renderer.autoClear = false;
    this.renderer.localClippingEnabled = true;

    // Enable shadow map for better visual quality
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Performance monitoring
    this.stats.lastFrameTime = performance.now();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.002);

    // Create scene background with gradient
    const backgroundGeometry = new THREE.PlaneGeometry(2, 2);
    const backgroundMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x0a0a0a) },
        color2: { value: new THREE.Color(0x111111) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;

        void main() {
          float pulse = sin(time * 0.5) * 0.5 + 0.5;
          vec3 color = mix(color1, color2, pulse * vUv.y);
          gl_FragColor = vec4(color, 1.0);
        }
      `,n      side: THREE.DoubleSide
    });

    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    backgroundMesh.position.set(0, 0, -1);
    this.scene.add(backgroundMesh);

    // Camera setup with high quality settings
    const cameraDistance = this.mobile ? 15 : 12;
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      this.mobile ? 100 : 50
    );
    this.camera.position.set(0, 0, cameraDistance);
    this.camera.lookAt(0, 0, 0);
  }

  setupLighting() {
    // Ambient light with color accent
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Main directional light with chromatic properties
    const mainLight = new THREE.DirectionalLight(0x00E5FF, 1.5);
    mainLight.position.set(10, 10, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.fov = 90;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 50;
    this.scene.add(mainLight);

    // Secondary fill light with magenta accent
    const fillLight = new THREE.DirectionalLight(0xFF00FF, 0.8);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    // Rim lighting for depth
    const rimLight = new THREE.PointLight(0xFFD700, 1.0, 30);
    rimLight.position.set(0, 0, -5);
    this.scene.add(rimLight);

    // Environment lighting
    const pointLight = new THREE.PointLight(0x00E5FF, 0.5, 20);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);

    // Add light helpers for debugging (remove in production)
    if (false) {
      const helper = new THREE.DirectionalLightHelper(mainLight, 5);
      this.scene.add(helper);
    }
  }

  async loadModels() {
    try {
      // Show loading screen
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0.5';
      }

      // Load all 3D models asynchronously
      const modelPromises = [
        createVoidSkull().then(model => {
          model.position.set(0, 0, 0);
          model.scale.set(this.mobile ? 3 : 2.5, this.mobile ? 3 : 2.5, this.mobile ? 3 : 2.5);
          return model;
        }),
        createKineticStructure().then(model => {
          model.position.set(0, 0, 0);
          model.scale.set(this.mobile ? 2 : 1.8, this.mobile ? 2 : 1.8, this.mobile ? 2 : 1.8);
          return model;
        }),
        createMatrixCore().then(model => {
          model.position.set(0, 0, 0);
          model.scale.set(this.mobile ? 2.5 : 2, this.mobile ? 2.5 : 2, this.mobile ? 2.5 : 2);
          return model;
        })
      ];

      const models = await Promise.all(modelPromises);

      // Assign models to names
      this.models.void_skull = models[0];
      this.models.kinetic_structure = models[1];
      this.models.matrix_core = models[2];

      // Start with the first model
      this.currentModel = this.models.void_skull;
      this.scene.add(this.currentModel);

      // Hide loading screen after models are loaded
      setTimeout(() => {
        if (loadingScreen) {
          loadingScreen.style.opacity = '0';
          setTimeout(() => {
            loadingScreen.style.display = 'none';
          }, 500);
        }
      }, 1000);

      // Update stats with model info
      this.updateModelStats();

    } catch (error) {
      console.error('Error loading models:', error);
      // Fallback to basic geometry if models fail to load
      this.createFallbackModels();
    }
  }

  createFallbackModels() {
    // Create basic geometries as fallback
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      wireframe: false
    });

    const skull = new THREE.Mesh(geometry, material);
    skull.position.set(0, 0, 0);
    skull.scale.set(2, 2, 2);
    this.models.void_skull = skull;
    this.scene.add(skull);
    this.currentModel = skull;

    // Create kinetic structure wireframe
    const wireframeGeo = new THREE.WireframeGeometry(geometry);
    const wireframeMat = new THREE.LineBasicMaterial({
      color: 0xFF00FF,
      linewidth: 2
    });

    const kinetic = new THREE.LineSegments(wireframeGeo);
    kinetic.position.set(0, 0, 0);
    kinetic.scale.set(1.8, 1.8, 1.8);
    this.models.kinetic_structure = kinetic;

    // Create matrix core points
    const particleCount = 500;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xFFD700,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });

    const matrix = new THREE.Points(particlesGeometry, particlesMaterial);
    matrix.position.set(0, 0, 0);
    this.models.matrix_core = matrix;
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.enableRotate = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.minDistance = this.mobile ? 5 : 3;
    this.controls.maxDistance = this.mobile ? 20 : 15;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.enableKeys = false; // Disable keyboard controls for better UX
  }

  setupAudio() {
    this.audioSystem = new AudioSystem();
    this.audioSystem.init((audioEnabled) => {
      this.isAudioEnabled = audioEnabled;
      this.updateAudioToggleUI();
    });
  }

  setupPostProcessing() {
    // Create render targets for post-processing
    this.postProcessing.renderTargetOne = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    );

    this.postProcessing.renderTargetTwo = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType
      }
    );

    // Create post-processing passes
    this.createPostProcessingPasses();
  }

  createPostProcessingPasses() {
    // Bloom pass
    this.postProcessing.bloomPass = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        brightness: { value: 0.8 },
        threshold: { value: 0.9 },
        radius: { value: 0.5 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float brightness;
        uniform float threshold;
        uniform float radius;
        varying vec2 vUv;

        float luminance(vec3 color) {
          return dot(color, vec3(0.299, 0.587, 0.114));
        }

        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          float l = luminance(texel.rgb);
          float brightness = max(0.0, l - threshold);
          vec3 bloomColor = brightness * vec3(0.5, 1.0, 1.5);
          gl_FragColor = vec4(bloomColor, 1.0);
        }
      `
    });

    // Chromatic aberration pass
    this.postProcessing.chromaticPass = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        amount: { value: 0.005 },
        offset: { value: 0.002 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        uniform float offset;
        varying vec2 vUv;

        void main() {
          vec2 uv = vUv;
          float ch = amount * sin(time * 2.0) * offset;
          vec4 color = texture2D(tDiffuse, uv);

          // RGB shift for chromatic aberration
          vec4 rColor = texture2D(tDiffuse, vec2(uv.x + ch * 0.5, uv.y));
          vec4 gColor = texture2D(tDiffuse, uv);
          vec4 bColor = texture2D(tDiffuse, vec2(uv.x - ch * 0.5, uv.y));

          gl_FragColor = vec4(rColor.r, gColor.g, bColor.b, color.a);
        }
      `
    });
  }

  setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.handleKeyDown.bind(this));

    // Navigation links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.closest('a');
        if (target && target.hash) {
          this.scrollToSection(target.hash);
        }
      });
    });

    // Model selection
    document.getElementById('model-select')?.addEventListener('change', (e) => {
      this.onModelSelect(e.target.value);
    });

    // Audio toggle
    document.getElementById('audio-toggle')?.addEventListener('click', this.onAudioToggle);

    // Iridescence slider
    document.getElementById('iridescence-slider')?.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('iridescence-value').textContent = value.toFixed(2);
      if (this.currentModel) {
        this.applyMaterialProperties(this.currentModel, { iridescence: value });
      }
    });

    // Speed slider
    document.getElementById('speed-slider')?.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      document.getElementById('speed-value').textContent = value.toFixed(1);
      if (this.currentModel) {
        this.applyAnimationSpeed(this.currentModel, value);
      }
    });

    // Post-processing toggles
    document.getElementById('bloom-toggle')?.addEventListener('change', (e) => {
      this.postProcessing.bloom = e.target.checked;
    });

    document.getElementById('chromatic-toggle')?.addEventListener('change', (e) => {
      this.postProcessing.chromaticAberration = e.target.checked;
    });

    document.getElementById('vignette-toggle')?.addEventListener('change', (e) => {
      this.postProcessing.vignette = e.target.checked;
    });

    // Camera reset button
    document.getElementById('reset-camera')?.addEventListener('click', () => {
      this.resetCamera();
    });

    // Auto-rotate toggle
    document.getElementById('auto-rotate-toggle')?.addEventListener('click', () => {
      this.toggleAutoRotate();
    });

    // Work cards click handlers
    document.querySelectorAll('.work-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const work = e.target.dataset.target;
        this.openWorkModal(work);
      });
    });

    // Modal close button
    document.querySelector('.modal-close')?.addEventListener('click', () => {
      this.closeWorkModal();
    });

    // Modal backdrop click
    document.querySelector('.modal-overlay')?.addEventListener('click', () => {
      this.closeWorkModal();
    });

    // Signal form submit
    document.getElementById('signal-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSignalSubmit(e);
    });

    // Signal visualizer
    if (document.getElementById('signal-visualizer')) {
      this.setupSignalVisualizer();
    }
  }

  setupNavigation() {
    // Smooth scroll navigation
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.getAttribute('href');
        this.scrollToSection(target);
      });
    });

    // Highlight active section on scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.updateActiveSection();
      }, 100);
    });
  }

  setupParticleSystem() {
    // Create particle system for background atmosphere
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = (Math.random() - 0.5) * 50;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;

      colors[i3] = Math.random() * 0.5;
      colors[i3 + 1] = Math.random() * 0.5;
      colors[i3 + 2] = Math.random() * 0.5;

      sizes[i] = Math.random() * 0.5 + 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    // Store for animation
    this.particleSystem = particles;
  }

  setupSignalVisualizer() {
    const canvas = document.createElement('canvas');
    const visualizer = document.getElementById('signal-visualizer');
    visualizer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = visualizer.clientWidth;
    canvas.height = visualizer.clientHeight;

    this.signalVisualizer = {
      canvas,
      ctx,
      frequencyData: null,
      analyser: null,
      dataArray: null,
      width: visualizer.clientWidth,
      height: visualizer.clientHeight,
      particles: [],
      maxParticles: 100,
      connectionDistance: 100
    };

    // Setup AudioContext for signal visualization
    this.setupSignalAudioAnalysis();
  }

  setupSignalAudioAnalysis() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioContext.suspend(); // Start suspended
    }

    const source = this.audioContext.createOscillator();
    const analyser = this.audioContext.createAnalyser();
    const gainNode = this.audioContext.createGain();

    source.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    source.type = 'sine';
    source.frequency.setValueAtTime(440, this.audioContext.currentTime);
    source.start();

    this.signalVisualizer.analyser = analyser;
    this.signalVisualizer.dataArray = new Uint8Array(analyser.frequencyBinCount);
    this.signalVisualizer.source = source;
    this.signalVisualizer.gainNode = gainNode;

    this.animateSignalVisualizer = () => {
      if (!this.signalVisualizer || !this.signalVisualizer.analyser) return;

      this.signalVisualizer.analyser.getByteFrequencyData(this.signalVisualizer.dataArray);
      this.updateSignalParticles();
      this.drawSignalVisualizer();
      requestAnimationFrame(this.animateSignalVisualizer);
    };

    if (this.isAudioEnabled) {
      this.audioContext.resume();
      this.animateSignalVisualizer();
    }
  }

  updateSignalParticles() {
    if (!this.signalVisualizer) return;

    const { dataArray, particles, maxParticles, width, height } = this.signalVisualizer;

    // Add new particles based on audio data
    const averageVolume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const particleCount = Math.min(maxParticles, averageVolume / 2);

    for (let i = 0; i < particleCount; i++) {
      if (particles.length < maxParticles) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 255,
          maxLife: 255,
          frequency: dataArray[Math.floor(Math.random() * dataArray.length)] / 255
        });
      }
    }

    // Update existing particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 2;
      p.maxLife -= 1;

      // Wrap around edges
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      // Remove dead particles
      if (p.life <= 0) {
        particles.splice(i, 1);
        i--;
      }
    }
  }

  drawSignalVisualizer() {
    if (!this.signalVisualizer) return;

    const { canvas, ctx, particles, width, height } = this.signalVisualizer;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);

    // Draw particles with connections
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Color based on frequency
      const hue = (p.frequency * 360 + performance.now() * 0.1) % 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.globalAlpha = p.life / 255;

      ctx.beginPath();
      ctx.arc(p.x - width / 2, p.y - height / 2, p.frequency * 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw connections to nearby particles
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.globalAlpha = p.life / 510;
      ctx.lineWidth = 0.5;

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.signalVisualizer.connectionDistance) {
          ctx.beginPath();
          ctx.moveTo(p.x - width / 2, p.y - height / 2);
          ctx.lineTo(p2.x - width / 2, p2.y - height / 2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;
  }

  onModelSelect(modelName) {
    if (this.models[modelName] && this.currentModel !== this.models[modelName]) {
      // Fade out current model
      if (this.currentModel) {
        this.fadeOutModel(this.currentModel);
      }

      // Fade in new model
      setTimeout(() => {
        this.currentModel = this.models[modelName];
        this.scene.add(this.currentModel);
        this.fadeInModel(this.currentModel);

        // Update stats
        this.updateModelStats();
      }, 500);
    }
  }

  onAudioToggle() {
    if (this.isAudioEnabled) {
      this.audioSystem.pause();
      this.isAudioEnabled = false;
    } else {
      this.audioSystem.resume();
      this.isAudioEnabled = true;
    }

    this.updateAudioToggleUI();
  }

  updateAudioToggleUI() {
    const toggle = document.getElementById('audio-toggle');
    if (!toggle) return;

    const soundOn = toggle.querySelector('.icon-sound-on');
    const soundOff = toggle.querySelector('.icon-sound-off');

    if (this.isAudioEnabled) {
      soundOn.style.display = 'block';
      soundOff.style.display = 'none';
      toggle.style.borderColor = 'var(--green)';
    } else {
      soundOn.style.display = 'none';
      soundOff.style.display = 'block';
      toggle.style.borderColor = 'var(--red)';
    }
  }

  fadeOutModel(model) {
    if (!model) return;

    // Animate opacity to 0
    const startOpacity = 1;
    const endOpacity = 0;
    const duration = 500;
    const startTime = performance.now();

    const animateOpacity = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const opacity = startOpacity + (endOpacity - startOpacity) * progress;

      if (model.material) {
        if (Array.isArray(model.material)) {
          model.material.forEach(mat => {
            if (mat.opacity !== undefined) mat.opacity = opacity;
          });
        } else if (model.material.opacity !== undefined) {
          model.material.opacity = opacity;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animateOpacity);
      } else {
        this.scene.remove(model);
      }
    };

    requestAnimationFrame(animateOpacity);
  }

  fadeInModel(model) {
    if (!model) return;

    // Ensure model is visible
    if (model.material) {
      if (Array.isArray(model.material)) {
        model.material.forEach(mat => {
          if (mat.opacity !== undefined) mat.opacity = 0;
        });
      } else if (model.material.opacity !== undefined) {
        model.material.opacity = 0;
      }
    }

    const startOpacity = 0;
    const endOpacity = 1;
    const duration = 800;
    const startTime = performance.now();

    const animateOpacity = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const opacity = startOpacity + (endOpacity - startOpacity) * progress;

      if (model.material) {
        if (Array.isArray(model.material)) {
          model.material.forEach(mat => {
            if (mat.opacity !== undefined) mat.opacity = opacity;
          });
        } else if (model.material.opacity !== undefined) {
          model.material.opacity = opacity;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animateOpacity);
      }
    };

    requestAnimationFrame(animateOpacity);
  }

  applyMaterialProperties(model, properties) {
    if (!model) return;

    if (model.material) {
      if (Array.isArray(model.material)) {
        model.material.forEach(mat => {
          if (mat.iridescence !== undefined) mat.iridescence = properties.iridescence;
        });
      } else if (model.material.iridescence !== undefined) {
        model.material.iridescence = properties.iridescence;
      }
    }
  }

  applyAnimationSpeed(model, speed) {
    if (!model) return;

    // Store animation speed for use in animate method
    if (!model.userData) model.userData = {};
    model.userData.animationSpeed = speed;
  }

  updateModelStats() {
    if (this.currentModel) {
      // Calculate triangle count
      let triCount = 0;
      if (this.currentModel.geometry) {
        triCount = this.currentModel.geometry.attributes.position.count / 3;
      }

      this.stats.tris = triCount;
      this.updateStatsUI();
    }
  }

  updateStatsUI() {
    const trisElement = document.getElementById('stat-tris');
    const drawElement = document.getElementById('stat-draw');
    const fpsElement = document.getElementById('stat-fps');

    if (trisElement) trisElement.textContent = this.stats.tris.toLocaleString();
    if (drawElement) drawElement.textContent = this.stats.draws.toLocaleString();
    if (fpsElement) fpsElement.textContent = this.stats.fps;

    // Update lab stats too
    const labTrisElement = document.getElementById('lab-tris');
    const labFpsElement = document.getElementById('lab-fps');
    const labMemElement = document.getElementById('lab-mem');

    if (labTrisElement) labTrisElement.textContent = this.stats.tris.toLocaleString();
    if (labFpsElement) labFpsElement.textContent = this.stats.fps;
    if (labMemElement) labMemElement.textContent = (this.getMemoryUsage() / 1024 / 1024).toFixed(1) + ' MB';
  }

  getMemoryUsage() {
    // Estimate GPU memory usage
    let memory = 0;
    this.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const geometry = child.geometry;
        if (geometry.attributes.position) {
          memory += geometry.attributes.position.count * 3 * 4; // 4 bytes per position
        }
        if (geometry.attributes.normal) {
          memory += geometry.attributes.normal.count * 3 * 4;
        }
        if (geometry.attributes.uv) {
          memory += geometry.attributes.uv.count * 2 * 4;
        }
      }
    });

    return memory;
  }

  updateStats() {
    const currentTime = performance.now();
    const delta = currentTime - this.stats.lastFrameTime;
    this.stats.lastFrameTime = currentTime;

    // Calculate FPS
    if (delta > 0) {
      this.stats.fps = Math.round(1000 / delta);
    }

    // Update draw calls (simplified - based on number of meshes)
    let drawCalls = 0;
    this.scene.traverse((child) => {
      if (child.isMesh) drawCalls++;
    });
    this.stats.draws = drawCalls;

    // Update materials
    this.scene.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => {
            this.updateMaterialAnimation(material, delta / 1000);
          });
        } else {
          this.updateMaterialAnimation(child.material, delta / 1000);
        }
      }
    });

    // Update particle system
    if (this.particleSystem) {
      this.particleSystem.rotation.y += delta / 5000;
      this.particleSystem.rotation.x += delta / 8000;

      // Animate particle sizes
      const sizes = this.particleSystem.geometry.attributes.size.array;
      for (let i = 0; i < sizes.length; i++) {
        sizes[i] = THREE.MathUtils.lerp(sizes[i], Math.random() * 0.5 + 0.1, delta / 2000);
      }
      this.particleSystem.geometry.attributes.size.needsUpdate = true;
    }

    // Update audio system
    if (this.audioSystem) {
      this.audioSystem.update(delta / 1000);
    }

    // Update orbit controls
    if (this.controls) {
      this.controls.update();
    }

    // Update background shader uniforms
    this.scene.children.forEach(child => {
      if (child.isMesh && child.material && child.material.uniforms) {
        child.material.uniforms.time.value += delta / 1000;
      }
    });
  }

  updateMaterialAnimation(material, delta) {
    if (!material) return;

    // Animate iridescence if present
    if (material.iridescence !== undefined) {
      const targetIridescence = Math.random() * 0.3 + 0.1;
      material.iridescence = THREE.MathUtils.lerp(material.iridescence, targetIridescence, delta * 0.5);
    }

    // Animate roughness for dynamic appearance
    if (material.roughness !== undefined) {
      const targetRoughness = Math.random() * 0.4 + 0.3;
      material.roughness = THREE.MathUtils.lerp(material.roughness, targetRoughness, delta);
    }

    // Animate metalness
    if (material.metalness !== undefined) {
      const targetMetalness = Math.random() * 0.8 + 0.2;
      material.metalness = THREE.MathUtils.lerp(material.metalness, targetMetalness, delta);
    }
  }

  handleKeyDown(event) {
    // Keyboard shortcuts
    switch (event.key.toLowerCase()) {
      case 'r':
        event.preventDefault();
        this.resetCamera();
        break;
      case 'space':
        event.preventDefault();
        this.toggleAutoRotate();
        break;
      case 'f':
        event.preventDefault();
        this.toggleFullscreen();
        break;
    }
  }

  resetCamera() {
    this.controls.reset();
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, 0, this.mobile ? 15 : 12);
  }

  toggleAutoRotate() {
    this.controls.autoRotate = !this.controls.autoRotate;

    const button = document.getElementById('auto-rotate-toggle');
    if (button) {
      if (this.controls.autoRotate) {
        button.textContent = 'AUTO ROTATE: ON';
        button.style.borderColor = 'var(--green)';
      } else {
        button.textContent = 'AUTO ROTATE: OFF';
        button.style.borderColor = 'var(--red)';
      }
    }
  }

  toggleFullscreen() {
    if (!this.isFullscreen) {
      if (this.container.requestFullscreen) {
        this.container.requestFullscreen();
      }
      this.isFullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      this.isFullscreen = false;
    }
  }

  scrollToSection(target) {
    const element = document.querySelector(target);
    if (element) {
      const headerHeight = document.querySelector('.nav').offsetHeight;
      const elementPosition = element.offsetTop - headerHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  }

  updateActiveSection() {
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-links a');

    let current = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (window.pageYOffset >= sectionTop - 100) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  openWorkModal(workName) {
    const modal = document.getElementById('work-modal');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    const viewport = document.getElementById('modal-viewport');

    if (!modal || !title || !desc || !viewport) return;

    title.textContent = workName.toUpperCase().replace('_', '_');
    desc.textContent = this.getWorkDescription(workName);

    // Switch to the selected model in modal
    this.onModelSelect(workName);

    // Show modal with animation
    modal.classList.add('visible');
  }

  closeWorkModal() {
    const modal = document.getElementById('work-modal');
    if (modal) {
      modal.classList.remove('visible');
      // Switch back to void_skull when closing modal
      setTimeout(() => {
        this.onModelSelect('void_skull');
      }, 300);
    }
  }

  getWorkDescription(workName) {
    const descriptions = {
      'void_skull': 'Iridescent liquid metal skull with chromatic aberration shader. Features custom iridescent material with thin-film interference effects.',
      'kinetic_structure': 'Procedural wireframe geometry with audio-reactive morphing. Generates dynamic geometry based on audio input.',
      'matrix_core': 'Cyber command center visualization with particle field. Uses GPU compute for real-time particle simulation.'
    };

    return descriptions[workName] || '';
  }

  handleSignalSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = document.getElementById('transmit-btn');
    const status = document.getElementById('signal-status');

    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Simulate signal transmission
    setTimeout(() => {
      // Hide loading state
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;

      // Show success message
      status.textContent = 'SIGNAL TRANSMITTED • ACK: RECEIVED';
      status.style.color = 'var(--green)';

      // Clear form
      form.reset();

      // Hide status after 3 seconds
      setTimeout(() => {
        status.textContent = '';
      }, 3000);

      // Trigger signal visualizer response
      this.triggerSignalResponse();
    }, 2000);
  }

  triggerSignalResponse() {
    if (this.signalVisualizer && this.signalVisualizer.gainNode) {
      const gainNode = this.signalVisualizer.gainNode;
      const source = this.signalVisualizer.source;

      // Create response signal
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      source.frequency.setValueAtTime(440, now);
      source.frequency.exponentialRampToValueAtTime(880, now + 0.2);
      source.frequency.exponentialRampToValueAtTime(440, now + 0.5);
    }
  }

  startAnimation() {
    // Start animation loop
    this.animate();
  }

  animate() {
    const deltaTime = this.clock.getDelta();

    // Update stats
    this.updateStats();

    // Animate models
    if (this.currentModel) {
      // Apply animation based on model type
      const speed = this.currentModel.userData.animationSpeed || 1;
      this.animateModel(this.currentModel, deltaTime * speed);
    }

    // Apply post-processing if enabled
    if (this.postProcessing.bloom || this.postProcessing.chromaticAberration) {
      this.applyPostProcessing();
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Continue animation loop
    requestAnimationFrame(this.animate);
  }

  animateModel(model, deltaTime) {
    if (!model) return;

    // Apply different animations based on model type
    switch (model.userData.type) {
      case 'void_skull':
        // Rotate with varying speed
        model.rotation.y += deltaTime * (0.5 + Math.sin(performance.now() / 1000) * 0.3);
        model.rotation.x += deltaTime * 0.1;
        break;

      case 'kinetic_structure':
        // Morph geometry
        if (model.geometry) {
          const position = model.geometry.attributes.position.array;
          for (let i = 0; i < position.length; i += 3) {
            position[i] += Math.sin(performance.now() / 1000 + position[i]) * 0.01;
          }
          model.geometry.attributes.position.needsUpdate = true;
        }

        // Rotate wireframe
        model.rotation.y += deltaTime * 0.3;
        break;

      case 'matrix_core':
        // Particle movement
        if (model.geometry && model.geometry.attributes.position) {
          const positions = model.geometry.attributes.position.array;
          for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] += Math.sin(performance.now() / 500 + positions[i]) * 0.02;
          }
          model.geometry.attributes.position.needsUpdate = true;
        }

        // Slow rotation
        model.rotation.y += deltaTime * 0.1;
        break;
    }
  }

  applyPostProcessing() {
    // Apply post-processing effects
    // Note: This is a simplified implementation - full post-processing would require
    // a more sophisticated pipeline with render targets and shader materials

    // Update shader uniforms based on settings
    this.scene.traverse((child) => {
      if (child.isMesh && child.material && child.material.uniforms) {
        if (this.postProcessing.bloom) {
          child.material.uniforms.brightness.value = 0.8;
        }
        if (this.postProcessing.chromaticAberration) {
          child.material.uniforms.amount.value = 0.005;
        }
      }
    });
  }

  onWindowResize() {
    // Handle window resize
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update camera aspect ratio
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Update renderer size
    this.renderer.setSize(width, height);

    // Update post-processing render targets
    if (this.postProcessing.renderTargetOne) {
      this.postProcessing.renderTargetOne.setSize(width, height);
    }
    if (this.postProcessing.renderTargetTwo) {
      this.postProcessing.renderTargetTwo.setSize(width, height);
    }

    // Update signal visualizer if present
    if (this.signalVisualizer) {
      this.signalVisualizer.width = width;
      this.signalVisualizer.height = height;
      this.signalVisualizer.canvas.width = width;
      this.signalVisualizer.canvas.height = height;
    }
  }

  // Clean up resources
  dispose() {
    // Clean up Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }

    if (this.controls) {
      this.controls.dispose();
    }

    // Dispose models
    Object.values(this.models).forEach(model => {
      if (model) {
        if (model.geometry) {
          model.geometry.dispose();
        }
        if (model.material) {
          if (Array.isArray(model.material)) {
            model.material.forEach(material => material.dispose());
          } else {
            model.material.dispose();
          }
        }
      }
    });

    // Dispose post-processing resources
    if (this.postProcessing.renderTargetOne) {
      this.postProcessing.renderTargetOne.dispose();
    }
    if (this.postProcessing.renderTargetTwo) {
      this.postProcessing.renderTargetTwo.dispose();
    }

    // Dispose audio system
    if (this.audioSystem) {
      this.audioSystem.dispose();
    }

    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}

// Initialize app when DOM is ready
function initApp() {
  // Wait for Three.js to be loaded
  if (typeof THREE === 'undefined') {
    setTimeout(initApp, 100);
    return;
  }

  // Initialize the application
  const app = new PortfolioApp();
  app.init();

  // Make app globally accessible for debugging
  window.portfolioApp = app;

  // Handle page visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Pause animations when tab is hidden
      if (app.audioSystem) {
        app.audioSystem.pause();
      }
    } else {
      // Resume animations when tab is visible
      if (app.audioSystem) {
        app.audioSystem.resume();
      }
    }
  });

  // Handle beforeunload to clean up
  window.addEventListener('beforeunload', () => {
    if (app) {
      app.dispose();
    }
  });
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Error handling
window.addEventListener('error', (event) => {
  console.error('Application error:', event.error);
  // Show user-friendly error message
  const errorScreen = document.getElementById('error-screen');
  if (errorScreen) {
    errorScreen.style.display = 'flex';
    errorScreen.querySelector('.error-message').textContent = event.error.message;
  }
});

console.log('Portfolio 3D Application Initialized');
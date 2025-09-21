import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import textureVertexSimulationShader from '../shaders/textureVertexSimulationShader';
import textureFragmentSimulationShader from '../shaders/textureFragmentSimulationShader';
import vsParticles from '../shaders/vsParticles';
import fsParticles from '../shaders/fsParticles';
// import fsParticlesShadow from '../shaders/fsParticlesShadow';

// 模拟原项目中的 Detector 功能
const Detector = {
  webgl: (() => {
    try {
      return !!(window.WebGLRenderingContext && document.createElement('canvas').getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  })()
};

// 模拟原项目中的 isMobile 功能
const isMobile = {
  any: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
};

// 模拟 FBOHelper 类
class FBOHelper {
  constructor(renderer) { this.renderer = renderer; }
  show() {}
  setSize() {}
  attach() {}
  update() {}
}

// Simulation 类（已修改 Ping-Pong RenderTarget）
class Simulation {
  constructor(renderer, width, height) {
    this.width = width;
    this.height = height;
    this.renderer = renderer;
    this.targetPos = 0;

    // Initialize particle data
    this.data = new Float32Array(this.width * this.height * 4);
    for (let i = 0; i < this.width * this.height; i++) {
      const phi = Math.random() * 2 * Math.PI;
      const costheta = Math.random() * 2 - 1;
      const theta = Math.acos(costheta);
      const r = 0.85 + 0.15 * Math.random();

      this.data[i * 4] = r * Math.sin(theta) * Math.cos(phi);
      this.data[i * 4 + 1] = r * Math.sin(theta) * Math.sin(phi);
      this.data[i * 4 + 2] = r * Math.cos(theta);
      this.data[i * 4 + 3] = Math.random() * 100;
    }

    const floatType = THREE.FloatType;

    // DataTexture for initialization
    this.texture = new THREE.DataTexture(this.data, this.width, this.height, THREE.RGBAFormat, floatType);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true;

    // Immutable Render Targets
    this.rtTexturePos1 = new THREE.WebGLRenderTarget(this.width, this.height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: floatType,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false
    });

    this.rtTexturePos2 = new THREE.WebGLRenderTarget(this.width, this.height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: floatType,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false
    });

    this.targets = [this.rtTexturePos1, this.rtTexturePos2];

    // Simulation shader
    this.simulationShader = new THREE.ShaderMaterial({
      uniforms: {
        active: { value: 1 },
        width: { value: this.width },
        height: { value: this.height },
        oPositions: { value: this.texture },
        tPositions: { value: this.texture },
        timer: { value: 0 },
        delta: { value: 0 },
        speed: { value: 0.5 },
        reset: { value: 0 },
        offset: { value: new THREE.Vector3(0, 0, 0) },
        genScale: { value: 1 },
        factor: { value: 0.5 },
        evolution: { value: 0.5 },
        inverseModelViewMatrix: { value: new THREE.Matrix4() },
        radius: { value: 2 }
      },
      vertexShader: textureVertexSimulationShader,
      fragmentShader: textureFragmentSimulationShader,
      side: THREE.DoubleSide
    });

    // Initialize scene and orthographic camera
    this.rtScene = new THREE.Scene();
    this.rtCamera = new THREE.OrthographicCamera(
      -this.width / 2, this.width / 2,
      -this.height / 2, this.height / 2,
      -500, 1000
    );
    this.rtQuad = new THREE.Mesh(new THREE.PlaneGeometry(this.width, this.height), this.simulationShader);
    this.rtScene.add(this.rtQuad);

    // Initial render
    this.renderer.setRenderTarget(this.targets[this.targetPos]);
    this.renderer.render(this.rtScene, this.rtCamera);
    this.renderer.setRenderTarget(null);
  }

  // 修改Simulation类中的render方法
  render(time, delta) {
    this.simulationShader.uniforms.timer.value = time;
    this.simulationShader.uniforms.delta.value = delta;
  
    // Update texture uniform
    this.simulationShader.uniforms.tPositions.value = this.targets[this.targetPos].texture;
  
    const nextTarget = 1 - this.targetPos;
    this.renderer.setRenderTarget(this.targets[nextTarget]);
    this.renderer.render(this.rtScene, this.rtCamera);
    this.renderer.setRenderTarget(null);
  
    this.targetPos = nextTarget;
  }
  
  // 同时添加一个方法来处理窗口大小变化时的情况
  resize(width, height) {
    // 不要尝试修改现有纹理尺寸，而是创建新的渲染目标
    this.width = width;
    this.height = height;
    
    // 重新创建渲染目标
    const floatType = THREE.FloatType;
    this.rtTexturePos1.dispose();
    this.rtTexturePos2.dispose();
  
    this.rtTexturePos1 = new THREE.WebGLRenderTarget(this.width, this.height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: floatType,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false
    });
  
    this.rtTexturePos2 = new THREE.WebGLRenderTarget(this.width, this.height, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: floatType,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false
    });
    
    this.targets = [this.rtTexturePos1, this.rtTexturePos2];
    
    // 更新相机和几何体
    this.rtCamera.left = -this.width / 2;
    this.rtCamera.right = this.width / 2;
    this.rtCamera.top = -this.height / 2;
    this.rtCamera.bottom = this.height / 2;
    this.rtCamera.updateProjectionMatrix();
    
    this.rtQuad.scale.set(this.width, this.height, 1);
    
    // 重新初始化
    this.renderer.setRenderTarget(this.targets[this.targetPos]);
    this.renderer.render(this.rtScene, this.rtCamera);
    this.renderer.setRenderTarget(null);
  }

  get currentTexture() {
    return this.targets[this.targetPos].texture;
  }
}

const PolygonShredder = () => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!Detector.webgl) {
      alert('Your browser does not support WebGL');
      setIsLoading(false);
      return;
    }

    const size = isMobile.any ? 32 : 256;
    const container = containerRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x202020);
    container.appendChild(renderer.domElement);

    const helper = new FBOHelper(renderer);
    helper.show(false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.z = 8;
    scene.add(camera);

    const controls = new OrbitControls(camera, renderer.domElement);

    const sim = new Simulation(renderer, size, size);
    helper.attach(sim.currentTexture, 'Positions');

    // 创建粒子 Mesh
    const geometry = new THREE.BufferGeometry();
    const positionsLength = sim.width * sim.height * 3 * 18;
    const positions = new Float32Array(positionsLength);
    let p = 0;
    for (let j = 0; j < positionsLength; j += 3) {
      positions[j] = p;
      positions[j + 1] = Math.floor(p / 18);
      positions[j + 2] = p % 18;
      p++;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const colors = [
      0xed6a5a,0xf4f1bb,0x9bc1bc,0x5ca4a9,0xe6ebe0,0xf0b67f,0xfe5f55,0xd6d1b1,
      0xc7efcf,0xeef5db,0x50514f,0xf25f5c,0xffe066,0x247ba0,0x70c1b3
    ];

    const diffuseData = new Uint8Array(sim.width * sim.height * 4);
    for (let j = 0; j < sim.width * sim.height * 4; j += 4) {
      const c = new THREE.Color(colors[~~(Math.random() * colors.length)]);
      diffuseData[j + 0] = c.r * 255;
      diffuseData[j + 1] = c.g * 255;
      diffuseData[j + 2] = c.b * 255;
    }
    const diffuseTexture = new THREE.DataTexture(diffuseData, sim.width, sim.height, THREE.RGBAFormat);
    diffuseTexture.minFilter = THREE.NearestFilter;
    diffuseTexture.magFilter = THREE.NearestFilter;
    diffuseTexture.needsUpdate = true;

    // 粒子材质
    const material = new THREE.RawShaderMaterial({
      uniforms: {
        map: { value: sim.currentTexture },
        prevMap: { value: sim.targets[1 - sim.targetPos].texture },
        width: { value: sim.width },
        height: { value: sim.height },
        timer: { value: 0 },
        spread: { value: 4 },
        boxScale: { value: new THREE.Vector3(1, 1, 1) },
        meshScale: { value: 1 }
      },
      vertexShader: vsParticles,
      fragmentShader: fsParticles,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const t = new THREE.Clock();
    const animate = () => {
      requestAnimationFrame(animate);

      const delta = t.getDelta() * 10;
      const time = t.elapsedTime;

      if (sim.simulationShader.uniforms.active.value) {
        sim.render(time, delta);
      }

      material.uniforms.map.value = sim.currentTexture;
      material.uniforms.prevMap.value = sim.targets[1 - sim.targetPos].texture;
      material.uniforms.timer.value = time;

      renderer.setClearColor(0x202020);
      renderer.render(scene, camera);

      helper.update();
    };

    animate();
    setIsLoading(false);

    return () => {
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {isLoading && <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', color: 'white', fontSize: '20px'
      }}>Loading...</div>}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
};

export default PolygonShredder;

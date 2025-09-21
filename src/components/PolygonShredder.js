import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import textureVertexSimulationShader from '../shaders/textureVertexSimulationShader';
import textureFragmentSimulationShader from '../shaders/textureFragmentSimulationShader';
import vsParticles from '../shaders/vsParticles';
import fsParticles from '../shaders/fsParticles';
// import fsParticlesShadow from '../shaders/fsParticlesShadow';

// 实现简单的FBOHelper模拟类
 class FBOHelper {
  constructor(renderer) {
    this.renderer = renderer;
    this.visible = false;
  }
  
  show(visible) {
    this.visible = visible;
  }
  
  attach(texture, label) {
    // 模拟附加纹理的行为
  }
  
  update() {
    // 模拟更新行为
  }
}

// Add at the top of the file
const THREE_VERSION = parseFloat(THREE.REVISION);
const IS_THREE_180_OR_NEWER = THREE_VERSION >= 180;

// Update Simulation constructor with version-specific handling
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

    // Version-specific render target options
    const renderTargetOptions = {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: floatType,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false
    };
    
    // For Three.js 0.180.0+, add these properties
    if (IS_THREE_180_OR_NEWER) {
      renderTargetOptions.depthTexture = null;
    }
    
    // Create render targets
    this.rtTexturePos1 = new THREE.WebGLRenderTarget(this.width, this.height, renderTargetOptions);
    this.rtTexturePos2 = new THREE.WebGLRenderTarget(this.width, this.height, renderTargetOptions);

    this.targets = [this.rtTexturePos1, this.rtTexturePos2];

    // Simulation shader
    this.simulationShader = new THREE.ShaderMaterial({
      uniforms: {
        active: { value: 1 },
        width: { value: this.width },
        height: { value: this.height },
        oPositions: { value: this.targets[this.targetPos].texture },
        tPositions: { value: this.targets[this.targetPos].texture },
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

    // Initial render - 修复：确保首次渲染正确处理不可变纹理
    this.renderer.setRenderTarget(this.targets[this.targetPos]);
    this.renderer.render(this.rtScene, this.rtCamera);
    this.renderer.setRenderTarget(null);
  }

  // Add getter for currentTexture property
  get currentTexture() {
    return this.targets[this.targetPos].texture;
  }

  render(time, delta) {
    this.simulationShader.uniforms.timer.value = time;
    this.simulationShader.uniforms.delta.value = delta;
    
    // CRITICAL FIX: Update texture reference BEFORE setting render target
    this.simulationShader.uniforms.tPositions.value = this.targets[this.targetPos].texture;

    const nextTarget = 1 - this.targetPos;
    this.renderer.setRenderTarget(this.targets[nextTarget]);
    this.renderer.render(this.rtScene, this.rtCamera);
    this.renderer.setRenderTarget(null);

    this.targetPos = nextTarget;
  }

  // Fix resize method to properly dispose resources
  resize(width, height) {
    this.width = width;
    this.height = height;
    
    // CRITICAL FIX: Dispose old render targets before creating new ones
    if (this.rtTexturePos1) this.rtTexturePos1.dispose();
    if (this.rtTexturePos2) this.rtTexturePos2.dispose();
    
    // Use proper render target options for Three.js 0.180.0+
    const floatType = THREE.FloatType;
    const renderTargetOptions = {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: floatType,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false,
      depthTexture: null // Explicitly set to null
    };
    
    // Create new render targets
    this.rtTexturePos1 = new THREE.WebGLRenderTarget(this.width, this.height, renderTargetOptions);
    this.rtTexturePos2 = new THREE.WebGLRenderTarget(this.width, this.height, renderTargetOptions);
    this.targets = [this.rtTexturePos1, this.rtTexturePos2];
    
    // 更新相机和几何体
    this.rtCamera.left = -this.width / 2;
    this.rtCamera.right = this.width / 2;
    this.rtCamera.top = this.height / 2;  // 修正这里的符号
    this.rtCamera.bottom = -this.height / 2;  // 修正这里的符号
    this.rtCamera.updateProjectionMatrix();
    
    this.rtQuad.scale.set(this.width, this.height, 1);
    
    // 重新初始化
    this.renderer.setRenderTarget(this.targets[this.targetPos]);
    this.renderer.render(this.rtScene, this.rtCamera);
    this.renderer.setRenderTarget(null);
  }
}

const PolygonShredder = () => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!window.WebGLRenderingContext) {
      alert('Your browser does not support WebGL');
      setIsLoading(false);
      return;
    }

    const size = window.innerWidth <= 768 ? 32 : 256;
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
    // 修改材质uniforms初始化
    const material = new THREE.RawShaderMaterial({
      uniforms: {
        map: { value: sim.currentTexture },
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
    // 在animate函数中添加controls.update()调用
    const animate = () => {
      requestAnimationFrame(animate);
    
      const delta = t.getDelta() * 10;
      const time = t.elapsedTime;
    
      if (sim.simulationShader.uniforms.active.value) {
        sim.render(time, delta);
        // Already handled in the render method
        // sim.updateTextureReferences();
      }
    
      // CRITICAL FIX: Only update uniforms that need changing
      // Avoid directly accessing targets array to prevent feedback loops
      material.uniforms.map.value = sim.currentTexture;
      material.uniforms.timer.value = time;
      material.uniforms.prevMap.value = sim.targets[1 - sim.targetPos].texture;
      material.uniforms.timer.value = time;
    
      controls.update();
    
      renderer.setClearColor(0x202020);
      renderer.render(scene, camera);
    
      helper.update();
    };

    // 添加窗口大小调整事件处理
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      // 更新渲染器大小
      renderer.setSize(newWidth, newHeight);
      
      // 更新相机宽高比
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      
      // 注意：这里不应该直接修改sim的尺寸，因为这会触发resize方法
      // 而resize方法会重新创建不可变纹理
      // 如果需要改变粒子系统分辨率，应该重新创建整个Simulation实例
    };
    
    // 添加事件监听器
    window.addEventListener('resize', handleResize);
    
    animate();
    setIsLoading(false);

    // 组件卸载时清理
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      // 显式释放WebGLRenderTarget资源
      if (sim) {
        sim.rtTexturePos1.dispose();
        sim.rtTexturePos2.dispose();
      }
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


import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import textureVertexSimulationShader from '../shaders/textureVertexSimulationShader';
import textureFragmentSimulationShader from '../shaders/textureFragmentSimulationShader';
import vsParticles from '../shaders/vsParticles';
import fsParticles from '../shaders/fsParticles';
import fsParticlesShadow from '../shaders/fsParticlesShadow';

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
  constructor(renderer) {
    this.renderer = renderer;
  }
  show(show) { /* 实现简化版 */ }
  setSize(width, height) { /* 实现简化版 */ }
  attach(texture, name) { /* 实现简化版 */ }
  update() { /* 实现简化版 */ }
}

// 模拟原项目中的 Simulation 类
// class Simulation {
//   constructor(renderer, width, height) {
//     this.width = width;
//     this.height = height;
//     this.renderer = renderer;
//     this.targetPos = 0;
    
//     this.data = new Float32Array(this.width * this.height * 4);
    
//     // 初始化粒子数据
//     var r = 1;
//     for (var i = 0, l = this.width * this.height; i < l; i++) {
//       var phi = Math.random() * 2 * Math.PI;
//       var costheta = Math.random() * 2 - 1;
//       var theta = Math.acos(costheta);
//       r = 0.85 + 0.15 * Math.random();

//       this.data[i * 4] = r * Math.sin(theta) * Math.cos(phi);
//       this.data[i * 4 + 1] = r * Math.sin(theta) * Math.sin(phi);
//       this.data[i * 4 + 2] = r * Math.cos(theta);
//       this.data[i * 4 + 3] = Math.random() * 100; // frames life
//     }

//     var floatType = isMobile.apple ? THREE.HalfFloatType : THREE.FloatType;

//     this.texture = new THREE.DataTexture(this.data, this.width, this.height, THREE.RGBAFormat, THREE.FloatType);
//     this.texture.minFilter = THREE.NearestFilter;
//     this.texture.magFilter = THREE.NearestFilter;
//     this.texture.needsUpdate = true;

//     this.rtTexturePos = new THREE.WebGLRenderTarget(this.width, this.height, {
//       wrapS: THREE.ClampToEdgeWrapping,
//       wrapT: THREE.ClampToEdgeWrapping,
//       minFilter: THREE.NearestFilter,
//       magFilter: THREE.NearestFilter,
//       format: THREE.RGBAFormat,
//       type: floatType,
//       stencilBuffer: false,
//       depthBuffer: false,
//       generateMipmaps: false
//     });

//     this.targets = [this.rtTexturePos, this.rtTexturePos.clone()];

//     this.simulationShader = new THREE.ShaderMaterial({
//       uniforms: {
//         active: { type: 'f', value: 1 },
//         width: { type: 'f', value: this.width },
//         height: { type: 'f', value: this.height },
//         oPositions: { type: 't', value: this.texture },
//         tPositions: { type: 't', value: null },
//         timer: { type: 'f', value: 0 },
//         delta: { type: 'f', value: 0 },
//         speed: { type: 'f', value: 0.5 },
//         reset: { type: 'f', value: 0 },
//         offset: { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
//         genScale: { type: 'f', value: 1 },
//         factor: { type: 'f', value: 0.5 },
//         evolution: { type: 'f', value: 0.5 },
//         inverseModelViewMatrix: { type: 'm4', value: new THREE.Matrix4() },
//         radius: { type: 'f', value: 2 }
//       },
//       vertexShader: textureVertexSimulationShader,
//       fragmentShader: textureFragmentSimulationShader,
//       side: THREE.DoubleSide
//     });

//     this.simulationShader.uniforms.tPositions.value = this.texture;

//     this.rtScene = new THREE.Scene();
//     this.rtCamera = new THREE.OrthographicCamera(-this.width / 2, this.width / 2, -this.height / 2, this.height / 2, -500, 1000);
//     this.rtQuad = new THREE.Mesh(
//       new THREE.PlaneGeometry(this.width, this.height),
//       this.simulationShader
//     );
//     this.rtScene.add(this.rtQuad);

//     this.renderer.render(this.rtScene, this.rtCamera, this.rtTexturePos);
//   }

//   render(time, delta) {
//     this.simulationShader.uniforms.timer.value = time;
//     this.simulationShader.uniforms.delta.value = delta;

//     this.simulationShader.uniforms.tPositions.value = this.targets[this.targetPos];
//     this.targetPos = 1 - this.targetPos;
//     this.renderer.render(this.rtScene, this.rtCamera, this.targets[this.targetPos]);
//   }
// }

class Simulation {
  constructor(renderer, width, height) {
    this.width = width;
    this.height = height;
    this.renderer = renderer;
    this.targetPos = 0;

    // 初始化粒子数据
    this.data = new Float32Array(this.width * this.height * 4);
    for (let i = 0; i < this.width * this.height; i++) {
      const phi = Math.random() * 2 * Math.PI;
      const costheta = Math.random() * 2 - 1;
      const theta = Math.acos(costheta);
      const r = 0.85 + 0.15 * Math.random();

      this.data[i * 4] = r * Math.sin(theta) * Math.cos(phi);
      this.data[i * 4 + 1] = r * Math.sin(theta) * Math.sin(phi);
      this.data[i * 4 + 2] = r * Math.cos(theta);
      this.data[i * 4 + 3] = Math.random() * 100; // frames life
    }

    const floatType = THREE.FloatType;

    // DataTexture 仅用作初始输入
    this.texture = new THREE.DataTexture(this.data, this.width, this.height, THREE.RGBAFormat, floatType);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true;

    // 创建两个独立的 RenderTarget 用于 ping-pong 渲染
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
        tPositions: { value: this.texture }, // 初始输入
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

    // 初始化场景和正交相机
    this.rtScene = new THREE.Scene();
    this.rtCamera = new THREE.OrthographicCamera(
      -this.width / 2, this.width / 2,
      -this.height / 2, this.height / 2,
      -500, 1000
    );
    this.rtQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width, this.height),
      this.simulationShader
    );
    this.rtScene.add(this.rtQuad);

    // 首次渲染到第一个 RenderTarget
    this.renderer.setRenderTarget(this.targets[this.targetPos]);
    this.renderer.render(this.rtScene, this.rtCamera);
    this.renderer.setRenderTarget(null);
  }

  render(time, delta) {
    this.simulationShader.uniforms.timer.value = time;
    this.simulationShader.uniforms.delta.value = delta;

    // 将当前 RenderTarget 的纹理作为输入
    this.simulationShader.uniforms.tPositions.value = this.targets[this.targetPos].texture;

    // 切换 RenderTarget
    const nextTarget = 1 - this.targetPos;
    this.renderer.setRenderTarget(this.targets[nextTarget]);
    this.renderer.render(this.rtScene, this.rtCamera);
    this.renderer.setRenderTarget(null);

    // 更新索引
    this.targetPos = nextTarget;
  }

  get currentTexture() {
    return this.targets[this.targetPos].texture;
  }
}



const PolygonShredder = () => {
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 在组件挂载时初始化 THREE.js
  useEffect(() => {
    if (!Detector.webgl) {
      alert('Your browser does not support WebGL');
      setIsLoading(false);
      return;
    }
  
    let size = isMobile.any ? 32 : 256;
    
    // 初始化 THREE.js 场景
    let container = containerRef.current;
    let renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x202020);
    // 在渲染器附加到DOM后再尝试获取上下文
    container.appendChild(renderer.domElement);
    
    // 初始化helper变量
    let helper = new FBOHelper(renderer);
    helper.show(false);
  
    let scene = new THREE.Scene();
    let plane = new THREE.Mesh(new THREE.PlaneGeometry(10000, 10000), new THREE.MeshNormalMaterial({ side: THREE.DoubleSide, visible: true }));
    plane.material.visible = false;
    scene.add(plane);
  
    let camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    scene.add(camera);
    camera.position.z = 8;
  
    let s = 15;
    let shadowCamera = new THREE.OrthographicCamera(-s, s, s, -s, 0.1, 20);
    shadowCamera.position.set(10, 4, 10);
    shadowCamera.lookAt(scene.position);
  
    let light = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 1, 36), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    light.position.copy(shadowCamera.position);
    scene.add(light);
    light.lookAt(scene.position);
    light.rotation.y += Math.PI / 2;
    light.rotation.z += Math.PI / 2;
  
    let encasing = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 6.1, 0.9, 36), new THREE.MeshBasicMaterial({ color: 0x101010 }));
    encasing.position.copy(shadowCamera.position);
    scene.add(encasing);
    encasing.lookAt(scene.position);
    encasing.rotation.y += Math.PI / 2;
    encasing.rotation.z += Math.PI / 2;
  
    let controls = new OrbitControls(camera, renderer.domElement);
  
    let sim = new Simulation(renderer, size, size);
    helper.attach(sim.rtTexturePos1, 'Positions');
  
    // 使用安全方式获取WebGL上下文并初始化shadowBufferSize
    let gl = renderer.getContext();
    let shadowBufferSize = isMobile.any ? 1024 : 2048;
    if (gl) {
      shadowBufferSize = Math.min(shadowBufferSize, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    }
    
    let shadowBuffer = new THREE.WebGLRenderTarget(shadowBufferSize, shadowBufferSize, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: isMobile.any ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter,
      magFilter: isMobile.any ? THREE.NearestFilter : THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
    helper.attach(shadowBuffer, 'Shadow');
  
    let geometry = new THREE.BufferGeometry();
    let positionsLength = sim.width * sim.height * 3 * 18;
    let positions = new Float32Array(positionsLength);
  
    let p = 0;
    for (let j = 0; j < positionsLength; j += 3) {
      positions[j] = p;
      positions[j + 1] = Math.floor(p / 18);
      positions[j + 2] = p % 18;
      p++;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // 颜色数组
    let colors = [
      0xed6a5a,
      0xf4f1bb,
      0x9bc1bc,
      0x5ca4a9,
      0xe6ebe0,
      0xf0b67f,
      0xfe5f55,
      0xd6d1b1,
      0xc7efcf,
      0xeef5db,
      0x50514f,
      0xf25f5c,
      0xffe066,
      0x247ba0,
      0x70c1b3
    ];

    let diffuseData = new Uint8Array(sim.width * sim.height * 4);
    for (let j = 0; j < sim.width * sim.height * 4; j += 4) {
      let c = new THREE.Color(colors[~~(Math.random() * colors.length)]);
      diffuseData[j + 0] = c.r * 255;
      diffuseData[j + 1] = c.g * 255;
      diffuseData[j + 2] = c.b * 255;
    }

    let diffuseTexture = new THREE.DataTexture(diffuseData, sim.width, sim.height, THREE.RGBAFormat);
    diffuseTexture.minFilter = THREE.NearestFilter;
    diffuseTexture.magFilter = THREE.NearestFilter;
    diffuseTexture.needsUpdate = true;

    // 加载纹理
    let projectorTexture = null;
    let texLoader = new THREE.TextureLoader();
    texLoader.load('/spotlight.jpg', function (res) {
      projectorTexture = res;
    });

    // 定义 boxVertices 和 boxNormals 数组
    let boxVertices = [
        -1,-1,-1,
  -1,-1, 1,
  -1, 1, 1,

  -1,-1,-1,
  -1, 1, 1,
  -1, 1,-1,

  1, 1,-1,
  1,-1,-1,
  -1,-1,-1,

  1, 1,-1,
  -1,-1,-1,
  -1, 1,-1,

  1,-1, 1,
  -1,-1, 1,
  -1,-1,-1,

  1,-1, 1,
  -1,-1,-1,
  1,-1,-1,

  1, 1, 1,
  1,-1, 1,
  1,-1,-1,

  1, 1,-1,
  1, 1, 1,
  1,-1,-1,

  -1,-1, 1,
  1,-1, 1,
  1, 1, 1,

  -1, 1, 1,
  -1,-1, 1,
  1, 1, 1,

  -1, 1,-1,
  -1, 1, 1,
  1, 1, 1,

  1, 1,-1,
  -1, 1,-1,
  1, 1, 1
    ];

    let boxNormals = [
       1, 0, 0,
  0, 0, 1,
  0, 1, 0,

  -1, 0, 0,
  0, 0, -1,
  0, -1, 0
    ];

    let material = new THREE.RawShaderMaterial({
      uniforms: {
        map: { type: 't', value: sim.rtTexturePos1.texture },
        prevMap: { type: 't', value: sim.rtTexturePos2.texture },
        width: { type: 'f', value: sim.width },
        height: { type: 'f', value: sim.height },
        timer: { type: 'f', value: 0 },
        spread: { type: 'f', value: 4 },
        boxScale: { type: 'v3', value: new THREE.Vector3() },
        meshScale: { type: 'f', value: 1 },
        depthTexture: { type: 't', value: shadowBuffer },
        shadowV: { type: 'm4', value: new THREE.Matrix4() },
        shadowP: { type: 'm4', value: new THREE.Matrix4() },
        resolution: { type: 'v2', value: new THREE.Vector2(shadowBufferSize, shadowBufferSize) },
        lightPosition: { type: 'v3', value: new THREE.Vector3() },
        projector: { type: 't', value: projectorTexture },
        boxVertices: { type: '3fv', value: boxVertices },
        boxNormals: { type: '3fv', value: boxNormals }
      },
      vertexShader: vsParticles,
      fragmentShader: fsParticles,
      side: THREE.DoubleSide
      // 移除了不支持的flatShading属性
    });

    let shadowMaterial = new THREE.RawShaderMaterial({
      uniforms: {
        map: { type: 't', value: sim.rtTexturePos },
        prevMap: { type: 't', value: sim.rtTexturePos },
        width: { type: 'f', value: sim.width },
        height: { type: 'f', value: sim.height },
        timer: { type: 'f', value: 0 },
        boxScale: { type: 'v3', value: new THREE.Vector3() },
        meshScale: { type: 'f', value: 1 },
        shadowV: { type: 'm4', value: new THREE.Matrix4() },
        shadowP: { type: 'm4', value: new THREE.Matrix4() },
        resolution: { type: 'v2', value: new THREE.Vector2(shadowBufferSize, shadowBufferSize) },
        lightPosition: { type: 'v3', value: new THREE.Vector3() },
        projector: { type: 't', value: projectorTexture },
        boxVertices: { type: '3fv', value: boxVertices },
        boxNormals: { type: '3fv', value: boxNormals }
      },
      vertexShader: vsParticles,
      fragmentShader: fsParticlesShadow,
      side: THREE.DoubleSide
      // 移除了不支持的flatShading属性
    });

    let mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let proxy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), new THREE.MeshNormalMaterial());
    proxy.material.visible = false;

    // 事件处理和状态变量
    let scale = 0, nScale = 1;
    let params = {
      type: 2,
      spread: 4,
      factor: 0.5,
      evolution: 0.5,
      rotation: 0.5,
      radius: 2,
      pulsate: false,
      scaleX: 0.1,
      scaleY: 1,
      scaleZ: 5,
      scale: 1
    };

    let mouse = new THREE.Vector2();
    let nOffset = new THREE.Vector3(0, 0, 0);
    let tmpVector = new THREE.Vector3(0, 0, 0);
    let raycaster = new THREE.Raycaster();

    // 窗口大小调整处理
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      helper.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    // 鼠标和触摸事件处理
    const onMouseMove = (e) => {
      mouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1;
      mouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1;
    };

    const onTouchMove = (e) => {
      mouse.x = (e.touches[0].clientX / renderer.domElement.clientWidth) * 2 - 1;
      mouse.y = -(e.touches[0].clientY / renderer.domElement.clientHeight) * 2 + 1;
    };

    const onMouseDown = () => {
      nScale = 2;
    };

    const onMouseUp = () => {
      nScale = 0.5;
    };

    const onKeyDown = (e) => {
      if (e.keyCode === 32) {
        sim.simulationShader.uniforms.active.value = 1 - sim.simulationShader.uniforms.active.value;
      }
    };

    window.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('touchmove', onTouchMove, false);
    window.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mouseup', onMouseUp, false);
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('touchmove', onTouchMove, false);

    // 渲染循环
    let t = new THREE.Clock();
    let m = new THREE.Matrix4();
    let v = new THREE.Vector3();

    const animate = () => {
      requestAnimationFrame(animate);
      render();
    };

    const render = () => {
      controls.update();
      scale += (nScale - scale) * 0.01;
      plane.lookAt(camera.position);

      raycaster.setFromCamera(mouse, camera);
      let intersects = raycaster.intersectObject(plane);

      if (intersects.length) {
        nOffset.copy(intersects[0].point);
        proxy.position.copy(nOffset);
      }

      let delta = t.getDelta() * 10;
      let time = t.elapsedTime;

      tmpVector.copy(nOffset);
      tmpVector.sub(sim.simulationShader.uniforms.offset.value);
      tmpVector.multiplyScalar(0.1);
      sim.simulationShader.uniforms.offset.value.add(tmpVector);
      sim.simulationShader.uniforms.factor.value = params.factor;
      sim.simulationShader.uniforms.evolution.value = params.evolution;
      sim.simulationShader.uniforms.radius.value = params.pulsate ? (0.5 + 0.5 * Math.cos(time)) * params.radius : params.radius;

      if (sim.simulationShader.uniforms.active.value) {
        mesh.rotation.y = params.rotation * time;
      }

      // 修改前
      m.copy(mesh.matrixWorld);
sim.simulationShader.uniforms.inverseModelViewMatrix.value.copy(m).invert();
sim.simulationShader.uniforms.genScale.value = scale;

      if (sim.simulationShader.uniforms.active.value === 1) {
        sim.render(time, delta);
      }
      material.uniforms.map.value = shadowMaterial.uniforms.map.value = sim.targets[sim.targetPos].texture;
      material.uniforms.prevMap.value = shadowMaterial.uniforms.prevMap.value = sim.targets[1 - sim.targetPos].texture;

      material.uniforms.spread.value = params.spread;
      material.uniforms.timer.value = shadowMaterial.uniforms.timer.value = time;
      material.uniforms.boxScale.value.set(params.scaleX, params.scaleY, params.scaleZ);
      shadowMaterial.uniforms.boxScale.value.set(params.scaleX, params.scaleY, params.scaleZ);
      material.uniforms.meshScale.value = params.scale;
      shadowMaterial.uniforms.meshScale.value = params.scale;

      renderer.setClearColor(0);
      mesh.material = shadowMaterial;
      light.material.visible = false;
      encasing.material.visible = false;
      renderer.render(scene, shadowCamera, shadowBuffer);
      light.material.visible = true;
      encasing.material.visible = true;

      tmpVector.copy(scene.position);
      tmpVector.sub(shadowCamera.position);
      tmpVector.normalize();

      m.makeRotationY(-mesh.rotation.y);
      v.copy(shadowCamera.position);
      v.applyMatrix4(m);

      material.uniforms.shadowP.value.copy(shadowCamera.projectionMatrix);
      material.uniforms.shadowV.value.copy(shadowCamera.matrixWorldInverse);
      material.uniforms.lightPosition.value.copy(v);

      renderer.setClearColor(0x202020);
      mesh.material = material;
      renderer.render(scene, camera);

      helper.update();
    };

    animate();
    setIsLoading(false);

    // 清理函数
    return () => {
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchmove', onTouchMove);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '20px'
        }}>
          Loading...
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
};

export default PolygonShredder;
const textureVertexSimulationShader = `
precision highp float;

// 移除会被THREE.js自动添加的变量声明
varying vec2 vUv;
varying vec3 vOffset;

uniform vec3 offset;
uniform mat4 inverseModelViewMatrix;

void main() {

    vOffset = ( inverseModelViewMatrix * vec4( offset, 1. ) ).xyz;
    vUv = vec2(uv.x, 1.0 - uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
`;

export default textureVertexSimulationShader;
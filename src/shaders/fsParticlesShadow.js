const fsParticlesShadow = `
precision highp float;

// 添加顶点着色器中使用的varying变量声明
varying vec4 vShadowCoord;

vec4 packDepth(const in float depth) {
	const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
	const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
	vec4 res = mod(depth*bit_shift*vec4(255), vec4(256))/vec4(255);
	res -= res.xxyz * bit_mask;
	return res;
}

void main() {

	gl_FragColor = packDepth( gl_FragCoord.z );

}
`;

export default fsParticlesShadow;
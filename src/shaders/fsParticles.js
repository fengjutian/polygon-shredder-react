const fsParticles = `
precision highp float;

uniform float spread;
uniform sampler2D depthTexture;
uniform sampler2D projector;
uniform vec2 resolution;
uniform vec3 cameraPosition;

varying vec3 vPosition;
varying vec4 vColor;
varying vec4 vShadowCoord;
varying vec3 vLightPosition;

float bias = 0.0;

float unpackDepth(const in vec4 rgba_depth) {
    const vec4 bit_shift = vec4(
        1.0 / (256.0 * 256.0 * 256.0),
        1.0 / (256.0 * 256.0),
        1.0 / 256.0,
        1.0
    );
    return dot(rgba_depth, bit_shift);
}

float random(vec4 seed4) {
    float dot_product = dot(seed4, vec4(12.9898, 78.233, 45.164, 94.673));
    return fract(sin(dot_product) * 43758.5453);
}

float sampleVisibility(vec3 coord) {
    float depth = unpackDepth(texture2D(depthTexture, coord.xy));
    return step(coord.z, depth + bias);
}

mat2 rotationMatrix(float a) {
    return mat2(
        cos(a),  sin(a),
       -sin(a),  cos(a)
    );
}

const float PI = 3.14159265358979323846264;

void main() {
    // 法线方向（这里用视点方向近似）
    vec3 N = normalize(cameraPosition - vPosition);
    vec3 L = normalize(vLightPosition - vPosition);
    vec3 E = normalize(cameraPosition - vPosition);

    // 漫反射
    float diffuse = max(dot(N, L), 0.0);

    // 偏差修正
    float theta = clamp(diffuse, 0.0, 1.0);
    bias = 0.005 * tan(acos(theta));
    bias = clamp(bias, 0.0, 0.01);

    // 阴影采样
    vec3 shadowCoord = vShadowCoord.xyz / vShadowCoord.w;
    float shadow = 0.0;
    float stepSize = spread;
    vec2 inc = vec2(stepSize) / resolution;

    shadow += sampleVisibility(shadowCoord + vec3(-inc.x, -inc.y, 0.0));
    shadow += sampleVisibility(shadowCoord + vec3( 0.0,   -inc.y, 0.0));
    shadow += sampleVisibility(shadowCoord + vec3( inc.x, -inc.y, 0.0));
    shadow += sampleVisibility(shadowCoord + vec3(-inc.x,  0.0,   0.0));
    shadow += sampleVisibility(shadowCoord + vec3( 0.0,    0.0,   0.0));
    shadow += sampleVisibility(shadowCoord + vec3( inc.x,  0.0,   0.0));
    shadow += sampleVisibility(shadowCoord + vec3(-inc.x,  inc.y, 0.0));
    shadow += sampleVisibility(shadowCoord + vec3( 0.0,    inc.y, 0.0));
    shadow += sampleVisibility(shadowCoord + vec3( inc.x,  inc.y, 0.0));

    shadow /= 9.0;

    // 投影贴图
    vec4 mask = texture2D(projector, shadowCoord.xy);

    // 高光 (Blinn-Phong 简化)
    float shininess = 200.0;
    vec3 R = reflect(-L, N);
    float specular = pow(max(dot(E, R), 0.0), shininess);

    // 环境光
    float ambient = 0.2;

    // 光照贡献
    float lighting = diffuse * shadow * mask.r + ambient;

    // 基础颜色混合
    vec3 color = mix(vColor.rgb, vec3(1.0), 0.8 * clamp(-N.y, 0.0, 1.0));

    // 最终输出
    vec3 finalColor = color * lighting + vec3(specular);
    gl_FragColor = vec4(finalColor, vColor.a);
}
`;

export default fsParticles;
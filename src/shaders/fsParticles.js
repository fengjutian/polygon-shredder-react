const fsParticles = `
precision highp float;

uniform vec3 cameraPosition;

varying vec3 vPosition;
varying vec4 vColor;
varying vec3 vLightPosition;

const float PI = 3.14159265358979323846264;

void main() {
    // 法线方向（这里用视点方向近似）
    vec3 N = normalize(cameraPosition - vPosition);
    vec3 L = normalize(vLightPosition - vPosition);
    vec3 E = normalize(cameraPosition - vPosition);

    // 漫反射
    float diffuse = max(dot(N, L), 0.0);

    // 高光 (Blinn-Phong 简化)
    float shininess = 200.0;
    vec3 R = reflect(-L, N);
    float specular = pow(max(dot(E, R), 0.0), shininess);

    // 环境光
    float ambient = 0.2;

    // 光照贡献
    float lighting = diffuse + ambient;

    // 基础颜色混合
    vec3 color = mix(vColor.rgb, vec3(1.0), 0.8 * clamp(-N.y, 0.0, 1.0));

    // 最终输出
    vec3 finalColor = color * lighting + vec3(specular);
    gl_FragColor = vec4(finalColor, vColor.a);
}
`;

export default fsParticles;
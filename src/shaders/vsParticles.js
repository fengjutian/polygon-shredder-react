const vsParticles = `
precision highp float;

attribute vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;

uniform vec3 cameraPosition;

uniform sampler2D map;
uniform sampler2D prevMap;

uniform vec3 boxVertices[ 36 ];
uniform vec3 boxNormals[ 3 ];

uniform float width;
uniform float height;

uniform float timer;
uniform vec3 boxScale;
uniform float meshScale;

varying vec3 vPosition;
varying vec4 vColor;

varying vec4 vShadowCoord;
uniform mat4 shadowV;
uniform mat4 shadowP;
uniform vec3 lightPosition;

varying vec3 vLightPosition;

uniform sampler2D diffuse;

const mat4 biasMatrix = mat4(
	0.5, 0.0, 0.0, 0.0,
	0.0, 0.5, 0.0, 0.0,
	0.0, 0.0, 0.5, 0.0,
	0.5, 0.5, 0.5, 1.0
);

mat4 rotationMatrix(vec3 axis, float angle) {

	axis = normalize(axis);
	float s = sin(angle);
	float c = cos(angle);
	float oc = 1.0 - c;

	return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
			oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
			oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
			0.0,                                0.0,                                0.0,                                1.0);
}

float ramp( float x ) {
	return 1. - 1. - pow( 1. - x, 4. );
}

float parabola( float x, float k ) {
	return pow( 4. * x * ( 1. - x ), k );
}

float random(vec4 seed4){
	//return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
	float dot_product = dot(seed4, vec4(12.9898,78.233,45.164,94.673));
	return fract(sin(dot_product) * 43758.5453);
}

mat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {
	vec3 rr = vec3(sin(roll), cos(roll), 0.0);
	vec3 ww = normalize(target - origin);
	vec3 uu = normalize(cross(ww, rr));
	vec3 vv = normalize(cross(uu, ww));

	return mat3(uu, vv, ww);
}

void main() {

	vec2 dimensions = vec2( width, height );

	float px = position.y;
	float vi = position.z;
	float x = mod( px, dimensions.x );
	float y = mod( floor( px / dimensions.x ), dimensions.y );
	vec2 uv = vec2( x, y ) / dimensions;

	vec4 cubePosition = texture2D( map, uv );
	vec4 prevPosition = texture2D( prevMap, uv );
	float alpha = cubePosition.a / 100.;
	float scale = .025 * parabola( 1. - alpha, 1. );
	vec3 faceNormal = boxNormals[ int( vi / 6. ) ];
	mat4 localRotation = mat4( calcLookAtMatrix( cubePosition.xyz, prevPosition.xyz, 0. ) );

	vec4 rotatedNormal = localRotation * vec4( faceNormal, 1. );
	vec3 visPosition = ( modelMatrix * ( cubePosition + rotatedNormal * scale ) ).xyz;
	float d = dot( normalize( visPosition - cameraPosition ), normalize( ( modelMatrix * rotatedNormal ).xyz ) );
	vec3 boxVertex = boxVertices[ int( vi + ( 1. - step( 0., d ) ) * 18. ) ];
	vec3 modifiedVertex = ( ( localRotation * vec4( boxVertex * scale * boxScale * meshScale, 1. ) ).xyz );
	vec3 modifiedPosition = cubePosition.xyz + modifiedVertex;

	gl_Position = projectionMatrix * modelViewMatrix * vec4( modifiedPosition, 1.0 );
	vPosition = modifiedPosition;

	// 修复阴影坐标计算的矩阵乘法顺序
	vShadowCoord = biasMatrix * shadowP * shadowV * modelMatrix * vec4( modifiedPosition, 1. );

	vColor = texture2D( diffuse, uv );
	vLightPosition = lightPosition;

}
`;

export default vsParticles;
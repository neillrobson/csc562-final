#version 300 es

precision mediump float;

#pragma glslify: blackbody = require('glsl-colormap/blackbody')

const float SCALE = 2.0;
const int SDF_ITERATIONS = 10;
const int MARCH_ITERATIONS = 90;
const float EPSILON = 0.001;
const float BAILOUT_LENGTH = 5.0;
const float MANDELBULB_POWER = 8.0;
const float SHININESS = 6.0;

const vec3 objAmbient = vec3(0.1, 0.1, 0.1);
const vec3 objDiffuse = vec3(0.6, 0.6, 0.6);
const vec3 objSpecular = vec3(0.3, 0.3, 0.3);
const vec3 lightAmbient = vec3(1.0, 1.0, 1.0);
const vec3 lightDiffuse = vec3(1.0, 1.0, 1.0);
const vec3 lightSpecular = vec3(1.0, 1.0, 1.0);

const vec3 lightPosition = vec3(0.0, 3.0, 0.0);

const vec3 xEpsilon = vec3(EPSILON, 0.0, 0.0);
const vec3 yEpsilon = vec3(0.0, EPSILON, 0.0);
const vec3 zEpsilon = vec3(0.0, 0.0, EPSILON);

uniform vec2 u_resolution;
uniform vec3 u_eye;
uniform mat4 u_targetTransform;

out vec4 color;

bool hitSphere(vec3 center, float radius, vec3 lookOrigin, vec3 lookDirection) {
	vec3 oc = lookOrigin - center;
	float a = dot(lookDirection, lookDirection);
	float b = 2.0 * dot(oc, lookDirection);
	float c = dot(oc, oc) - radius * radius;
	float discriminant = b * b - 4.0 * a * c;
	return discriminant > 0.0;
}

float sdMandelbulb(in vec3 p, out vec3 escapeZ) {
	vec3 z = p;
	float dr = 1.0;
	float r = 0.0;
	for (int i = 0; i < SDF_ITERATIONS; ++i) {
		r = length(z);
		if (r > BAILOUT_LENGTH) break;

		// Convert to polar coordinates
		float theta = acos(z.z / r);
		float phi = atan(z.y, z.x);
		dr = pow(r, MANDELBULB_POWER - 1.0) * MANDELBULB_POWER * dr + 1.0;

		// scale and rotate the point
		float zr = pow(r, MANDELBULB_POWER);
		theta = theta * MANDELBULB_POWER;
		phi = phi * MANDELBULB_POWER;
		
		// convert back to cartesian coordinates
		z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
		z += p;
	}
    escapeZ = z;
	return 0.5 * log(r) * r / dr;
}

float getMarchComplexity(in vec3 lookAt, out vec3 hitPos, out vec4 color) {
	vec3 marchTo;
    vec3 escapeZ;
	float totalStep = 0.0;
	int i;
	float marchComplexity;
	if (hitSphere(vec3(0, 0, 0), 2.0, u_eye, lookAt)) {
		for (i = 0; i < MARCH_ITERATIONS; ++i) {
			marchTo = u_eye + lookAt * totalStep;
			float nextStep = sdMandelbulb(marchTo, escapeZ);
			if (nextStep < EPSILON) break;
			totalStep += nextStep;
		}
		if (i == MARCH_ITERATIONS) {
			return 1.0;
		} else {
            float normalizedCount = (
                float(i) + 1.0 - log(log(length(escapeZ))) / log(MANDELBULB_POWER)
            ) / float(MARCH_ITERATIONS);
			hitPos = marchTo;
            color = blackbody(normalizedCount);
			return 1.0 - normalizedCount;
		}
	} else {
		return 1.0;
	}
}

void main() {
	// uv is (0, 0) at the center of the screen
	vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;

	vec3 lookAt = (u_targetTransform * vec4(normalize(vec3(uv, -1.0)), 1.0)).xyz;
	vec3 hitPos;
    vec4 rawColor;

	float marchComplexity = getMarchComplexity(lookAt, hitPos, rawColor);

    // Early return if no hit
	if (marchComplexity == 1.0) {
		color = vec4(marchComplexity, marchComplexity, marchComplexity, 1.0);
		return;
	}

    vec3 dummy;
	vec3 normal = normalize(vec3(
		sdMandelbulb(hitPos+xEpsilon, dummy) - sdMandelbulb(hitPos-xEpsilon, dummy),
		sdMandelbulb(hitPos+yEpsilon, dummy) - sdMandelbulb(hitPos-yEpsilon, dummy),
		sdMandelbulb(hitPos+zEpsilon, dummy) - sdMandelbulb(hitPos-zEpsilon, dummy)
	));

	vec3 ambient = objAmbient * lightAmbient;

	vec3 light = normalize(lightPosition - hitPos);
	float lambert = max(0.0, dot(normal, light));
	vec3 diffuse = rawColor.xyz * lightDiffuse * lambert;

	vec3 eye = normalize(u_eye - hitPos);
	vec3 halfVec = normalize(light + eye);
	float highlight = pow(max(0.0, dot(normal, halfVec)), SHININESS);
	vec3 specular = objSpecular * lightSpecular * highlight;

	color = vec4(ambient + diffuse + specular, 1.0);
}
#version 300 es

precision mediump float;

const float SCALE = 2.0;
const int TETRA_ITERATIONS = 10;
const int MARCH_ITERATIONS = 90;
const float EPSILON = 0.001;
const float BAILOUT_LENGTH = 5.0;
const float MANDELBULB_POWER = 8.0;

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

/**
 * Signed distance function for sphere with radius 1 centered at origin
 */
float sphere(vec3 pos) {
    return length(pos) - 1.0;
}

float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return length(max(d,0.0))
        + min(max(d.x,max(d.y,d.z)),0.0);
}

float sdTetra(vec3 p) {
    vec3 a1 = vec3(1,1,1);
    vec3 a2 = vec3(-1,-1,1);
    vec3 a3 = vec3(1,-1,-1);
    vec3 a4 = vec3(-1,1,-1);
    vec3 c;
    int n = 0;
    float dist, d;
    while (n++ < TETRA_ITERATIONS) {
        c = a1;
        dist = length(p - a1);
        d = length(p - a2);
        if (d < dist) {
            c = a2;
            dist = d;
        }
        d = length(p - a3);
        if (d < dist) {
            c = a3;
            dist = d;
        }
        d = length(p - a4);
        if (d < dist) {
            c = a4;
            dist = d;
        }
        p = SCALE * p - c * (SCALE - 1.0);
    }
    return length(p) * pow(SCALE, float(-n));
}

float sdTetraFold(vec3 p) {
    vec3 a1 = vec3(1, 1, 1);
    float r;
    int n = 0;
    while (n++ < TETRA_ITERATIONS) {
        if (p.x + p.y < 0.0) p.xy = -p.yx;
        if (p.x + p.z < 0.0) p.xz = -p.zx;
        if (p.y + p.z < 0.0) p.yz = -p.zy;
        p = SCALE * p - a1 * (SCALE - 1.0);
    }
    return length(p) * pow(SCALE, float(-n));
}

float sdMandelbulb(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    for (int i = 0; i < TETRA_ITERATIONS; ++i) {
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
    return 0.5 * log(r) * r / dr;
}

void main() {
    // The box
    vec3 boxDimensions = vec3(0.5, 1.0, 1.5);

    // uv is (0, 0) at the center of the screen
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;

    vec3 lookAt = (u_targetTransform * vec4(normalize(vec3(uv, -1.0)), 1.0)).xyz;

    vec3 marchTo;
    float totalStep = 0.0;
    int i;
    float marchComplexity;
    if (hitSphere(vec3(0, 0, 0), 2.0, u_eye, lookAt)) {
        for (i = 0; i < MARCH_ITERATIONS; ++i) {
            marchTo = u_eye + lookAt * totalStep;
            // float nextStep = sdTetraFold(marchTo);
            float nextStep = sdMandelbulb(marchTo);
            if (nextStep < EPSILON) break;
            totalStep += nextStep;
        }
        if (i == MARCH_ITERATIONS) {
            marchComplexity = 1.0;
        } else {
            marchComplexity = 1.0 - (float(i) / float(MARCH_ITERATIONS));
        }
    } else {
        marchComplexity = 1.0;
    }

    color = vec4(marchComplexity, marchComplexity, marchComplexity, 1.0);
}
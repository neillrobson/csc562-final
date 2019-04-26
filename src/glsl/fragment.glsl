#version 300 es

precision mediump float;

#pragma glslify: nextZTrig = require('./mandel-sequencers/trig.glsl');
#pragma glslify: nextZPoly = require('./mandel-sequencers/poly.glsl');

const int MAX_Z_FUNCTION_ITERATIONS = 16;
const int MAX_RAY_MARCH_ITERATIONS = 128;
const float EPSILON = 0.001;
const float BAILOUT_LENGTH = 3.0;
const float MANDELBULB_POWER = 8.0;

const vec3 xEpsilon = vec3(EPSILON, 0.0, 0.0);
const vec3 yEpsilon = vec3(0.0, EPSILON, 0.0);
const vec3 zEpsilon = vec3(0.0, 0.0, EPSILON);

uniform vec2 u_resolution;
uniform vec3 u_eye;
uniform mat4 u_targetTransform;

// Feature toggles
uniform int u_zFunctionType;
uniform int u_shadingType;
uniform int u_zFunctionIterations;
uniform int u_rayMarchIterations;
uniform int u_backgroundType;

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
 * Given a starting point, return information about the Mandelbulb's escape
 * behavior at that location.
 *
 * escapeZ: The z-value of the first element in the recursive Mandlebrot
 * function that ventured outside the boundary.
 * return: How far away the given point is from the fractal's surface.
 */
float sdMandelbulb(in vec3 p, out vec3 escapeZ) {
    vec3 zVec = p;
    float dr = 1.0;
    float r = 0.0;
    for (int i = 0; i < MAX_Z_FUNCTION_ITERATIONS; ++i) {
        if (i >= u_zFunctionIterations) break;
        r = length(zVec);
        if (r > BAILOUT_LENGTH) break;

        dr = pow(r, MANDELBULB_POWER - 1.0) * MANDELBULB_POWER * dr + 1.0;

        if (u_zFunctionType == 0) {
            nextZPoly(p, zVec);
        } else {
            nextZTrig(p, MANDELBULB_POWER, zVec);
        }
    }
    escapeZ = zVec;
    return 0.5 * log(r) * r / dr;
}

vec3 getNormal(in vec3 hitPos) {
    vec3 dummy;
    return normalize(vec3(
        sdMandelbulb(hitPos+xEpsilon, dummy) - sdMandelbulb(hitPos-xEpsilon, dummy),
        sdMandelbulb(hitPos+yEpsilon, dummy) - sdMandelbulb(hitPos-yEpsilon, dummy),
        sdMandelbulb(hitPos+zEpsilon, dummy) - sdMandelbulb(hitPos-zEpsilon, dummy)
    ));
}

/**
 * Given a starting point and direction, path-trace a line to the nearest
 * intersection and return the position of that intersection, the normal at that
 * point, and complex the calculation was (on a scale of zero to one, one being
 * the most complex).
 *
 * from: Starting location of the look vector
 * dir: Direction along which to shoot the path-tracing ray
 * hitPos: Point of intersection between ray and object
 * hitNormal: Normal vector at the point of intersection
 * complexity: Roughly how "long" it took for the path marcher to terminate
 * RETURN: True if an intersection was found
 */
bool trace(in vec3 from, in vec3 dir, out vec3 hitPos, out vec3 hitNormal, out float complexity) {
    vec3 marchTo;
    vec3 escapeZ;
    float totalStep = 0.0;
    int i;
    if (hitSphere(vec3(0, 0, 0), 1.2, from, dir)) {
        for (i = 0; i < MAX_RAY_MARCH_ITERATIONS; ++i) {
            if (i >= u_rayMarchIterations) break;
            marchTo = from + dir * totalStep;
            float nextStep = sdMandelbulb(marchTo, escapeZ);
            if (nextStep < EPSILON) break;
            totalStep += nextStep;
        }
        if (i >= u_rayMarchIterations) {
            return false;
        } else {
            hitPos = marchTo;
            hitNormal = getNormal(marchTo);
            complexity = (
                float(i) + 1.0 - log(log(length(escapeZ))) / log(MANDELBULB_POWER)
            ) / float(u_rayMarchIterations);
            return true;
        }
    }
    return false;
}

#pragma glslify: getColorBlinnPhong = require('./color-functions/blinn-phong.glsl', trace=trace);
#pragma glslify: getColorGI = require('./color-functions/global.glsl', trace=trace, EPSILON=EPSILON, u_backgroundType=u_backgroundType);

void main() {
    // uv is (0, 0) at the center of the screen
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
    vec3 lookAt = (u_targetTransform * vec4(normalize(vec3(uv, -1.0)), 1.0)).xyz;

    if (u_shadingType == 0) {
        color = vec4(getColorBlinnPhong(u_eye, lookAt), 1.0);
    } else {
        color = vec4(getColorGI(u_eye, lookAt), 1.0);
    }
}
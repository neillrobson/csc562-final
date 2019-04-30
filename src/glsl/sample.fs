precision highp float;

#pragma glslify: yignbu = require('glsl-colormap/yignbu')
#pragma glslify: nextZTrig = require('./mandel-sequencers/trig.glsl');
#pragma glslify: nextZPoly = require('./mandel-sequencers/poly.glsl');

const int MAX_BOUNCES = 16;
const int MAX_Z_FUNCTION_ITERATIONS = 16;
const int MAX_RAY_MARCH_ITERATIONS = 128;
const float ALBEDO = 0.6;
const float ROUGHNESS = 0.5;
const float PI = 3.14;
const float EPSILON = 0.001;
const float BAILOUT_LENGTH = 3.0;
const float MANDELBULB_POWER = 8.0;
const float LIGHT_RADIUS = 2.0;
const float LIGHT_INTENSITY = 4.1;
const vec3 X_EPSILON = vec3(EPSILON, 0.0, 0.0);
const vec3 Y_EPSILON = vec3(0.0, EPSILON, 0.0);
const vec3 Z_EPSILON = vec3(0.0, 0.0, EPSILON);
const vec3 LIGHT_POS = vec3(8.0, 8.0, -8.0);
const vec3 LIGHT_COLOR = vec3(1.0);
const vec3 FRACTAL_COLOR = vec3(0.9);

uniform sampler2D source;
uniform sampler2D tRand2Normal;
uniform sampler2D tRand3Normal;
uniform sampler2D tRand2Uniform;
// Avoids sampling the same area between frames
uniform vec2 rand;
uniform vec3 eye;
uniform int backgroundType;
uniform int bounces;
uniform int rayMarchIterations;
uniform int shadingType;
uniform int viewportHeight;
uniform int viewportWidth;
uniform int zFunctionIterations;
uniform int zFunctionType;
uniform bool antialias;
uniform bool useDirectLighting;
uniform float randsize;
uniform mat4 targetTransform;

vec2 resolution = vec2(viewportWidth, viewportHeight);

// Source for orthogonal vector calculator: http://lolengine.net/blog/2013/09/21/picking-orthogonal-vector-combing-coconuts
vec3 ortho(in vec3 v) {
    return abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y);
}

// Source for ray-sphere intersection: http://viclw17.github.io/2018/07/16/raytracing-ray-sphere-intersection/
bool raySphereIntersect(in vec3 rayOrigin, in vec3 rayDirection, in vec3 sphereOrigin, in float sphereRadius, out float t) {
    t = 1.0; // Set t to a positive value to signal whether or not we failed the discriminant test
    vec3 sphereToEye = rayOrigin - sphereOrigin;
    float a = dot(rayDirection, rayDirection);
    float b = 2.0 * dot(sphereToEye, rayDirection);
    float c = dot(sphereToEye, sphereToEye) - sphereRadius * sphereRadius;
    float discriminant = b * b - 4.0 * a * c;
    if (discriminant < 0.0) return false;
    // We always want the smaller of the two solutions (the intersection closer to the ray origin)
    t = (-b - sqrt(discriminant)) / (2.0 * a);
    return t >= 0.0;
}

// Avoids sampling the same area within a frame
vec2 randState = vec2(0.0);

// A random vec2 whose coordinates are distributed around zero according to a normal curve.
vec2 fRand2Uniform() {
    vec2 ret = texture2D(tRand2Uniform, gl_FragCoord.xy / resolution + rand.xy + randState).ba;
    randState += ret;
    return ret;
}

// A random vec2 that lies on the unit circle.
vec2 fRand2Normal() {
    vec2 ret = texture2D(tRand2Normal, gl_FragCoord.xy / resolution + rand.xy + randState).ba;
    randState += ret;
    return ret;
}

// A random vec2 that lies on or within the unit circle.
vec2 fRand2Disc() {
    return fRand2Normal() * (fRand2Uniform()).x;
}

// A random vec3 that lies on the unit sphere.
vec3 fRand3Normal() {
    vec3 ret = texture2D(tRand3Normal, gl_FragCoord.xy / resolution + rand.xy + randState).rgb;
    randState += ret.xy;
    return ret;
}

// A random vec3 within the hemisphere centered on dir.
vec3 getSampleUnweighted(vec3 dir) {
    vec3 ret = fRand3Normal();
    if (dot(ret, dir) < 0.0) {
        ret *= -1.0;
    }
    return ret;
}

// A cosine-weighted vec3 within the hemisphere centered on dir.
// We are generating random points on a flat disc, then shooting them straight up onto a hemisphere.
vec3 getSampleWeightedAlt(vec3 dir) {
    vec3 nDir = normalize(dir);
    vec3 o1 = normalize(ortho(nDir));
    vec3 o2 = normalize(cross(nDir, o1));
    vec2 randVec = fRand2Disc();
    float randLength = length(randVec);
    vec3 weights = vec3(randVec, sqrt(1.0 - randLength * randLength));
    return o1 * weights.x + o2 * weights.y + nDir * weights.z;
}

// A cosine-weighted vec3 within the hemisphere centered on dir.
vec3 getSampleWeighted(vec3 dir) {
    return normalize(normalize(dir) + fRand3Normal());
}

vec3 getBackground(vec3 dir) {
    if (backgroundType == 0) {
        return vec3(0.1);
    } else {
        return yignbu(acos(-normalize(dir).y) / PI).xyz;
    }
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
        if (i >= zFunctionIterations) break;
        r = length(zVec);
        if (r > BAILOUT_LENGTH) break;

        dr = pow(r, MANDELBULB_POWER - 1.0) * MANDELBULB_POWER * dr + 1.0;

        if (zFunctionType == 0) {
            nextZPoly(p, zVec);
        } else {
            nextZTrig(p, MANDELBULB_POWER, zVec);
        }
    }
    escapeZ = zVec;
    return 0.5 * log(r) * r / dr;
}

vec3 getMandelbulbNormal(in vec3 hitPos) {
    vec3 dummy;
    return normalize(vec3(
        sdMandelbulb(hitPos+X_EPSILON, dummy) - sdMandelbulb(hitPos-X_EPSILON, dummy),
        sdMandelbulb(hitPos+Y_EPSILON, dummy) - sdMandelbulb(hitPos-Y_EPSILON, dummy),
        sdMandelbulb(hitPos+Z_EPSILON, dummy) - sdMandelbulb(hitPos-Z_EPSILON, dummy)
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
bool trace(in vec3 from, in vec3 dir, out vec3 hitPos, out vec3 hitNormal, out float complexity, out bool hitLight) {
    bool hit = false;
    float totalStep;
    float totalStepMin = 1e38;

    // Light intersection
    if (raySphereIntersect(from, dir, LIGHT_POS, LIGHT_RADIUS, totalStep)) {
        totalStepMin = totalStep;
        hitPos = from + dir * totalStep;
        hitNormal = normalize(hitPos - LIGHT_POS);
        hit = true;
        hitLight = true;
    } else {
        hitLight = false;
    }

    vec3 marchTo;
    vec3 escapeZ;
    float dummy;
    int itr;
    totalStep = 0.0;

    // Mandelbulb intersection
    if (raySphereIntersect(from, dir, vec3(0, 0, 0), 1.2, dummy) || dummy < 0.0) {
        for (int i = 0; i < MAX_RAY_MARCH_ITERATIONS; ++i) {
            itr = i;
            if (i >= rayMarchIterations) break;
            marchTo = from + dir * totalStep;
            float nextStep = sdMandelbulb(marchTo, escapeZ);
            if (nextStep < EPSILON) break;
            totalStep += nextStep;
        }
        if (itr < rayMarchIterations && totalStep < totalStepMin) {
            totalStepMin = totalStep;
            hitPos = marchTo;
            hitNormal = getMandelbulbNormal(marchTo);
            hitLight = false;
            hit = true;
            complexity = (
                float(itr) + 1.0 - log(log(length(escapeZ))) / log(MANDELBULB_POWER)
            ) / float(rayMarchIterations);
        }
    }
    return hit;
}

vec3 getColorGI(in vec3 from, in vec3 dir) {
    vec3 accum = vec3(0.0);
    vec3 mask = vec3(1.0);
    vec3 pos = from;
    vec3 ray = dir;

    for (int i = 0; i < MAX_BOUNCES; ++i) {
        if (i >= bounces) break;
        vec3 hitPos;
        vec3 hitNormal;
        bool hitLight;
        float dummyFloat;
        vec3 dummyVec;
        // Hit nothing (skybox)
        if (!trace(pos, ray, hitPos, hitNormal, dummyFloat, hitLight)) {
            accum += getBackground(ray) * mask;
            break;
        }
        // Hit light source
        if (hitLight) {
            if (useDirectLighting) {
                accum += LIGHT_COLOR * mask;
            } else {
                accum += getBackground(ray) * mask;
            }
            break;
        }
        // Hit fractal
        mask *= FRACTAL_COLOR;

        if (useDirectLighting) {
            // Soft shadows
            vec3 lightSamplePos = LIGHT_POS + fRand3Normal() * LIGHT_RADIUS;
            vec3 lightSampleRay = normalize(lightSamplePos - hitPos);
            vec3 oldPosRay = normalize(pos - hitPos);
            if (trace(hitPos + lightSampleRay * EPSILON, lightSampleRay, dummyVec, dummyVec, dummyFloat, hitLight) && hitLight) {
                vec3 halfVec = normalize(lightSampleRay + oldPosRay);
                float d = clamp(dot(hitNormal, halfVec), 0.0, 1.0);
                d *= pow(asin(LIGHT_RADIUS / distance(hitPos, LIGHT_POS)), 2.0);
                accum += d * LIGHT_INTENSITY * LIGHT_COLOR * mask;
            }
        }

        ray = normalize(mix(reflect(ray, hitNormal), getSampleWeighted(hitNormal), ROUGHNESS));
        // Ensure that the new position does not hit the object at the same point
        pos = hitPos + ray * EPSILON;
    }
    
    return accum;
}

#pragma glslify: getColorBlinnPhong = require('./color-functions/blinn-phong.glsl', trace=trace);

void main() {
    vec3 sourceRgb = texture2D(source, gl_FragCoord.xy / resolution).rgb;

    vec2 jitter = vec2(0.0);
    if (antialias) {
        jitter = fRand2Uniform() - 0.5;
    }

    // lookAtCoords is (0, 0) at the center of the screen
    vec2 lookAtCoords = 2.0 * (gl_FragCoord.xy + jitter) / resolution - 1.0;
    vec3 lookAt = (targetTransform * vec4(normalize(vec3(lookAtCoords, -1.0)), 1.0)).xyz;

    if (shadingType == 0) {
        gl_FragColor = vec4(sourceRgb + getColorBlinnPhong(eye, lookAt), 1.0);
    } else if (shadingType == 1) {
        gl_FragColor = vec4(sourceRgb + getColorGI(eye, lookAt), 1.0);
    }
}
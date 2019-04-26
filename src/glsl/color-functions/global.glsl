#pragma glslify: yignbu = require('glsl-colormap/yignbu')

const float ALBEDO = 0.6;
const int RAY_DEPTH = 10;
const float PI = 3.14;

const vec3 sunDirection = vec3(1.0, 0.0, 0.0);

/**
 * Returns two random numbers between zero and one (exclusive).
 * Source for pseudorandom generator: https://thebookofshaders.com/10/
 */
vec2 randVec2() {
    return vec2(
        fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233))) * 43758.5453),
        fract(cos(dot(gl_FragCoord.xy, vec2(4.898,7.23))) * 23421.631)
    );
}

// Source for orthogonal vector calculator: http://lolengine.net/blog/2013/09/21/picking-orthogonal-vector-combing-coconuts
vec3 ortho(in vec3 v) {
    return abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0) : vec3(0.0, -v.z, v.y);
}

/**
 * Return a vector pointing somewhere in the hemisphere centered around the input vector.
 */
vec3 getSampleBiased(in vec3 dir, in float power) {
    vec3 nDir = normalize(dir);
    vec3 o1 = normalize(ortho(nDir));
    vec3 o2 = normalize(cross(nDir, o1));
    vec2 r = randVec2();
    r.x *= 2.0 * PI;
    // r.y is a number between zero and one. We need to take a fractional power of it (1/2, 1/4, etc) in order to bring its value closer to 1.
    r.y = pow(r.y, 1.0 / (power + 1.0));
    float oneminus = sqrt(1.0 - r.y * r.y);
    return cos(r.x) * oneminus * o1 + sin(r.x) * oneminus * o2 + r.y * nDir;
}

/**
 * Get a random direction in a hemisphere centered on the given dir.
 */
vec3 getSample(vec3 dir) {
    return getSampleBiased(dir, 0.0);
}

/**
 * Get a weighted random direction in a hemisphere centered on the given dir.
 * More emphasis will be given to directions close to the dir.
 */
vec3 getCosineWeightedSample(vec3 dir) {
    return getSampleBiased(dir, u_cosineWeight);
}

vec3 getConeSample(vec3 dir, float extent) {
    dir = normalize(dir);
    vec3 o1 = normalize(ortho(dir));
    vec3 o2 = normalize(cross(dir, o1));
    vec2 r = randVec2();
    r.x *= 2.0 * PI;
    r.y = 1.0 - r.y * extent;
    float oneminus = sqrt(1.0 - r.y * r.y);
    return cos(r.x) * oneminus * o1 + sin(r.x) * oneminus * o2 + r.y * dir;
}

/**
 * Get the color coming from a skybox at an infinite distance from the viewer.
 */
vec3 getBackground(vec3 dir) {
    if (u_backgroundType == 0) {
        return vec3(1.0);
    } else {
        return yignbu(acos(-normalize(dir).y) / PI).xyz;
    }
}

vec3 getColorGI(vec3 from, vec3 dir) {
    vec3 hit = vec3(0.0);
    vec3 direct = vec3(0.0);
    vec3 hitNormal = vec3(0.0);
    vec3 dummy = vec3(0.0);
    float complexity;

    vec3 luminance = vec3(1.0);

    for (int i = 0; i < RAY_DEPTH; ++i) {
        if (trace(from, dir, hit, hitNormal, complexity)) {
            if (u_useCosineBias == 0) {
                dir = getSample(hitNormal);
                luminance *= 2.0 * ALBEDO * dot(dir, hitNormal);
            } else {
                dir = getCosineWeightedSample(hitNormal);
                luminance *= ALBEDO;
            }

            from = hit + hitNormal * EPSILON * 2.0;

            if (u_useDirectLighting != 0) {
                vec3 sunSampleDir = getConeSample(sunDirection, 1E-5);
                float sunLight = dot(hitNormal, sunSampleDir);
                if (sunLight > 0.0 && !trace(from, sunSampleDir, dummy, dummy, complexity)) {
                    direct += luminance * sunLight * 1E-5;
                }
            }
        } else {
            return direct + luminance * getBackground(dir);
        }
    }
    return vec3(0.0);
}

#pragma glslify: export(getColorGI)
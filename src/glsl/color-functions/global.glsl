const float ALBEDO = 0.5;
const int RAY_DEPTH = 3;
const float PI = 3.14;

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
 * Get the color coming from a skybox at an infinite distance from the viewer.
 */
vec3 getBackground(vec3 dir) {
    return vec3(1.0);
}

vec3 getColorGI(vec3 from, vec3 dir) {
    vec3 hit = vec3(0.0);
    vec3 hitNormal = vec3(0.0);
    float complexity;

    vec3 luminance = vec3(1.0);

    for (int i = 0; i < RAY_DEPTH; ++i) {
        if (trace(from, dir, hit, hitNormal, complexity)) {
            dir = getSample(hitNormal);
            luminance *= 2.0 * ALBEDO * dot(dir, hitNormal);
            from = hit + hitNormal * EPSILON * 2.0;
        } else {
            return luminance * getBackground(dir);
        }
    }
    return vec3(0.0);
}

#pragma glslify: export(getColorGI)
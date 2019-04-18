const float ALBEDO = 0.5;
const int RAY_DEPTH = 3;

/**
 * Get a random direction in a hemisphere centered on the given dir.
 */
vec3 getSample(vec3 dir) {
    return dir;
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
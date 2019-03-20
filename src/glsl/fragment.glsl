#version 300 es

precision mediump float;

uniform vec2 u_resolution;

out vec4 color;

/**
 * Signed distance function for sphere with radius 1 centered at origin
 */
float sphere(vec3 pos) {
    return length(pos) - 1.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;

    vec3 camera = vec3(0.0, 0.0, -3.0);
    vec3 lookAt = normalize(vec3(uv, 1.0));

    vec3 marchTo;
    float totalStep = 0.0;
    int i;
    float marchComplexity;
    for (i = 0; i < 32; ++i) {
        marchTo = camera + lookAt * totalStep;
        float nextStep = sphere(marchTo);
        if (nextStep < 0.01) break;
        totalStep += nextStep;
    }
    if (i == 32) {
        marchComplexity = 1.0;
    } else {
        marchComplexity = 1.0 - (float(i) / 32.0);
    }

    color = vec4(marchComplexity, marchComplexity, marchComplexity, 1.0);
}
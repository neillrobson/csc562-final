#version 300 es

precision mediump float;

uniform vec2 u_resolution;
uniform vec3 u_eye;
uniform mat4 u_targetTransform;

out vec4 color;

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

void main() {
    // The box
    vec3 boxDimensions = vec3(0.5, 1.0, 1.5);

    // uv is (0, 0) at the center of the screen
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;

    // Looking down the negative Z axis.
    vec3 camera = vec3(0.0, 0.0, 3.0);
    vec3 lookAt = (u_targetTransform * vec4(normalize(vec3(uv, -1.0)), 1.0)).xyz;

    vec3 marchTo;
    float totalStep = 0.0;
    int i;
    float marchComplexity;
    for (i = 0; i < 32; ++i) {
        marchTo = u_eye + lookAt * totalStep;
        // float nextStep = sphere(marchTo);
        float nextStep = sdBox(marchTo, boxDimensions);
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
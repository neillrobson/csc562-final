#version 300 es

precision mediump float;

uniform vec2 u_resolution;

out vec4 color;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    color = vec4(uv, 0.0, 1.0);
}
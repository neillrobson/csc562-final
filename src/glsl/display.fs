precision highp float;

uniform sampler2D source;
uniform int viewportHeight;
uniform int viewportWidth;
uniform float numPings;

void main() {
    vec2 resolution = vec2(viewportWidth, viewportHeight);
    vec3 sourceRgb = texture2D(source, gl_FragCoord.xy / resolution).rgb / numPings;

    gl_FragColor = vec4(sourceRgb, 1.0);
}
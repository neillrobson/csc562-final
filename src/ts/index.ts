import * as Stats from 'stats.js';
import * as dat from 'dat.gui';
import * as REGL from 'regl';
import fragmentSource from '../glsl/fragment.glsl';
import vertexSource from '../glsl/vertex.glsl';
import { featureToggles } from './globals';
import { handleKeyDown, Center, Eye, Up, resetView } from './keyboard';
import { vec3, mat4 } from 'gl-matrix';
import { reflow } from './util';

document.body.style.margin = "0";

const stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

const gui = new dat.GUI();
gui.add(featureToggles, "zFunctionType", { Trig: 1, Polynomial: 0 });
gui.add(featureToggles, "shadingType", { BlinnPhong: 0, Global: 1 });
gui.add(featureToggles, "zFunctionIterations", 1, 16);
gui.add(featureToggles, "rayMarchIterations", 1, 128);
gui.add(featureToggles, "backgroundType", { White: 0, Colored: 1 });
gui.add(featureToggles, "cosineWeight", 1, 10, 0.01);
gui.add(featureToggles, "useCosineBias", { False: 0, True: 1 });
gui.add(featureToggles, "useDirectLighting", { False: 0, True: 1 });

const flexCenter = document.createElement("div");
flexCenter.style.width = "100vw";
flexCenter.style.height = "100vh";
flexCenter.style.display = "flex";
flexCenter.style.justifyContent = "center";
flexCenter.style.alignItems = "center";
document.body.appendChild(flexCenter);

let canvas = document.createElement("canvas");
canvas.width = canvas.height = 512;
flexCenter.appendChild(canvas);

document.onkeydown = handleKeyDown;

const regl = REGL(canvas);

function reglProp<Props extends {}>(name: keyof Props) {
    return regl.prop<Props, keyof Props>(name);
}

const reglDraw = regl({
    vert: vertexSource,
    frag: fragmentSource,
    attributes: {
        a_vertex: [
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]
    },
    uniforms: {
        u_viewportWidth: regl.context('viewportWidth'),
        u_viewportHeight: regl.context('viewportHeight'),
        u_backgroundType: reglProp("backgroundType"),
        u_cosineWeight: reglProp("cosineWeight"),
        u_eye: reglProp("eye"),
        u_rayMarchIterations: reglProp("rayMarchIterations"),
        u_shadingType: reglProp("shadingType"),
        u_targetTransform: reglProp("targetTransform"),
        u_useCosineBias: reglProp("useCosineBias"),
        u_useDirectLighting: reglProp("useDirectLighting"),
        u_zFunctionIterations: reglProp("zFunctionIterations"),
        u_zFunctionType: reglProp("zFunctionType"),
    },
    primitive: 'triangle strip',
    count: 4
});

resetView();

function render() {
    stats.begin();

    reflow(canvas);

    // Matrix that transforms camera-space direction vectors to world-space direction.
    let lookAt = vec3.subtract(vec3.create(), Center, Eye);
    vec3.normalize(lookAt, lookAt);
    let normUp = vec3.normalize(vec3.create(), Up);
    let targetTransform = mat4.targetTo(mat4.create(), vec3.create(), lookAt, normUp);

    reglDraw({
        backgroundType: Number(featureToggles.backgroundType),
        cosineWeight: featureToggles.cosineWeight,
        eye: Eye,
        rayMarchIterations: featureToggles.rayMarchIterations,
        shadingType: Number(featureToggles.shadingType),
        targetTransform: targetTransform,
        useCosineBias: Number(featureToggles.useCosineBias),
        useDirectLighting: Number(featureToggles.useDirectLighting),
        zFunctionIterations: featureToggles.zFunctionIterations,
        zFunctionType: Number(featureToggles.zFunctionType),
    });

    stats.end();
    requestAnimationFrame(render);
}
render();
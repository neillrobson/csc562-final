import * as Stats from 'stats.js';
import * as dat from 'dat.gui';
import * as REGL from 'regl';
import fragmentSource from '../glsl/frag.glsl';
import vertexSource from '../glsl/vertex.glsl';
import { featureToggles, RAND_SIZE } from './globals';
import { handleKeyDown, Center, Eye, Up, resetView } from './keyboard';
import { vec3, mat4, vec2 } from 'gl-matrix';
import { reflow } from './util';

document.body.style.margin = "0";
document.onkeydown = handleKeyDown;

const stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

const gui = new dat.GUI();
gui.add(featureToggles, "zFunctionType", { Trig: 1, Polynomial: 0 });
gui.add(featureToggles, "shadingType", { BlinnPhong: 0, Global: 1 });
gui.add(featureToggles, "zFunctionIterations", 1, 16);
gui.add(featureToggles, "rayMarchIterations", 1, 128);
gui.add(featureToggles, "backgroundType", { White: 0, Colored: 1 });
gui.add(featureToggles, "useCosineBias", { False: 0, True: 1 });
gui.add(featureToggles, "useDirectLighting", { False: 0, True: 1 });

const flexCenter = document.createElement("div");
flexCenter.style.width = "100vw";
flexCenter.style.height = "100vh";
flexCenter.style.display = "flex";
flexCenter.style.justifyContent = "center";
flexCenter.style.alignItems = "center";
document.body.appendChild(flexCenter);

const canvas = document.createElement("canvas");
canvas.width = canvas.height = featureToggles.resolution;
flexCenter.appendChild(canvas);

const regl = REGL({
    canvas,
    extensions: ['OES_texture_float']
});

function reglProp<Props extends {}>(name: keyof Props) {
    return regl.prop<Props, keyof Props>(name);
}

const dRand2Uniform = new Float32Array(RAND_SIZE * RAND_SIZE * 2);
for (let i = 0; i < dRand2Uniform.length; ++i) {
    dRand2Uniform[i] = Math.random();
}

const dRand2Normal = new Float32Array(RAND_SIZE * RAND_SIZE * 2);
for (let i = 0; i < RAND_SIZE * RAND_SIZE; ++i) {
    let randVec = vec2.random(vec2.create());
    dRand2Normal[i * 2] = randVec[0];
    dRand2Normal[i * 2 + 1] = randVec[1];
}

const dRand3Normal = new Float32Array(RAND_SIZE * RAND_SIZE * 3);
for (let i = 0; i < RAND_SIZE * RAND_SIZE; ++i) {
    let randVec = vec3.random(vec3.create());
    dRand3Normal[i * 2] = randVec[0];
    dRand3Normal[i * 2 + 1] = randVec[1];
    dRand3Normal[i * 2 + 2] = randVec[2];
}

const tRand2Uniform = regl.texture({
    width: RAND_SIZE,
    height: RAND_SIZE,
    data: dRand2Uniform,
    type: "float",
    format: "luminance alpha",
    wrap: "repeat"
});

const tRand2Normal = regl.texture({
    width: RAND_SIZE,
    height: RAND_SIZE,
    data: dRand2Normal,
    type: "float",
    format: "luminance alpha",
    wrap: "repeat"
});

const tRand3Normal = regl.texture({
    width: RAND_SIZE,
    height: RAND_SIZE,
    data: dRand3Normal,
    type: "float",
    format: "rgb",
    wrap: "repeat"
});

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
        viewportWidth: regl.context('viewportWidth'),
        viewportHeight: regl.context('viewportHeight'),
        backgroundType: reglProp("backgroundType"),
        eye: reglProp("eye"),
        rayMarchIterations: reglProp("rayMarchIterations"),
        // shadingType: reglProp("shadingType"),
        targetTransform: reglProp("targetTransform"),
        useCosineBias: reglProp("useCosineBias"),
        // useDirectLighting: reglProp("useDirectLighting"),
        zFunctionIterations: reglProp("zFunctionIterations"),
        zFunctionType: reglProp("zFunctionType"),
        tRand2Uniform,
        tRand2Normal,
        tRand3Normal,
        rand: reglProp('rand'),
    },
    primitive: 'triangle strip',
    count: 4
});

resetView();

/*
sampler2D tRand2Normal;
sampler2D tRand3Normal;
sampler2D tRand2Uniform;
vec2 rand;
    vec3 eye;
    int backgroundType;
    int rayMarchIterations;
    int useCosineBias;
    int viewportHeight;
    int viewportWidth;
    int zFunctionIterations;
    int zFunctionType;
float randsize;
    mat4 targetTransform;
*/

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
        eye: Eye,
        rayMarchIterations: featureToggles.rayMarchIterations,
        shadingType: Number(featureToggles.shadingType),
        targetTransform: targetTransform,
        useCosineBias: Number(featureToggles.useCosineBias),
        useDirectLighting: Number(featureToggles.useDirectLighting),
        zFunctionIterations: featureToggles.zFunctionIterations,
        zFunctionType: Number(featureToggles.zFunctionType),
        rand: [Math.random(), Math.random()],
    });

    stats.end();
    requestAnimationFrame(render);
}
render();
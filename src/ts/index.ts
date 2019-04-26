import * as Stats from 'stats.js';
import * as dat from 'dat.gui';
import fragmentSource from '../glsl/fragment.glsl';
import vertexSource from '../glsl/vertex.glsl';
import { setupShaderProgram } from './setup';
import { makeModelData } from './models';
import { renderModels } from './render';
import { resize } from './util';
import { handleKeyDown, resetView } from './keyboard';
import { featureToggles } from './globals';

var stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

const gui = new dat.GUI();
gui.add(featureToggles, "zFunctionType", { Trig: 1, Polynomial: 0 });
gui.add(featureToggles, "shadingType", { BlinnPhong: 0, Global: 1 });
gui.add(featureToggles, "zFunctionIterations", 1, 16);
gui.add(featureToggles, "rayMarchIterations", 1, 128);
gui.add(featureToggles, "backgroundType", { White: 0, Colored: 1 });

let canvas = document.createElement("canvas");
document.body.appendChild(canvas);
document.body.style.margin = "0";
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.display = "block";

document.onkeydown = handleKeyDown;

let gl = canvas.getContext("webgl2");

let featureToggleNames = Object.keys(featureToggles).map(name => "u_" + name);
let programContainer = setupShaderProgram(gl, vertexSource, fragmentSource, featureToggleNames);
let modelData = makeModelData(gl, programContainer.program);

gl.clearColor(0, 0, 0, 0);
gl.clear(gl.DEPTH_BUFFER_BIT || gl.COLOR_BUFFER_BIT);
resetView();

function render() {
    stats.begin();
    resize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    renderModels(gl, programContainer, modelData);
    stats.end();
    window.requestAnimationFrame(render);
}
render();
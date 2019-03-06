import * as Stats from 'stats.js';
import fragmentSource from '../glsl/fragment.glsl';
import vertexSource from '../glsl/vertex.glsl';
import { setupShaderProgram } from './setup';
import { makeModelData } from './models';
import { renderModels } from './render';
import { resize } from './util';

var stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

let canvas = document.createElement("canvas");
document.body.appendChild(canvas);
document.body.style.margin = "0";
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.display = "block";

let gl = canvas.getContext("webgl2");

let programContainer = setupShaderProgram(gl, vertexSource, fragmentSource);
let modelData = makeModelData(gl, programContainer.program);

gl.clearColor(0, 0, 0, 0);
gl.clear(gl.DEPTH_BUFFER_BIT || gl.COLOR_BUFFER_BIT);

function render() {
    stats.begin();
    resize(canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    renderModels(gl, programContainer, modelData);
    stats.end();
    window.requestAnimationFrame(render);
}
render();
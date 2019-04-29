import * as Stats from 'stats.js';
import * as dat from 'dat.gui';

import { featureToggles } from './globals';
import { handleKeyDown, resetView } from './keyboard';
import { reflow } from './util';
import renderer from './renderer';

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

flexCenter.appendChild(renderer.canvas);

resetView();

function render() {
    stats.begin();

    // reflow(renderer.canvas);

    renderer.sample();
    renderer.display();

    stats.end();
    // setTimeout(requestAnimationFrame.bind(null, render), 1000);
    requestAnimationFrame(render);
}
render();
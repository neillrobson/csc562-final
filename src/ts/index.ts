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

function toNumberAndScreenReset(value: String) {
    this.object[this.property] = Number(value);
    renderer.resetSampler();
}

const gui = new dat.GUI();
const generalFolder = gui.addFolder("General");
generalFolder.add(featureToggles, "zFunctionIterations", 1, 16, 1).onChange(toNumberAndScreenReset);
generalFolder.add(featureToggles, "rayMarchIterations", 1, 128, 1).onChange(toNumberAndScreenReset);
generalFolder.add(featureToggles, "antialias").onChange(renderer.resetSampler.bind(renderer));
generalFolder.add(featureToggles, "screenFillType", { Shrink: 0, Stretch: 1 }).onChange(toNumberAndScreenReset);
generalFolder.add(featureToggles, "mandelbulbPower", 1, 20).onChange(toNumberAndScreenReset);
generalFolder.add(featureToggles, "useGammaCorrection").onChange(renderer.resetSampler.bind(renderer));

gui.add(featureToggles, "shadingType", { BlinnPhong: 0, Global: 1 }).onChange(toNumberAndScreenReset);

const globalIlluminationFolder = gui.addFolder("Global Illumination");
globalIlluminationFolder.add(featureToggles, "useDirectLighting").onChange(renderer.resetSampler.bind(renderer));
globalIlluminationFolder.add(featureToggles, "bounces", 1, 16, 1).onChange(toNumberAndScreenReset);
globalIlluminationFolder.add(featureToggles, "lightTheta", 0, 1).onChange(toNumberAndScreenReset);
globalIlluminationFolder.add(featureToggles, "lightPhi", 0, 1).onChange(toNumberAndScreenReset);
globalIlluminationFolder.add(featureToggles, "lightIntensity", 0, 16).onChange(toNumberAndScreenReset);
globalIlluminationFolder.add(featureToggles, "lightRadius", 0, 10).onChange(toNumberAndScreenReset);
globalIlluminationFolder.add(featureToggles, "fractalRoughness", 0, 1).onChange(toNumberAndScreenReset);
globalIlluminationFolder.addColor(featureToggles, "skyboxColorUp").onChange(renderer.resetSampler.bind(renderer));
globalIlluminationFolder.addColor(featureToggles, "skyboxColorDown").onChange(renderer.resetSampler.bind(renderer));

const preethamFolder = gui.addFolder("Preetham Illumination");
preethamFolder.add(featureToggles, "turbidity", 0, 16).onChange(toNumberAndScreenReset);
preethamFolder.add(featureToggles, "SkyFactor", 0, 2).onChange(toNumberAndScreenReset);
preethamFolder.add(featureToggles, "usePreethamModel").onChange(renderer.resetSampler.bind(renderer));

const flexCenter = document.createElement("div");
flexCenter.style.width = "100vw";
flexCenter.style.height = "100vh";
flexCenter.style.display = "flex";
flexCenter.style.justifyContent = "center";
flexCenter.style.alignItems = "center";
flexCenter.style.overflow = "hidden";
document.body.appendChild(flexCenter);

flexCenter.appendChild(renderer.canvas);

resetView();

function render() {
    stats.begin();

    reflow(renderer.canvas);

    renderer.sample();
    renderer.display();

    stats.end();
    requestAnimationFrame(render);
}
render();
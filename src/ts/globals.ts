import { vec3 } from "gl-matrix";

const DEFAULT_EYE = vec3.fromValues(0, 0, 3);
const DEFAULT_CENTER = vec3.fromValues(0, 0, -1);
const DEFAULT_UP = vec3.fromValues(0, 1, 0);
const viewDelta = 0.01;
// Side length of random lookup textures
const RAND_SIZE = 1024;

const featureToggles = {
    antialias: true,
    bounces: 3,
    shadingType: 1,
    zFunctionIterations: 10,
    rayMarchIterations: 100,
    backgroundType: 1,
    useDirectLighting: true,
    resolution: 512,
    screenFillType: 0,
    lightRadius: 2,
    lightIntensity: 4.1,
    lightAngle: 0,
    fractalRoughness: 0.5,
    skyboxColorUp: [ 255, 128, 128 ],
    skyboxColorDown: [ 128, 64, 255 ],
    lightTheta: 0.7,
    lightPhi: 0.2,
    usePreethamModel: true,
    turbidity: 2,
    SkyFactor: 1,
    useGammaCorrection: true,
    mandelbulbPower: 8,
};

const cameraPosition = {
    eye: vec3.create(),
    center: vec3.create(),
    up: vec3.create()
};

export {
    DEFAULT_EYE,
    DEFAULT_CENTER,
    DEFAULT_UP,
    viewDelta,
    RAND_SIZE,
    featureToggles,
    cameraPosition
}
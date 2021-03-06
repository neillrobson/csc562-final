import * as REGL from 'regl';
import { vec2, vec3, mat4 } from 'gl-matrix';

import { RAND_SIZE, featureToggles, cameraPosition } from './globals';
import sampleFragmentSource from '../glsl/sample.fs';
import displayFragmentSource from '../glsl/display.fs';
import vertexSource from '../glsl/vertex.glsl';

const canvas = document.createElement("canvas");
canvas.width = canvas.height = featureToggles.resolution;

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

class Renderer {
    private regl: REGL.Regl;
    private tRand2Uniform: REGL.Texture2D;
    private tRand2Normal: REGL.Texture2D;
    private tRand3Normal: REGL.Texture2D;
    private pingPongBuffers: Array<REGL.Framebuffer2D>;
    private reglSample: REGL.DrawCommand;
    private reglDisplay: REGL.DrawCommand;
    private numPings = 0;
    private ping = 0;

    constructor(public canvas: HTMLCanvasElement) {
        this.regl = REGL({
            canvas,
            extensions: ['OES_texture_float'],
            attributes: {
                preserveDrawingBuffer: true
            }
        });

        this.tRand2Uniform = this.regl.texture({
            width: RAND_SIZE,
            height: RAND_SIZE,
            data: dRand2Uniform,
            type: "float",
            format: "luminance alpha",
            wrap: "repeat"
        });

        this.tRand2Normal = this.regl.texture({
            width: RAND_SIZE,
            height: RAND_SIZE,
            data: dRand2Normal,
            type: "float",
            format: "luminance alpha",
            wrap: "repeat"
        });

        this.tRand3Normal = this.regl.texture({
            width: RAND_SIZE,
            height: RAND_SIZE,
            data: dRand3Normal,
            type: "float",
            format: "rgb",
            wrap: "repeat"
        });

        this.pingPongBuffers = [
            this.regl.framebuffer({ width: canvas.width, height: canvas.height, colorType: "float" }),
            this.regl.framebuffer({ width: canvas.width, height: canvas.height, colorType: "float" })
        ];

        this.reglSample = this.regl({
            vert: vertexSource,
            frag: sampleFragmentSource,
            attributes: {
                a_vertex: [
                    -1, -1,
                    1, -1,
                    -1, 1,
                    1, 1
                ]
            },
            uniforms: {
                viewportWidth: this.regl.context('viewportWidth'),
                viewportHeight: this.regl.context('viewportHeight'),
                eye: this.reglProp("eye"),
                rayMarchIterations: this.reglProp("rayMarchIterations"),
                shadingType: this.reglProp("shadingType"),
                targetTransform: this.reglProp("targetTransform"),
                zFunctionIterations: this.reglProp("zFunctionIterations"),
                tRand2Uniform: this.tRand2Uniform,
                tRand2Normal: this.tRand2Normal,
                tRand3Normal: this.tRand3Normal,
                rand: this.reglProp('rand'),
                source: this.reglProp('source'),
                antialias: this.reglProp('antialias'),
                usePreethamModel: this.reglProp('usePreethamModel'),
                bounces: this.reglProp('bounces'),
                useDirectLighting: this.reglProp('useDirectLighting'),
                fractalRoughness: this.reglProp('fractalRoughness'),
                lightRadius: this.reglProp('lightRadius'),
                lightTheta: this.reglProp('lightTheta'),
                lightPhi: this.reglProp('lightPhi'),
                lightIntensity: this.reglProp('lightIntensity'),
                skyboxColorUp: this.reglProp('skyboxColorUp'),
                skyboxColorDown: this.reglProp('skyboxColorDown'),
                turbidity: this.reglProp('turbidity'),
                SkyFactor: this.reglProp('SkyFactor'),
                mandelbulbPower: this.reglProp('mandelbulbPower'),
            },
            framebuffer: this.reglProp('destination'),
            depth: { enable: false },
            primitive: 'triangle strip',
            count: 4
        });
        this.reglDisplay = this.regl({
            vert: vertexSource,
            frag: displayFragmentSource,
            attributes: {
                a_vertex: [
                    -1, -1,
                    1, -1,
                    -1, 1,
                    1, 1
                ]
            },
            uniforms: {
                viewportWidth: this.regl.context('viewportWidth'),
                viewportHeight: this.regl.context('viewportHeight'),
                source: this.reglProp('source'),
                numPings: this.reglProp('numPings'),
                useGammaCorrection: this.reglProp('useGammaCorrection'),
            },
            depth: { enable: false },
            primitive: 'triangle strip',
            count: 4
        });
    }

    reglProp<Props extends {}>(name: keyof Props) {
        return this.regl.prop<Props, keyof Props>(name);
    }

    resetSampler() {
        this.regl.clear({ color: [0, 0, 0, 1], depth: 1, framebuffer: this.pingPongBuffers[0] });
        this.regl.clear({ color: [0, 0, 0, 1], depth: 1, framebuffer: this.pingPongBuffers[1] });
        this.numPings = 0;
    }

    sample() {
        // Matrix that transforms camera-space direction vectors to world-space direction.
        let lookAt = vec3.subtract(vec3.create(), cameraPosition.center, cameraPosition.eye);
        vec3.normalize(lookAt, lookAt);
        let normUp = vec3.normalize(vec3.create(), cameraPosition.up);
        let targetTransform = mat4.targetTo(mat4.create(), vec3.create(), lookAt, normUp);

        this.reglSample({
            eye: cameraPosition.eye,
            rayMarchIterations: featureToggles.rayMarchIterations,
            shadingType: featureToggles.shadingType,
            targetTransform: targetTransform,
            useDirectLighting: featureToggles.useDirectLighting,
            zFunctionIterations: featureToggles.zFunctionIterations,
            rand: [Math.random(), Math.random()],
            source: this.pingPongBuffers[this.ping],
            destination: this.pingPongBuffers[1 - this.ping],
            antialias: featureToggles.antialias,
            usePreethamModel: featureToggles.usePreethamModel,
            bounces: featureToggles.bounces,
            turbidity: featureToggles.turbidity,
            SkyFactor: featureToggles.SkyFactor,
            lightIntensity: featureToggles.lightIntensity,
            lightTheta: featureToggles.lightTheta,
            lightPhi: featureToggles.lightPhi,
            lightRadius: featureToggles.lightRadius,
            fractalRoughness: featureToggles.fractalRoughness,
            mandelbulbPower: featureToggles.mandelbulbPower,
            skyboxColorUp: featureToggles.skyboxColorUp.map(x => x / 255),
            skyboxColorDown: featureToggles.skyboxColorDown.map(x => x / 255),
        });

        this.ping = 1 - this.ping;
        this.numPings += 1;
    }

    display() {
        this.reglDisplay({
            source: this.pingPongBuffers[this.ping],
            numPings: this.numPings,
            useGammaCorrection: featureToggles.useGammaCorrection,
        });
    }

    resize(resolution: number) {
        this.canvas.width = this.canvas.height = resolution;
        this.pingPongBuffers.forEach(buffer => {
            buffer.resize(resolution);
        });
        this.resetSampler();
    }
}

export default new Renderer(canvas);
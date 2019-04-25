import { ShaderProgramContainer } from "./setup";
import { ModelData } from "./models";
import { mat4, vec3 } from "gl-matrix";
import { Center, Eye, Up, zFunctionType, shadingType } from "./keyboard";

/**
 * Calls the shaders to draw the given shapes on the canvas.
 * 
 * @param gl WebGL global control obj
 * @param programContainer Compiled shader program and uniform pointers
 * @param models Triangle data to draw
 */
function renderModels(gl: WebGL2RenderingContext, programContainer: ShaderProgramContainer, modelData: ModelData) {
    gl.clear(gl.DEPTH_BUFFER_BIT || gl.COLOR_BUFFER_BIT);
    gl.useProgram(programContainer.program);

    // Matrix that transforms camera-space direction vectors to world-space direction.
    let lookAt = vec3.subtract(vec3.create(), Center, Eye);
    vec3.normalize(lookAt, lookAt);
    let normUp = vec3.normalize(vec3.create(), Up);
    let targetTransform = mat4.targetTo(mat4.create(), vec3.create(), lookAt, normUp);
    
    let xywh: number[] = gl.getParameter(gl.VIEWPORT);

    // Set up uniforms
    gl.uniform2f(programContainer.p_u_resolution, xywh[2], xywh[3]);
    gl.uniform3fv(programContainer.p_u_eye, Eye);
    gl.uniformMatrix4fv(programContainer.p_u_targetTransform, false, targetTransform);

    // Feature toggles
    gl.uniform1i(programContainer.featureToggles["u_zFunctionType"], zFunctionType);
    gl.uniform1i(programContainer.featureToggles["u_shadingType"], shadingType);

    gl.bindVertexArray(modelData.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, modelData.numVertices);
}

export { renderModels };
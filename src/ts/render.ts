import { ShaderProgramContainer } from "./setup";
import { ModelData } from "./models";

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
    
    // Set up uniforms
    let xywh: number[] = gl.getParameter(gl.VIEWPORT);
    gl.uniform2f(programContainer.p_u_resolution, xywh[2], xywh[3]);

    gl.bindVertexArray(modelData.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, modelData.numVertices);
}

export { renderModels };
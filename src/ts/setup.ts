/**
 * Naming convention:
 * First character is the immediate type of data. p = pointer
 * Remainder is the name of the shader variable.
 * u = uniform
 * a = attribute
 * etc.
 */
interface ShaderProgramContainer {
    program: WebGLProgram,
    p_u_resolution: WebGLUniformLocation,
    p_u_eye: WebGLUniformLocation,
    p_u_targetTransform: WebGLUniformLocation,

    // Feature toggles
    p_u_zFunctionType: WebGLUniformLocation,
    p_u_shadingType: WebGLUniformLocation,
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        return program;
    }
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function setupShaderProgram(gl: WebGL2RenderingContext, vSource: string, fSource: string): ShaderProgramContainer {
    let vertexShader = createShader(gl, gl.VERTEX_SHADER, vSource);
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fSource);
    let program = createProgram(gl, vertexShader, fragmentShader);

    // Uniforms
    let p_u_resolution = gl.getUniformLocation(program, "u_resolution");
    let p_u_eye = gl.getUniformLocation(program, "u_eye");
    let p_u_targetTransform = gl.getUniformLocation(program, "u_targetTransform");

    // Feature toggles
    let p_u_zFunctionType = gl.getUniformLocation(program, "u_zFunctionType");
    let p_u_shadingType = gl.getUniformLocation(program, "u_shadingType");

    return {
        program,
        p_u_resolution,
        p_u_eye,
        p_u_targetTransform,
        p_u_zFunctionType,
        p_u_shadingType
    };
}

export { ShaderProgramContainer, setupShaderProgram };
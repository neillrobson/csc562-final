interface ModelData {
    vao: WebGLVertexArrayObject
    numVertices: number
}

/**
 * Create the VAO for a given set of vertices.
 * @param gl Renderer
 * @param program Compiled program
 * @param vertices 1D array of concatenated vertex coordinate sets
 * @param size Number of buffer components (coordinate values) per vertex
 */
function makeTriangleVAO(gl: WebGL2RenderingContext, program: WebGLProgram, vertices: number[], size: number): WebGLVertexArrayObject {
    let vertexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    let vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    bindAttribute(gl, program, "a_vertex", vertexBuffer, size);

    return vao;
}

/**
 * Tell WebGL to pull data for the given attribute from the given buffer.
 * @param gl Renderer
 * @param program Compiled program
 * @param name Identifier of attribute in shader
 * @param buffer Data to load into attribute
 * @param size Number of buffer components per attribute
 */
function bindAttribute(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, buffer: WebGLBuffer, size: number) {
    let attributeLocation = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(attributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attributeLocation, size, gl.FLOAT, false, 0, 0);
}

function makeModelData(gl: WebGL2RenderingContext, program: WebGLProgram): ModelData {
    let vertices = [
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ];
    let size = 2;
    return {
        vao: makeTriangleVAO(gl, program, vertices, size),
        numVertices: vertices.length / size
    };
}

export { ModelData, makeModelData }
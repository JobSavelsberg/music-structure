import * as log from "../dev/log";
let gl;
let program;
let bufferSize = 0;

let translateLoc;
let scaleLoc;
export function init(canvas) {
    gl = canvas.getContext("webgl2");

    if (!gl) {
        log.warn("WebGL not supported, falling back on experimental WebGL");
        gl = canvas.getContext("experimental-webgl2");
        if (!gl) alert("Your browser does not support WebGL");
    }

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let vertexShader = gl.createShader(gl.VERTEX_SHADER);
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertexShaderText);
    gl.shaderSource(fragmentShader, fragmentShaderText);

    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        log.error("ERROR compiling vertex shader!", gl.getShaderInfoLog(vertexShader));
        return;
    }
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        log.error("ERROR compiling fragment shader!", gl.getShaderInfoLog(fragmentShader));
        return;
    }

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("ERROR linking program!", gl.getProgramInfoLof(program));
        return;
    }

    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        console.error("ERROR validating program!", gl.getProgramInfoLog(program));
        return;
    }

    translateLoc = gl.getUniformLocation(program, "translate");
    scaleLoc = gl.getUniformLocation(program, "scale");

    const rectangleVertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rectangleVertexBufferObject);

    const vertAttribLocation = gl.getAttribLocation(program, "vert");
    gl.vertexAttribPointer(
        vertAttribLocation,
        3, // Number of elements per attribute (x, y, value)
        gl.FLOAT, // Type of element
        gl.FALSE, // data normalized
        3 * Float32Array.BYTES_PER_ELEMENT, // Size of one vertex
        0 // Offset from beginning of single vertex
    );
    gl.enableVertexAttribArray(vertAttribLocation);
}

export function clear() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}
export function setSSMDataArray(vertices) {
    bufferSize = vertices.length / 3;
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
}

export function createSSMDataArray(track, ssm) {
    const segmentStartDuration = track.getSegmentStartDuration();
    const size = segmentStartDuration.length;

    bufferSize = size * size * 6;
    if (bufferSize > 22e6) {
        log.error("Buffer OVERFLOW with size", bufferSize);
    } else {
        log.debug("Buffer size", bufferSize);
    }

    const halfDuration = track.getAnalysisDuration() / 2;
    function st(pos) {
        return pos / halfDuration - 1;
    } // Scale and translate

    const ssmVertices = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const value = ssm.getValueNormalizedMirrored(x, y);
            const left = st(segmentStartDuration[x][0]);
            const top = -st(segmentStartDuration[y][0]);
            const right = st(segmentStartDuration[x][0] + segmentStartDuration[x][1]);
            const bottom = -st(segmentStartDuration[y][0] + segmentStartDuration[y][1]);
            ssmVertices.push(
                left,
                top,
                value,
                left,
                bottom,
                value,
                right,
                top,
                value,
                right,
                top,
                value,
                left,
                bottom,
                value,
                right,
                bottom,
                value
            );
        }
    }

    return new Float32Array(ssmVertices);
}

export function drawSSM(xCenterPositionNormalized, scale) {
    //Main render loop

    gl.useProgram(program);
    gl.uniform2f(translateLoc, 1 - xCenterPositionNormalized * 2, 0);
    gl.uniform1f(scaleLoc, scale);
    //gl.drawElements(gl.TRIANGLES, bufferSize, gl.UNSIGNED_SHORT, 0);
    gl.drawArrays(gl.TRIANGLES, 0, bufferSize);
}

const vertexShaderText = [
    "#version 300 es",
    "precision mediump float;",
    "uniform vec2 translate;",
    "uniform float scale;",
    "in vec3 vert;",
    "flat out float color;",
    "",
    "void main()",
    "{",
    " gl_Position = vec4((vert.x + translate.x)*scale, (vert.y+translate.y)*scale, 0.0, 1.0);",
    " color = vert.z;",
    "}",
].join("\n");

const fragmentShaderText = [
    "#version 300 es",
    "precision mediump float;",
    "",
    "flat in float color;",
    "out vec4 fragColor;",
    "void main()",
    "{",
    " fragColor = vec4(color, color, color, 1.0);",
    "}",
].join("\n");

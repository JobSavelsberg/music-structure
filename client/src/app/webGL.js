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

export function createScoreMatrixDataArray(track, scoreMatrix) {
    const duration = track.getSegmentStartDuration()[0][1]; // get duration of first element
    const size = track.getSegmentStartDuration().length / 2;
    const timechunkWidth = scoreMatrix.length / size;
    let maxValue = 0;
    let minValue = 0;
    for (let i = 0; i < scoreMatrix.length; i++) {
        if (scoreMatrix[i] > maxValue) {
            maxValue = scoreMatrix[i];
        }
        if (scoreMatrix[i] < minValue) {
            minValue = scoreMatrix[i];
        }
    }
    log.debug(size, timechunkWidth, duration, maxValue);
    bufferSize = size * timechunkWidth * 6;
    if (bufferSize > 22e6) {
        log.error("Buffer OVERFLOW with size", bufferSize);
    } else {
        log.debug("Buffer size", bufferSize);
    }

    const halfDuration = (size * duration) / 2;
    function st(pos) {
        return pos / halfDuration - 1;
    } // Scale and translate

    const ssmVertices = [];

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < timechunkWidth; x++) {
            const value = scoreMatrix[y * timechunkWidth + x] / maxValue;
            const left = st(x * duration);
            const top = st(y * duration);
            const right = st(x * duration + duration);
            const bottom = st(y * duration + duration);
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
    log.debug(ssmVertices.length);
    return new Float32Array(ssmVertices);
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
        const cellsBefore = y * y + y;
        for (let x = 0; x < size; x++) {
            if (ssm[cellsBefore + x * 2] / 255.0 > 1) {
                log.warn(ssm[cellsBefore + x * 2]);
            }
            if (ssm[x * x + x + y * 2 + 1] / 255.0 > 1) {
                log.warn(ssm[x * x + x + y * 2 + 1]);
            }
            const value = y >= x ? ssm[cellsBefore + x * 2] / 255.0 : ssm[x * x + x + y * 2 + 1] / 255.0;
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

export function setSSMData(track) {
    const segments = track.segmentObjects;
    const ssm = track.ssm;
    const size = segments.length;
    bufferSize = size * size * 6;
    if (bufferSize > Math.pow(2, 32)) {
        log.error("Buffer OVERFLOW with size", bufferSize);
    } else {
        log.debug("Buffer size", bufferSize);
    }

    const halfDuration = track.getAnalysisDuration() / 2;
    function st(pos) {
        return pos / halfDuration - 1;
    } // Scale and translate

    const end = st(segments[size - 1].start + segments[size - 1].duration);
    const ssmVertices = [];

    for (let y = 0; y < size; y++) {
        const cellsBefore = y * y + y;
        for (let x = 0; x < size; x++) {
            const value = Math.min(1, x >= y ? ssm[cellsBefore + x * 2][0] : 0);
            ssmVertices.push(st(segments[x].start), st(segments[y].start), 1);
        }
        ssmVertices.push(end, st(segments[y].start), 0); // .1 is duration of segment(i)
    }
    for (let x = 0; x < size; x++) {
        ssmVertices.push(st(segments[x].start), end, 0); // size * 0.1 in reality is segment(size-1).start + segment(size-1).duration
    }
    ssmVertices.push(end, end, 0); // size * 0.1 in reality is segment(size-1).start + segment(size-1).duration

    // Fill the current element array buffer with data
    const ssmIndeces = [];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            // 1 rect = 2 triangles counterclockwise divided by backward slash \
            const topleft = y * (size + 1) + x;
            const bottomleft = (y + 1) * (size + 1) + x;
            ssmIndeces.push(bottomleft, bottomleft + 1, topleft);
            ssmIndeces.push(bottomleft + 1, topleft + 1, topleft);
        }
    }
    // create the buffer
    const indexBuffer = gl.createBuffer();
    // make this buffer the current 'ELEMENT_ARRAY_BUFFER'
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ssmIndeces), gl.STATIC_DRAW);

    const rectangleVertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rectangleVertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ssmVertices), gl.STATIC_DRAW);

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

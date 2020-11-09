import { buffer } from "d3";
import * as log from "../../dev/log";
import Matrix from "../dataStructures/Matrix";

export default class webGLCanvas {
    gl;
    program;

    bufferSize = 0;

    translateLoc;
    scaleLoc;

    useColor;

    constructor(canvas, useColor = false) {
        this.useColor = useColor;
        if (!canvas) {
            log.warn("canvas not ready");
            return;
        }

        this.gl = canvas.getContext("webgl2");

        if (!this.gl) {
            log.warn("WebGL not supported, falling back on experimental WebGL");
            this.gl = canvas.getContext("experimental-webgl2");
            if (!this.gl) alert("Your browser does not support WebGL");
        }

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        let vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        let fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);

        if (useColor) {
            this.gl.shaderSource(vertexShader, this.vertexShaderTextColor);
            this.gl.shaderSource(fragmentShader, this.fragmentShaderTextColor);
        } else {
            this.gl.shaderSource(vertexShader, this.vertexShaderTextGreyscale);
            this.gl.shaderSource(fragmentShader, this.fragmentShaderTextGreyscale);
        }

        this.gl.compileShader(vertexShader);
        if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
            log.error("ERROR compiling vertex shader!", this.gl.getShaderInfoLog(vertexShader));
            return;
        }
        this.gl.compileShader(fragmentShader);
        if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
            log.error("ERROR compiling fragment shader!", this.gl.getShaderInfoLog(fragmentShader));
            return;
        }

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error("ERROR linking program!", this.gl.getProgramInfoLof(this.program));
            return;
        }

        this.gl.validateProgram(this.program);
        if (!this.gl.getProgramParameter(this.program, this.gl.VALIDATE_STATUS)) {
            console.error("ERROR validating program!", this.gl.getProgramInfoLog(this.program));
            return;
        }

        this.translateLoc = this.gl.getUniformLocation(this.program, "translate");
        this.scaleLoc = this.gl.getUniformLocation(this.program, "scale");
    }

    setHeight(height) {
        this.gl.canvas.height = height;
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    }

    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    setBufferData(bufferData) {
        this.bufferSize = bufferData.verts.length / 2;

        // Vertex buffer
        // Create an empty buffer object to store the vertex buffer
        const rectangleVertexBufferObject = this.gl.createBuffer();

        //Bind appropriate array buffer to it
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, rectangleVertexBufferObject);

        // Pass the vertex data to the buffer
        this.gl.bufferData(this.gl.ARRAY_BUFFER, bufferData.verts, this.gl.STATIC_DRAW);

        // Unbind the buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        // Color buffer
        const colorBufferObject = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBufferObject);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, bufferData.colors, this.gl.STATIC_DRAW);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);

        // Bind vertex buffer object
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, rectangleVertexBufferObject);

        // Get the attribute location
        const vertAttribLocation = this.gl.getAttribLocation(this.program, "vert");

        // Point an attribute to the currently bound VBO
        this.gl.vertexAttribPointer(
            vertAttribLocation,
            2, // Number of elements per attribute (x, y)
            this.gl.FLOAT, // Type of element
            this.gl.FALSE, // data normalized
            2 * Float32Array.BYTES_PER_ELEMENT, // Size of one vertex
            0 // Offset from beginning of single vertex
        );

        // Enable the attribute
        this.gl.enableVertexAttribArray(vertAttribLocation);

        // bind the color buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, colorBufferObject);

        // get the attribute location
        const colorAttribLocation = this.gl.getAttribLocation(this.program, "vertColor");

        // point attribute to the color buffer object
        this.gl.vertexAttribPointer(
            colorAttribLocation,
            3, // Number of elements per attribute (r, g, b)
            this.gl.FLOAT, // Type of element
            this.gl.FALSE, // data normalized
            3 * Float32Array.BYTES_PER_ELEMENT, // Size of one vertex
            0 // Offset from beginning of single vertex
        );
        // enable the color attribute
        this.gl.enableVertexAttribArray(colorAttribLocation);
    }

    draw(translateX, translateY, scaleX, scaleY) {
        //Main render loop
        this.gl.useProgram(this.program);
        this.gl.uniform2f(this.translateLoc, translateX, translateY);
        this.gl.uniform2f(this.scaleLoc, scaleX, scaleY);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, this.bufferSize);
    }

    vertexShaderTextGreyscale = [
        "#version 300 es",
        "precision mediump float;",
        "uniform vec2 translate;",
        "uniform vec2 scale;",
        "in vec2 vert;",
        "in vec3 vertColor;",
        "flat out vec3 color;",
        "",
        "void main()",
        "{",
        " gl_Position = vec4((vert.x*scale.x + translate.x), (vert.y*scale.y+translate.y), 0.0, 1.0);",
        " color = vertColor;",
        "}",
    ].join("\n");

    vertexShaderTextColor = [
        "#version 300 es",
        "precision mediump float;",
        "uniform vec2 translate;",
        "uniform vec2 scale;",
        "in vec2 vert;",
        "in vec3 vertColor;",
        "flat out vec3 color;",
        "",
        "void main()",
        "{",
        " gl_Position = vec4((vert.x*scale.x + translate.x), (vert.y*scale.y+translate.y), 0.0, 1.0);",
        " color = vertColor;",
        "}",
    ].join("\n");

    fragmentShaderTextGreyscale = [
        "#version 300 es",
        "precision mediump float;",
        "",
        "flat in vec3 color;",
        "out vec4 fragColor;",
        "void main()",
        "{",
        " fragColor = vec4(color, 1.0);",
        "}",
    ].join("\n");

    fragmentShaderTextColor = [
        "#version 300 es",
        "precision mediump float;",
        "",
        "flat in vec3 color;",
        "out vec4 fragColor;",
        "void main()",
        "{",
        " fragColor = vec4(color, 1.0);",
        "}",
    ].join("\n");
}

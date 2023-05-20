let gl;
let canvas;
let timeUniformLocation;
let aspectUniformLocation;

let fbTexture = new Array(2);
let fb = new Array(2);
let texUnit = new Array(2);
let texUnitUf = new Array(2);
let textureUniformLocation;
let curr_fb = 0;

let pgm;

// maybe the association of framebuffers and textures needs to be reversed

async function init() {
  canvas = document.getElementById("canvas");
  gl = canvas.getContext("webgl2", {antialias: false});
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
    return;
  }

  texUnit = [gl.TEXTURE0, gl.TEXTURE1];
  texUnitUf = [0, 1];

  window.addEventListener("resize", resizeCanvas);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  
  {
    const vertexShaderSource = await fetchShaderSource('shaders/shader.vert');
    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShaderSource = await fetchShaderSource('shaders/shader.frag');
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    pgm = linkProgram(vertexShader, fragmentShader);
  }
  gl.useProgram(pgm);

  const positionAttributeLocation = gl.getAttribLocation(pgm, "in_pos");
  const uvAttributeLocation = gl.getAttribLocation(pgm, "in_uv");
  timeUniformLocation = gl.getUniformLocation(pgm, 'time');
  aspectUniformLocation = gl.getUniformLocation(pgm, 'aspect');
  textureUniformLocation = gl.getUniformLocation(pgm, 'prev');

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // const positions = [    0.0, 0.5, 0.0,    -0.5, -0.5, 0.0,    0.5, -0.5, 0.0  ];
  // const positions = [    -1.0, -1.0, 0.0, 0.0, 0.0,    1.0, -1.0, 0.0, 1.0, 0.0,    1.0, 1.0, 0.0, 1.0, 1.0,   -1.0, 1.0, 0.0, 0.0, 1.0  ];
  const vertex_data = [
    // position     // texture coordinates
    -1.0, -1.0, 0.0, 0.0, 0.0,
     1.0, -1.0, 0.0, 1.0, 0.0,
    -1.0,  1.0, 0.0, 0.0, 1.0,
     1.0,  1.0, 0.0, 1.0, 1.0,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex_data), gl.STATIC_DRAW);
  gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 4*5, 0);
  gl.vertexAttribPointer(uvAttributeLocation, 2, gl.FLOAT, false, 4*5, 4*3);
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.enableVertexAttribArray(uvAttributeLocation);

  resizeCanvas();

  // Render the scene
  render();
}

function render() {
  const time = performance.now() / 1000;

  gl.useProgram(pgm);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb[curr_fb]);
  gl.activeTexture(texUnit[1 - curr_fb]);
  gl.bindTexture(gl.TEXTURE_2D, fbTexture[1 - curr_fb]);
  gl.uniform1f(timeUniformLocation, time);
  gl.uniform1i(textureUniformLocation, texUnitUf[1 - curr_fb]);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb[curr_fb]);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  gl.blitFramebuffer(0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const error = gl.getError();
  if (gl.getError() !== gl.NO_ERROR) {
    console.error(`OpenGL error: ${error}`);
  }

  curr_fb = 1 - curr_fb;

  requestAnimationFrame(render);
}

function resizeCanvas() {
  const canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.uniform1f(aspectUniformLocation, canvas.width/canvas.height);
  gl.viewport(0, 0, canvas.width, canvas.height);
  fbTexture[0] = gl.createTexture();
  gl.activeTexture(texUnit[0]);
  gl.bindTexture(gl.TEXTURE_2D, fbTexture[0]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
  // set up framebuffer
  fb[0] = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb[0]);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTexture[0], 0);
  console.assert(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  fbTexture[1] = gl.createTexture();
  gl.activeTexture(texUnit[1]);
  gl.bindTexture(gl.TEXTURE_2D, fbTexture[1]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
  // set up framebuffer
  fb[1] = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb[1]);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTexture[1], 0);
  console.assert(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
}

init();










// Helper function to fetch the source code of a shader
async function fetchShaderSource(url) {
  const response = await fetch(url);
  const text = await response.text();
  return text;
}

// Helper function to compile a shader
function compileShader(source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("An error occurred compiling the shaders:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Helper function to link a program
function linkProgram(vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Unable to link the program:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}
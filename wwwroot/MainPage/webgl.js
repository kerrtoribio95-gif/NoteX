/* ==========================================================================
   MODULE 1: WEBGL PEARL FLUID MESH (LIGHT & DARK MODE READY)
   ========================================================================== */
const pearlCanvas = document.getElementById('webgl-pearl-canvas');
let gl = pearlCanvas.getContext('webgl');
let shaderProgram = null;
let uDarkLoc, uTimeLoc, uResLoc;
let animationFrameId = null;

const vsSource = `
      attribute vec2 a_pos;
      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

const fsSource = `
      precision mediump float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform float u_dark;

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        uv = uv * 2.0 - 1.0;
        uv.x *= u_res.x / u_res.y;

        // Fluid displacement
        float t = u_time * 0.35;
        for (float i = 1.0; i < 4.0; i++) {
          uv.x += 0.35 / i * sin(i * 2.5 * uv.y + t + i * 1.5);
          uv.y += 0.35 / i * cos(i * 2.5 * uv.x + t * 0.8 + i * 2.0);
        }

        // Light Theme Palette: Alabaster & Iridescent Pearl
        vec3 lShadow = vec3(0.580, 0.639, 0.722); // Soft Slate Crease
        vec3 lBase   = vec3(0.886, 0.910, 0.941); // Muted Mist
        vec3 lPearl  = vec3(0.973, 0.980, 0.988); // Pure Alabaster
        vec3 lGlow   = vec3(0.992, 0.910, 0.914); // Rose Quartz Sheen

        // Dark Theme Palette: Deep Obsidian & Onyx Pearl
        vec3 dShadow = vec3(0.024, 0.035, 0.060); // Deepest Void
        vec3 dBase   = vec3(0.043, 0.060, 0.095); // Dark Slate Base
        vec3 dPearl  = vec3(0.080, 0.110, 0.170); // Elevated Slate
        vec3 dGlow   = vec3(0.080, 0.050, 0.140); // Deep Violet Sheen

        float wave  = sin(uv.x * 2.0 + uv.y * 3.0) * 0.5 + 0.5;
        float wave2 = cos(uv.x * 1.5 - uv.y * 2.0) * 0.5 + 0.5;

        // Blend Light Layer
        vec3 colLight = mix(lBase, lShadow, wave * 0.65);
        colLight = mix(colLight, lPearl, wave2 * 0.85);
        colLight = mix(colLight, lGlow, smoothstep(0.68, 0.96, wave * wave2));

        // Blend Dark Layer
        vec3 colDark = mix(dBase, dShadow, wave * 0.65);
        colDark = mix(colDark, dPearl, wave2 * 0.85);
        colDark = mix(colDark, dGlow, smoothstep(0.68, 0.96, wave * wave2));

        // Transition smoothly between Light & Dark modes
        vec3 finalColor = mix(colLight, colDark, u_dark);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

function compileShader(src, type) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}

function initWebGL() {
    if (!gl) return;
    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vs);
    gl.attachShader(shaderProgram, fs);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(shaderProgram, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    uResLoc = gl.getUniformLocation(shaderProgram, 'u_res');
    uTimeLoc = gl.getUniformLocation(shaderProgram, 'u_time');
    uDarkLoc = gl.getUniformLocation(shaderProgram, 'u_dark');
    resizeWebGL();
}

function resizeWebGL() {
    pearlCanvas.width = window.innerWidth;
    pearlCanvas.height = window.innerHeight;
    if (gl) {
        gl.viewport(0, 0, pearlCanvas.width, pearlCanvas.height);
        gl.uniform2f(uResLoc, pearlCanvas.width, pearlCanvas.height);
    }
}
window.addEventListener('resize', resizeWebGL);

function renderWebGL(time) {
    if (!gl || !shaderProgram) return;
    const isDark = document.body.classList.contains('dark') ? 1.0 : 0.0;
    gl.uniform2f(uResLoc, pearlCanvas.width, pearlCanvas.height);
    gl.uniform1f(uTimeLoc, time * 0.001);
    gl.uniform1f(uDarkLoc, isDark);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    animationFrameId = requestAnimationFrame(renderWebGL);
}

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
        animationFrameId = requestAnimationFrame(renderWebGL);
    }
});


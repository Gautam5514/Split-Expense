"use client";

import { useEffect, useRef } from "react";
import { MESH_DRIFT_FRAGMENT } from "./meshDriftShader";
import styles from "./IntelligenceSection.module.css";

const VERTEX = "attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}";
const COLORS = new Float32Array([
  .090, .090, .090, .569, .773, 1.000, .227, .506, .965,
  .145, .388, .937, .102, .306, .855, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);

export default function MeshDriftBackground({ sectionRef, running, reduced }) {
  const canvasRef = useRef(null);
  const elapsedRef = useRef(0);
  const playbackRef = useRef({ running, reduced });
  const resumeRef = useRef(null);

  useEffect(() => {
    playbackRef.current = { running, reduced };
    resumeRef.current?.();
  }, [running, reduced]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl || !section) return;

    let dispose = () => {};
    let lost = false;
    const initialize = () => {
      const shaders = [];
      let program;
      let buffer;
      let frame = 0;
      let previous = 0;
      let lastPaint = 0;
      let disposed = false;
      let width = 1;
      let height = 1;
      const release = () => {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        shaders.forEach((shader) => gl.deleteShader(shader));
      };
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Shader unavailable");
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader compilation failed");
        return shader;
      };
      try {
        program = gl.createProgram();
        if (!program) throw new Error("Program unavailable");
        gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, MESH_DRIFT_FRAGMENT));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Shader linking failed");
        gl.useProgram(program);
        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        // A single fullscreen triangle, with no diagonal seam.
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      } catch {
        release();
        canvas.style.opacity = "0";
        return () => {};
      }
      canvas.style.opacity = "";
      const uniform = (name) => gl.getUniformLocation(program, name);
      const scene = uniform("u_scene");
      const space = uniform("u_space");
      const cursor = uniform("u_cursor");
      gl.uniform3fv(uniform("u_colors[0]"), COLORS);
      gl.uniform4f(uniform("u_shape"), 1.26, .35, .28, 0);
      gl.uniform4f(uniform("u_surface"), 1.82, 1.37, -.02, .68);
      gl.uniform4f(uniform("u_finish"), 0, .54, 0, .22);
      gl.uniform4f(uniform("u_transform"), 1, 0, .06, 1);

      // Cursor was disabled by design; set its uniforms once.
      gl.uniform4f(space, -.05, 0, 0, 0);
      gl.uniform4f(cursor, 0, 4, .50, .80);
      const resizeSurface = () => {
        const cssWidth = Math.max(1, canvas.clientWidth);
        const cssHeight = Math.max(1, canvas.clientHeight);
        // Soft blobs need fewer pixels than text. Bound GPU work even on a
        // tall mobile layout or a high-DPI / ultrawide desktop display.
        const budget = cssWidth <= 760 ? 600_000 : 1_200_000;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.25,
          Math.sqrt(budget / (cssWidth * cssHeight)));
        width = Math.max(1, Math.floor(cssWidth * ratio));
        height = Math.max(1, Math.floor(cssHeight * ratio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
      };
      const paint = () => {
        gl.uniform4f(scene, width, height, elapsedRef.current * 1.09, 5);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      const tick = (now) => {
        frame = 0;
        if (disposed || lost || document.hidden || !playbackRef.current.running || playbackRef.current.reduced) return;
        if (previous) elapsedRef.current += Math.min((now - previous) / 1000, .1);
        previous = now;
        if (now - lastPaint >= 1000 / 30) {
          lastPaint = now;
          paint();
        }
        frame = requestAnimationFrame(tick);
      };
      const resume = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        previous = 0;
        if (!disposed && !lost && !document.hidden && playbackRef.current.running && !playbackRef.current.reduced) frame = requestAnimationFrame(tick);
      };
      resumeRef.current = resume;
      const resize = new ResizeObserver(() => {
        if (disposed || lost) return;
        resizeSurface();
        if (!document.hidden && playbackRef.current.running) paint();
      });
      resize.observe(canvas);
      document.addEventListener("visibilitychange", resume);
      resizeSurface();
      if (!document.hidden) paint();
      resume();
      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        resize.disconnect();
        resumeRef.current = null;
        document.removeEventListener("visibilitychange", resume);
        release();
      };
    };
    const onLost = (event) => {
      event.preventDefault();
      lost = true;
      dispose();
      canvas.style.opacity = "0";
    };
    const onRestored = () => { lost = false; dispose = initialize(); };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    dispose = initialize();
    return () => {
      dispose();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
    };
  }, [sectionRef]);

  return <canvas ref={canvasRef} className={styles.mesh} aria-hidden="true" />;
}

// @ts-nocheck
"use client";
import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

export const CanvasRevealEffect = ({ animationSpeed = 0.4, opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1], colors = [[0, 255, 255]], containerClassName, dotSize, showGradient = true }: any) => (
  <div className={cn("h-full relative bg-white w-full", containerClassName)}>
    <div className="h-full w-full">
      <DotMatrix colors={colors ?? [[0, 255, 255]]} dotSize={dotSize ?? 3} opacities={opacities ?? [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1]}
        shader={`
          float animation_speed_factor = ${animationSpeed.toFixed(1)};
          float intro_offset = distance(u_resolution / 2.0 / u_total_size, st2) * 0.01 + (random(st2) * 0.15);
          opacity *= step(intro_offset, u_time * animation_speed_factor);
          opacity *= clamp((1.0 - step(intro_offset + 0.1, u_time * animation_speed_factor)) * 1.25, 1.0, 1.25);
        `} center={["x", "y"]} />
    </div>
    {showGradient && <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-[84%]" />}
  </div>
);

const DotMatrix = ({ colors = [[0, 0, 0]], opacities = [0.04, 0.04, 0.04, 0.04, 0.04, 0.08, 0.08, 0.08, 0.08, 0.14], totalSize = 4, dotSize = 2, shader = "", center = ["x", "y"] }: any) => {
  const uniforms = React.useMemo(() => {
    let arr = [colors[0], colors[0], colors[0], colors[0], colors[0], colors[0]];
    if (colors.length === 2) arr = [colors[0], colors[0], colors[0], colors[1], colors[1], colors[1]];
    else if (colors.length === 3) arr = [colors[0], colors[0], colors[1], colors[1], colors[2], colors[2]];
    return {
      u_colors: { value: arr.map((c) => [c[0] / 255, c[1] / 255, c[2] / 255]), type: "uniform3fv" },
      u_opacities: { value: opacities, type: "uniform1fv" },
      u_total_size: { value: totalSize, type: "uniform1f" },
      u_dot_size: { value: dotSize, type: "uniform1f" },
    };
  }, [colors, opacities, totalSize, dotSize]);
  return (
    <Shader maxFps={60} uniforms={uniforms} source={`
        precision mediump float;
        in vec2 fragCoord;
        uniform float u_time;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_total_size;
        uniform float u_dot_size;
        uniform vec2 u_resolution;
        out vec4 fragColor;
        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) { return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x); }
        float map(float value, float min1, float max1, float min2, float max2) { return min2 + (value - min1) * (max2 - min2) / (max1 - min1); }
        void main() {
          vec2 st = fragCoord.xy;
          ${center.includes("x") ? "st.x -= abs(floor((mod(u_resolution.x, u_total_size) - u_dot_size) * 0.5));" : ""}
          ${center.includes("y") ? "st.y -= abs(floor((mod(u_resolution.y, u_total_size) - u_dot_size) * 0.5));" : ""}
          float opacity = step(0.0, st.x);
          opacity *= step(0.0, st.y);
          vec2 st2 = vec2(int(st.x / u_total_size), int(st.y / u_total_size));
          float frequency = 5.0;
          float show_offset = random(st2);
          float rand = random(st2 * floor((u_time / frequency) + show_offset + frequency) + 1.0);
          opacity *= u_opacities[int(rand * 10.0)];
          opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.x / u_total_size));
          opacity *= 1.0 - step(u_dot_size / u_total_size, fract(st.y / u_total_size));
          vec3 color = u_colors[int(show_offset * 6.0)];
          ${shader}
          fragColor = vec4(color, opacity);
          fragColor.rgb *= fragColor.a;
        }`} />
  );
};

const ShaderMaterial = ({ source, uniforms, maxFps = 60 }: any) => {
  const { size } = useThree();
  const ref = useRef<any>();
  let lastFrameTime = 0;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (t - lastFrameTime < 1 / maxFps) return;
    lastFrameTime = t;
    ref.current.material.uniforms.u_time.value = t;
  });
  const getUniforms = () => {
    const p: any = {};
    for (const name in uniforms) {
      const u = uniforms[name];
      switch (u.type) {
        case "uniform1f": p[name] = { value: u.value, type: "1f" }; break;
        case "uniform3f": p[name] = { value: new THREE.Vector3().fromArray(u.value), type: "3f" }; break;
        case "uniform1fv": p[name] = { value: u.value, type: "1fv" }; break;
        case "uniform3fv": p[name] = { value: u.value.map((v: any) => new THREE.Vector3().fromArray(v)), type: "3fv" }; break;
        case "uniform2f": p[name] = { value: new THREE.Vector2().fromArray(u.value), type: "2f" }; break;
        default: console.error(`Invalid uniform type for '${name}'.`);
      }
    }
    p["u_time"] = { value: 0, type: "1f" };
    p["u_resolution"] = { value: new THREE.Vector2(size.width * 2, size.height * 2) };
    return p;
  };
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `
      precision mediump float;
      in vec2 coordinates;
      uniform vec2 u_resolution;
      out vec2 fragCoord;
      void main(){
        float x = position.x;
        float y = position.y;
        gl_Position = vec4(x, y, 0.0, 1.0);
        fragCoord = (position.xy + vec2(1.0)) * 0.5 * u_resolution;
        fragCoord.y = u_resolution.y - fragCoord.y;
      }`,
    fragmentShader: source, uniforms: getUniforms(), glslVersion: THREE.GLSL3,
    blending: THREE.CustomBlending, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
  }), [size.width, size.height, source]);
  return (<mesh ref={ref}><planeGeometry args={[2, 2]} /><primitive object={material} attach="material" /></mesh>);
};

const Shader = ({ source, uniforms, maxFps = 60 }: any) => (
  <Canvas className="absolute inset-0  h-full w-full"><ShaderMaterial source={source} uniforms={uniforms} maxFps={maxFps} /></Canvas>
);

"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";

type RingState = "hidden" | "visible";

function Moon({ onReveal }: { onReveal: () => void }) {
  const moon = useRef<THREE.Mesh>(null);
  const texture = useTexture(
    "https://cdn.21st.dev/assets/mirror/fc/fcb0f1f5548e6e18d40063dd55c6aacd3daedf2407b181dab85b61e22bf9fe57.jpg"
  );

  useFrame((_, delta) => {
    if (moon.current) moon.current.rotation.y += delta * 0.045;
  });

  return (
    <mesh
      ref={moon}
      castShadow
      receiveShadow
      onClick={onReveal}
      onPointerEnter={() => { document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { document.body.style.cursor = "auto"; }}
    >
      <sphereGeometry args={[1.95, 64, 64]} />
      <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={0.025} roughness={0.84} metalness={0.08} />
    </mesh>
  );
}

function ExpenseOrbit({ visible }: { visible: boolean }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const reveal = useRef(0);
  const particleCount = 18000;

  const [positions, colors] = useMemo(() => {
    const positionData = new Float32Array(particleCount * 3);
    const colorData = new Float32Array(particleCount * 3);

    for (let index = 0; index < particleCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.pow(Math.random(), 1.55);
      const radius = 2.3 + spread * 2.25;
      const thickness = (Math.random() + Math.random() - 1) * (0.26 - spread * 0.1);
      const offset = index * 3;

      positionData[offset] = Math.cos(angle) * radius;
      positionData[offset + 1] = thickness;
      positionData[offset + 2] = Math.sin(angle) * radius;

      const bright = 0.42 + Math.random() * 0.58;
      colorData[offset] = Math.random() > 0.9 ? 0.55 * bright : 0.1 * bright;
      colorData[offset + 1] = (0.72 + Math.random() * 0.25) * bright;
      colorData[offset + 2] = bright;
    }

    return [positionData, colorData];
  }, []);

  useFrame((_, delta) => {
    reveal.current = THREE.MathUtils.damp(reveal.current, visible ? 1 : 0, 3.2, delta);
    if (points.current) {
      points.current.rotation.y -= delta * 0.035;
      points.current.scale.setScalar(reveal.current);
      points.current.visible = reveal.current > 0.01;
    }
    if (material.current) material.current.opacity = reveal.current * 0.88;
  });

  return (
    <points ref={points} rotation={[-Math.PI / 2.35, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        size={0.013}
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function OrbitingMarkers({ visible }: { visible: boolean }) {
  const group = useRef<THREE.Group>(null);
  const markerData = useMemo(
    () => Array.from({ length: 34 }, (_, index) => ({
      angle: (index / 34) * Math.PI * 2,
      radius: 2.55 + Math.random() * 1.65,
      size: 0.025 + Math.random() * 0.075,
      height: (Math.random() - 0.5) * 0.42,
      speed: 0.035 + Math.random() * 0.045,
    })),
    []
  );

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.z += delta * 0.09;
    group.current.rotation.x = Math.PI / 7 + Math.sin(state.clock.elapsedTime * 0.35) * 0.035;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.045;
    group.current.scale.lerp(new THREE.Vector3(visible ? 1 : 0, visible ? 1 : 0, visible ? 1 : 0), delta * 3);
  });

  return (
    <group ref={group} rotation={[Math.PI / 7, 0, 0]} scale={0}>
      {markerData.map((marker, index) => (
        <mesh
          key={index}
          position={[
            Math.cos(marker.angle) * marker.radius,
            Math.sin(marker.angle) * marker.radius,
            marker.height,
          ]}
        >
          <dodecahedronGeometry args={[marker.size, 0]} />
          <meshStandardMaterial color={index % 7 === 0 ? "#22d3ee" : "#94a3b8"} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export interface LunarGravityCardProps {
  className?: string;
}

export default function LunarGravityCard({ className = "" }: LunarGravityCardProps) {
  const [ringState, setRingState] = useState<RingState>("hidden");
  const visible = ringState === "visible";

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setRingState("visible"), 650);
    return () => window.clearTimeout(revealTimer);
  }, []);

  return (
    <div className={`relative flex min-h-[680px] w-full max-w-[1120px] overflow-hidden rounded-[2rem] bg-[#030303] shadow-[0_40px_120px_rgba(0,0,0,0.55)] md:min-h-0 md:h-[580px] ${className}`}>
      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black via-black/75 to-transparent md:bg-gradient-to-r md:from-black md:via-black/80 md:to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-10 opacity-50 [background-image:radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.16),transparent_28%)]" />

      <div className="pointer-events-none relative z-20 flex w-full flex-col px-7 pb-8 pt-10 sm:px-10 md:w-[48%] md:justify-center md:py-12 md:pl-14 lg:pl-16">
        <div className="mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
          <span className="h-px w-8 bg-cyan-300/70" />
          One shared orbit
        </div>
        <h2 className="max-w-md text-5xl font-semibold leading-[0.93] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.8rem]">
          Bring every<br />expense into<br />balance.
        </h2>
        <p className="mt-7 max-w-sm text-sm font-medium leading-6 text-white/50 sm:text-base sm:leading-7">
          One clear space for every payment, person and balance—so your group always knows what comes next.
        </p>
        <div className="mt-8 flex items-center gap-3 text-xs text-white/35">
          <span className={`h-2 w-2 rounded-full transition-all duration-500 ${visible ? "bg-cyan-300 shadow-[0_0_14px_#22d3ee]" : "bg-white/30"}`} />
          {visible ? "Shared expenses moving in orbit" : "Bringing every expense into orbit"}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[62%] md:inset-y-0 md:left-auto md:right-[-3%] md:h-full md:w-[67%]">
        <Canvas shadows camera={{ position: [0, 4.2, 10], fov: 46 }} dpr={[1, 1.6]}>
          <ambientLight intensity={0.04} />
          <directionalLight position={[7, 6, 6]} intensity={1.8} color="#ffffff" castShadow />
          <directionalLight position={[-4, -2, -4]} intensity={0.45} color="#22d3ee" />
          <Suspense fallback={null}>
            <group rotation={[Math.PI / 10, 0, 0]}>
              <Moon onReveal={() => setRingState("visible")} />
              <ExpenseOrbit visible={visible} />
              <OrbitingMarkers visible={visible} />
            </group>
            <Environment preset="city" />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={0.7} maxPolarAngle={2.2} />
        </Canvas>
      </div>
    </div>
  );
}

export { LunarGravityCard as Component };

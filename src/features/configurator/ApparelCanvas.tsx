// src/features/configurator/ApparelCanvas.tsx

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, useProgress } from "@react-three/drei";
import { Suspense } from "react";
import type { ApparelType, ColorVariant, Viewer3D } from "@/types/api";
import { ApparelMesh } from "./ApparelMesh";

interface Props {
  type: ApparelType;
  color: ColorVariant;
  accent?: string;
  viewer?: Viewer3D;
  onLoadingChange?: (loading: boolean, progress: number) => void;
}

function ProgressReporter({ onLoadingChange }: { onLoadingChange?: (loading: boolean, progress: number) => void }) {
  const { active, progress } = useProgress();
  onLoadingChange?.(active, progress);
  return null;
}

export function ApparelCanvas({ type, color, accent, viewer, onLoadingChange }: Props) {
  const cam = viewer?.camera;
  const orbit = cam?.orbit;
  const hasContactShadows = viewer?.contact_shadows?.enabled ?? true;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: cam?.position ?? [0, 0.2, 6], fov: cam?.fov ?? 35 }}
      gl={{ antialias: true, alpha: true }}
      className="touch-none"
      style={viewer?.background ? { background: viewer.background } : undefined}
    >
      <ambientLight intensity={viewer?.lighting?.ambient ?? 0.55} />
      <hemisphereLight args={["#ffffff", "#1a1a1a", 0.45]} />
      <directionalLight
        position={viewer?.lighting?.key?.position ?? [5, 6, 4]}
        intensity={viewer?.lighting?.key?.intensity ?? 1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={viewer?.lighting?.fill?.position ?? [-4, 2, -3]}
        intensity={viewer?.lighting?.fill?.intensity ?? 0.55}
        color="#C5A059"
      />
      <directionalLight
        position={viewer?.lighting?.rim?.position ?? [0, -3, 4]}
        intensity={viewer?.lighting?.rim?.intensity ?? 0.25}
        color="#ffffff"
      />
      <Suspense fallback={null}>
        <ProgressReporter onLoadingChange={onLoadingChange} />
        {viewer?.environment && <Environment preset={viewer.environment as any} />}
        <ApparelMesh
          type={type}
          color={color}
          accent={accent}
          material={viewer?.material}
          modelUrl={viewer?.model_url}
          modelPosition={viewer?.model_position}
          colorableMeshes={viewer?.colorable_meshes}
          printAreas={viewer?.print_areas}
        />
      </Suspense>
      {hasContactShadows && (
        <ContactShadows
          position={viewer?.contact_shadows?.position ?? [0, -1.9, 0]}
          opacity={viewer?.contact_shadows?.opacity ?? 0.45}
          scale={viewer?.contact_shadows?.scale ?? 8}
          blur={viewer?.contact_shadows?.blur ?? 2.4}
          far={viewer?.contact_shadows?.far ?? 3}
        />
      )}
      <OrbitControls
        enablePan={orbit?.enable_pan ?? false}
        enableZoom={orbit?.enable_zoom ?? true}
        minDistance={orbit?.min_distance ?? 4}
        maxDistance={orbit?.max_distance ?? 9}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        minPolarAngle={orbit?.min_polar_angle ?? Math.PI / 3}
        maxPolarAngle={orbit?.max_polar_angle ?? Math.PI / 1.6}
      />
    </Canvas>
  );
}
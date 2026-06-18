// src/features/configurator/ApparelMesh.tsx

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Decal, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { ApparelType, ColorVariant, Viewer3D, ViewerPrintArea } from "@/types/api";
import { computeDecalTransform, useDecalTransform, FULL_PRINT_PLACEMENTS, type DecalTransform } from "./useDecalTransform";

interface Props {
  type: ApparelType;
  color: ColorVariant;
  accent?: string;
  material?: Viewer3D["material"];
  modelUrl?: string;
  modelPosition?: [number, number, number];
  colorableMeshes?: string[];
  printAreas?: ViewerPrintArea[];
}

export function ApparelMesh({
  type,
  color,
  accent,
  material,
  modelUrl,
  modelPosition,
  colorableMeshes,
  printAreas,
}: Props) {
  const colorHex = color.hex;
  const props = { colorHex, accentHex: accent ?? colorHex, material };

  if (modelUrl) {
    return (
      <GltfApparel
        url={modelUrl}
        colorHex={colorHex}
        material={material}
        position={modelPosition}
        colorableMeshes={colorableMeshes}
        printAreas={printAreas}
      />
    );
  }

  switch (type) {
    case "hoodie":
      return <Hoodie {...props} />;
    case "cap":
      return <Cap {...props} />;
    case "bag":
      return <Bag {...props} />;
    case "longsleeve":
      return <Tee {...props} longSleeve />;
    case "tshirt":
    default:
      return <Tee {...props} />;
  }
}

// ---------- GLTF model renderer ----------

interface GltfApparelProps {
  url: string;
  colorHex: string;
  material?: Viewer3D["material"];
  position?: [number, number, number];
  colorableMeshes?: string[];
  printAreas?: ViewerPrintArea[];
}

function GltfApparel({ url, colorHex, material, position, colorableMeshes = [], printAreas = [] }: GltfApparelProps) {
  const { nodes } = useGLTF(url);

  const meshNodes = useMemo(
    () => Object.values(nodes).filter((n): n is THREE.Mesh => n instanceof THREE.Mesh),
    [nodes],
  );

  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.15;
  });

  return (
    <group ref={group} position={position ?? [0, 0, 0]}>
      {meshNodes.map((node) => {
        const zonesForMesh = printAreas.filter((pa) =>
          pa.mesh_name ? node.name.toLowerCase().includes(pa.mesh_name.toLowerCase()) : true,
        );
        return (
          <ColoredMesh
            key={node.uuid}
            node={node}
            colorHex={colorHex}
            colorableMeshes={colorableMeshes}
            material={material}
            printAreas={zonesForMesh}
          />
        );
      })}
    </group>
  );
}

function ColoredMesh({
  node,
  colorHex,
  colorableMeshes,
  material,
  printAreas,
}: {
  node: THREE.Mesh;
  colorHex: string;
  colorableMeshes: string[];
  material?: Viewer3D["material"];
  printAreas: ViewerPrintArea[];
}) {
  const diffuse = material?.texture_url ? useTexture(material.texture_url) : null;

  const isColorable =
    colorableMeshes.length === 0 ||
    colorableMeshes.some((n) => node.name.toLowerCase().includes(n.toLowerCase()));

  const hasTexture = !!material?.texture_url;
  const hasColor = isColorable && !!colorHex;

  const builtMaterial = useMemo(() => {
    if (!hasColor && !hasTexture) {
      return node.material as THREE.Material;
    }
    if (hasTexture && diffuse) diffuse.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      color: hasColor ? new THREE.Color(colorHex) : undefined,
      map: hasTexture ? diffuse : null,
      roughness: material?.roughness ?? 0.9,
      metalness: material?.metalness ?? 0,
      side: THREE.DoubleSide,
    });
  }, [node, hasColor, hasTexture, colorHex, diffuse, material?.roughness, material?.metalness]);

  return (
    <mesh castShadow receiveShadow geometry={node.geometry} material={builtMaterial}>
      {printAreas
        .filter((pa) => pa.decal?.url)
        .map((pa) => (
          <SavedDecal key={pa.area_key} printArea={pa} meshNode={node} />
        ))}
    </mesh>
  );
}

// ---------- Decal layer ----------

// Replace SavedDecal and SavedDecalWithTexture in ApparelMesh.tsx

function SavedDecal({ printArea, meshNode }: { printArea: ViewerPrintArea; meshNode: THREE.Mesh }) {
  if (!printArea.decal?.url) return null;

  // Full/all-over print: project onto every surface face
  if (printArea.placement === "full") {
    return <FullPrintDecals printArea={printArea} meshNode={meshNode} />;
  }

  return <SavedDecalWithTexture printArea={printArea} meshNode={meshNode} />;
}

/** Renders one decal per surface face for all-over / full-garment prints. */
function FullPrintDecals({ printArea, meshNode }: { printArea: ViewerPrintArea; meshNode: THREE.Mesh }) {
  const decal = printArea.decal!;
  const texture = useTexture(decal.url);

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
  }, [texture]);

  // Compute all face transforms — pure function call, no hook loop
  const transforms = useMemo(() =>
    FULL_PRINT_PLACEMENTS.map((placement) =>
      computeDecalTransform(printArea, decal, meshNode, placement)
    ).filter((t): t is DecalTransform => t !== null),
    [printArea, decal, meshNode],
  );

  return (
    <>
      {transforms.map((transform, i) => (
        <Decal
          key={i}
          position={transform.position}
          rotation={transform.rotation}
          scale={transform.scale}
        >
          <meshStandardMaterial
            map={texture}
            transparent
            alphaTest={0.02}
            depthTest
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-4}
            polygonOffsetUnits={-4}
          />
        </Decal>
      ))}
    </>
  );
}

function SavedDecalWithTexture({ printArea, meshNode }: { printArea: ViewerPrintArea; meshNode: THREE.Mesh }) {
  const transform = useDecalTransform(printArea, meshNode);
  const texture = useTexture(printArea.decal!.url);

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
  }, [texture]);

  if (!transform) return null;

  return (
    <Decal position={transform.position} rotation={transform.rotation} scale={transform.scale}>
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.02}
        depthTest
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </Decal>
  );
}








// ---------- Procedural fallback (unchanged) ----------

interface BodyProps {
  colorHex: string;
  accentHex: string;
  material?: Viewer3D["material"];
}

function useLerpColor(targetHex: string, refs: React.MutableRefObject<THREE.MeshStandardMaterial | null>[]) {
  const target = useMemo(() => new THREE.Color(targetHex), [targetHex]);
  useFrame((_, dt) => {
    for (const r of refs) {
      if (!r.current) continue;
      r.current.color.lerp(target, Math.min(1, dt * 6));
    }
  });
}

function useGentleSpin(ref: React.RefObject<THREE.Group | null>) {
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.15;
  });
}

function Tee({ colorHex, accentHex, material, longSleeve = false }: BodyProps & { longSleeve?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.MeshStandardMaterial>(null);
  useLerpColor(colorHex, [body]);
  useGentleSpin(group);
  const mp = matProps(material);
  const sleeveLen = longSleeve ? 1.5 : 0.7;
  const sleeveX = 1.05 + sleeveLen / 2;
  return (
    <group ref={group} position={[0, -0.2, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.1, 2.6, 0.45]} />
        <meshStandardMaterial ref={body} color={colorHex} {...mp} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.05, 0.45, 32]} />
        <meshStandardMaterial color={colorHex} {...mp} />
      </mesh>
      <mesh position={[sleeveX, 1.0, 0]} rotation={[0, 0, -Math.PI / 2.4]} castShadow>
        <cylinderGeometry args={[0.42, 0.36, sleeveLen, 24]} />
        <meshStandardMaterial color={colorHex} {...mp} />
      </mesh>
      <mesh position={[-sleeveX, 1.0, 0]} rotation={[0, 0, Math.PI / 2.4]} castShadow>
        <cylinderGeometry args={[0.42, 0.36, sleeveLen, 24]} />
        <meshStandardMaterial color={colorHex} {...mp} />
      </mesh>
      <mesh position={[0, 1.45, 0.18]}>
        <torusGeometry args={[0.32, 0.06, 16, 32, Math.PI]} />
        <meshStandardMaterial color={accentHex} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.1, 0.24]}>
        <circleGeometry args={[0.35, 32]} />
        <meshStandardMaterial color="#C5A059" roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

function Hoodie({ colorHex, accentHex, material }: BodyProps) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.MeshStandardMaterial>(null);
  const accent = useRef<THREE.MeshStandardMaterial>(null);
  useLerpColor(colorHex, [body]);
  useLerpColor(accentHex, [accent]);
  useGentleSpin(group);
  const mp = matProps(material);
  return (
    <group ref={group} position={[0, -0.3, 0]}>
      <mesh castShadow>
        <boxGeometry args={[2.3, 2.8, 0.6]} />
        <meshStandardMaterial ref={body} color={colorHex} {...mp} />
      </mesh>
      <mesh position={[0, 1.7, -0.1]} castShadow>
        <sphereGeometry args={[0.85, 24, 24, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        <meshStandardMaterial color={colorHex} {...mp} />
      </mesh>
      <mesh position={[1.55, 1.0, 0]} rotation={[0, 0, -Math.PI / 2.4]} castShadow>
        <cylinderGeometry args={[0.45, 0.4, 1.6, 24]} />
        <meshStandardMaterial color={colorHex} {...mp} />
      </mesh>
      <mesh position={[-1.55, 1.0, 0]} rotation={[0, 0, Math.PI / 2.4]} castShadow>
        <cylinderGeometry args={[0.45, 0.4, 1.6, 24]} />
        <meshStandardMaterial color={colorHex} {...mp} />
      </mesh>
      <mesh position={[0, -0.5, 0.32]}>
        <boxGeometry args={[1.6, 0.7, 0.05]} />
        <meshStandardMaterial ref={accent} color={accentHex} roughness={0.9} />
      </mesh>
      <mesh position={[-0.15, 1.1, 0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
        <meshStandardMaterial color="#C5A059" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0.15, 1.1, 0.3]}>
        <cylinderGeometry args={[0.02, 0.02, 0.45, 8]} />
        <meshStandardMaterial color="#C5A059" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Cap({ colorHex, accentHex, material }: BodyProps) {
  const group = useRef<THREE.Group>(null);
  const crown = useRef<THREE.MeshStandardMaterial>(null);
  const brim = useRef<THREE.MeshStandardMaterial>(null);
  useLerpColor(colorHex, [crown]);
  useLerpColor(accentHex, [brim]);
  useGentleSpin(group);
  const mp = matProps(material);
  return (
    <group ref={group} scale={1.4}>
      <mesh castShadow>
        <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={crown} color={colorHex} {...mp} />
      </mesh>
      <mesh position={[0, -0.02, 0.6]} rotation={[Math.PI / 2.2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 0.08, 32, 1, false, -Math.PI / 2.5, Math.PI / 1.2]} />
        <meshStandardMaterial ref={brim} color={accentHex} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#C5A059" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.4, 0.95]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color="#C5A059" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Bag({ colorHex, accentHex, material }: BodyProps) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.MeshStandardMaterial>(null);
  const accent = useRef<THREE.MeshStandardMaterial>(null);
  useLerpColor(colorHex, [body]);
  useLerpColor(accentHex, [accent]);
  useGentleSpin(group);
  const mp = matProps(material);
  return (
    <group ref={group} position={[0, -0.2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[2.0, 2.3, 0.7]} />
        <meshStandardMaterial ref={body} color={colorHex} {...mp} />
      </mesh>
      <mesh position={[-0.55, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial ref={accent} color={accentHex} roughness={0.5} />
      </mesh>
      <mesh position={[0.55, 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.05, 16, 32, Math.PI]} />
        <meshStandardMaterial color={accentHex} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.3, 0.36]}>
        <planeGeometry args={[0.6, 0.4]} />
        <meshStandardMaterial color={accentHex} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.3, 0.37]}>
        <planeGeometry args={[0.4, 0.12]} />
        <meshStandardMaterial color="#C5A059" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
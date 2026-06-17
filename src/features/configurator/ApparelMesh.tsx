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

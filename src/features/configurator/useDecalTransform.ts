// src/features/configurator/useDecalTransform.ts
//
// Self-contained port of the studio app's useDecalTransform, scoped to
// the marketplace's read-only rendering needs. Reproduces the saved
// decal placement exactly given viewer_3d.print_areas[] data from the
// product detail API — no dependency on the studio (creators) app.


import { useMemo } from "react";
import * as THREE from "three";
import type { ViewerPrintArea, PrintAreaDecal } from "@/types/api";

const CM = 0.01;
const SURFACE_EPSILON = 0.005;

export interface DecalTransform {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Euler;
}

// Placements rendered for a full/all-over print
export const FULL_PRINT_PLACEMENTS = ["front", "back", "left_sleeve", "right_sleeve"] as const;

/**
 * Pure (non-hook) computation — can be called in loops.
 * Used by both useDecalTransform and useFullPrintTransforms.
 */
export function computeDecalTransform(
  printArea: ViewerPrintArea,
  decal: PrintAreaDecal,
  meshNode?: THREE.Mesh,
  placementOverride?: string,
): DecalTransform | null {
  const placement = placementOverride ?? printArea.placement;
  const uv = printArea.uv_config ?? {};
  const worldBounds = placementOverride ? undefined : uv.world_bounds;
  const transformLimits = uv.transform_limits;

  // 1. Base orientation
  const baseRotation = worldBounds?.rotation
    ? new THREE.Euler(...worldBounds.rotation)
    : placementToRotation(placement);
  const baseQuat = new THREE.Quaternion().setFromEuler(baseRotation);

  // 2. Zone centre
  let centre: THREE.Vector3;
  if (worldBounds?.center && !placementOverride) {
    centre = new THREE.Vector3(...worldBounds.center);
  } else if (meshNode) {
    centre = computeCentreFromMesh(placement, meshNode);
  } else {
    centre = getHardcodedCentre(placement);
  }

  // 3. Mesh thickness
  let halfThickness: number;
  if (worldBounds?.half_extents?.[2] != null && !placementOverride) {
    halfThickness = worldBounds.half_extents[2];
  } else if (meshNode) {
    const box = new THREE.Box3().setFromObject(meshNode);
    const size = new THREE.Vector3();
    box.getSize(size);
    halfThickness = Math.min(size.x, size.y, size.z) / 2;
  } else {
    halfThickness = 0.02;
  }

  // 4. Physical print area size
  const widthCm = printArea.width_cm ? Number(printArea.width_cm) : 35;
  const heightCm = printArea.height_cm ? Number(printArea.height_cm) : 42;
  const zoneWidthM = widthCm * CM;
  const zoneHeightM = heightCm * CM;

  // 5. Scale (aspect-preserving)
  const limits = transformLimits ?? {
    min_scale: 0.02,
    max_scale: Math.min(zoneWidthM, zoneHeightM) * 0.95,
  };
  const aspect = decal.aspect_ratio || 1;
  const rawScaleY = Math.max(limits.min_scale, Math.min(limits.max_scale, decal.scale));
  const scaleY = rawScaleY;
  const scaleX = scaleY * aspect;
  const maxWidth = zoneWidthM * 0.95;
  const finalScaleX = Math.min(scaleX, maxWidth);
  const finalScaleY = finalScaleX / aspect;

  // 6. Clamp offsets
  const halfZoneW = zoneWidthM / 2;
  const halfZoneH = zoneHeightM / 2;
  const halfArtW = finalScaleX / 2;
  const halfArtH = finalScaleY / 2;
  const offsetX = Math.max(-halfZoneW + halfArtW, Math.min(halfZoneW - halfArtW, decal.offset_x ?? 0));
  const offsetY = Math.max(-halfZoneH + halfArtH, Math.min(halfZoneH - halfArtH, decal.offset_y ?? 0));

  // 7. World position
  const offsetLocal = new THREE.Vector3(offsetX, offsetY, 0);
  const offsetWorld = offsetLocal.clone().applyQuaternion(baseQuat);
  const position = centre.clone().add(offsetWorld);

  // 8. Z-depth
  const depthZ = halfThickness * 2 + SURFACE_EPSILON * 2;

  // 9. Final rotation
  const savedSpin = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, decal.rotation ?? 0));
  const finalQuat = baseQuat.clone().multiply(savedSpin);
  const rotation = new THREE.Euler().setFromQuaternion(finalQuat);

  // 10. Scale vector
  const scale = new THREE.Vector3(finalScaleX, finalScaleY, depthZ);

  return { position, scale, rotation };
}

/** Hook wrapper for single-placement use (unchanged API for existing callers). */
export function useDecalTransform(
  printArea: ViewerPrintArea | undefined,
  meshNode?: THREE.Mesh,
): DecalTransform | null {
  return useMemo(() => {
    const decal = printArea?.decal;
    if (!printArea || !decal?.url) return null;
    return computeDecalTransform(printArea, decal, meshNode);
  }, [printArea, meshNode]);
}

// ── Fallback helpers (unchanged from before) ──────────────────────────────

function placementToRotation(placement: string): THREE.Euler {
  switch (placement) {
    case "back":        return new THREE.Euler(0, Math.PI, 0);
    case "left_sleeve": return new THREE.Euler(0, -Math.PI / 2, 0);
    case "right_sleeve":return new THREE.Euler(0, Math.PI / 2, 0);
    case "hood":        return new THREE.Euler(-Math.PI / 4, 0, 0);
    default:            return new THREE.Euler(0, 0, 0);
  }
}

function computeCentreFromMesh(placement: string, meshNode: THREE.Mesh): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(meshNode);
  const centre = new THREE.Vector3();
  box.getCenter(centre);
  const size = new THREE.Vector3();
  box.getSize(size);
  switch (placement) {
    case "back":         return new THREE.Vector3(centre.x, centre.y + size.y * 0.05, centre.z - size.z * 0.48);
    case "left_sleeve":  return new THREE.Vector3(centre.x - size.x * 0.48, centre.y + size.y * 0.1, centre.z);
    case "right_sleeve": return new THREE.Vector3(centre.x + size.x * 0.48, centre.y + size.y * 0.1, centre.z);
    case "hood":         return new THREE.Vector3(centre.x, centre.y + size.y * 0.45, centre.z + size.z * 0.2);
    default:             return new THREE.Vector3(centre.x, centre.y + size.y * 0.05, centre.z + size.z * 0.48);
  }
}

function getHardcodedCentre(placement: string): THREE.Vector3 {
  switch (placement) {
    case "back":         return new THREE.Vector3(0, 0.5, -0.12);
    case "left_sleeve":  return new THREE.Vector3(-0.28, 0.55, -0.05);
    case "right_sleeve": return new THREE.Vector3(0.28, 0.55, -0.05);
    case "hood":         return new THREE.Vector3(0, 0.8, 0.1);
    default:             return new THREE.Vector3(0, 0.5, 0.12);
  }
}
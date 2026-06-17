// src/features/catalog/ProductThumbnail.tsx

import type { ApparelType } from "@/types/api";

interface Props {
  apparelType: ApparelType;
  color: string;
  accent?: string;
  imageUrl?: string;
  className?: string;
}

/**
 * Premium SVG silhouette used as the catalog/landing thumbnail.
 * Falls back to a stylized illustration when no image_url is provided
 * by the API. The 3D canvas is reserved for the product detail page.
 */
export function ProductThumbnail({ apparelType, color, accent, imageUrl, className }: Props) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className={`h-full w-full object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, ${color} 18%, transparent), transparent 60%), linear-gradient(180deg, var(--surface), var(--surface-elevated))`,
      }}
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full p-6"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="apparel-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.78" />
          </linearGradient>
        </defs>
        <Silhouette type={apparelType} accent={accent} />
      </svg>
    </div>
  );
}

function Silhouette({ type, accent }: { type: ApparelType; accent?: string }) {
  const fill = "url(#apparel-shade)";
  const stroke = "rgba(0,0,0,0.18)";
  switch (type) {
    case "hoodie":
      return (
        <g fill={fill} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round">
          <path d="M60 60 Q100 28 140 60 L168 78 L156 116 L140 108 L140 180 L60 180 L60 108 L44 116 L32 78 Z" />
          <path d="M84 60 Q100 88 116 60 Q108 72 100 72 Q92 72 84 60 Z" fill={accent ?? "rgba(0,0,0,0.25)"} />
          <rect x="78" y="120" width="44" height="34" rx="6" fill="rgba(0,0,0,0.12)" />
        </g>
      );
    case "cap":
      return (
        <g fill={fill} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round">
          <path d="M40 120 Q100 60 160 120 L160 132 L40 132 Z" />
          <path d="M30 132 Q100 156 170 132 L170 144 Q100 168 30 144 Z" fill={accent ?? fill} />
          <circle cx="100" cy="104" r="6" fill={accent ?? "rgba(0,0,0,0.3)"} />
        </g>
      );
    case "bag":
      return (
        <g fill={fill} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round">
          <path d="M70 56 Q100 32 130 56" fill="none" stroke={accent ?? "rgba(0,0,0,0.4)"} strokeWidth="3" />
          <rect x="48" y="68" width="104" height="108" rx="10" />
          <rect x="84" y="92" width="32" height="6" fill={accent ?? "rgba(0,0,0,0.25)"} />
        </g>
      );
    case "longsleeve":
      return (
        <g fill={fill} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round">
          <path d="M60 56 L100 44 L140 56 L168 92 L154 176 L120 180 L120 180 L80 180 L46 176 L32 92 Z" />
          <path d="M88 52 Q100 64 112 52" fill="rgba(0,0,0,0.15)" />
        </g>
      );
    case "tshirt":
    default:
      return (
        <g fill={fill} stroke={stroke} strokeWidth="0.6" strokeLinejoin="round">
          <path d="M60 56 L100 44 L140 56 L168 84 L150 104 L140 96 L140 180 L60 180 L60 96 L50 104 L32 84 Z" />
          <path d="M88 52 Q100 68 112 52" fill="rgba(0,0,0,0.15)" />
        </g>
      );
  }
}

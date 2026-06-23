/** SVG icons resembling Excalidraw's toolbar/panel iconography. */

interface IconProps {
  size?: number;
}

const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const SelectionIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M6 3l12 9-5.5 1L10 19z" />
  </svg>
);

export const RectangleIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <rect x="4" y="5" width="16" height="14" rx="1" />
  </svg>
);

export const DiamondIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M12 3l9 9-9 9-9-9z" />
  </svg>
);

export const EllipseIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <ellipse cx="12" cy="12" rx="9" ry="7" />
  </svg>
);

export const ArrowIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20L20 4M20 4h-8M20 4v8" />
  </svg>
);

export const LineIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 19L20 5" />
  </svg>
);

export const DrawIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 20c0-3 2-3 4-6s0-5 3-5 2 4 5 4 4-4 4-7" />
  </svg>
);

export const TextIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M5 5h14M12 5v14" />
  </svg>
);

export const UndoIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
);

export const RedoIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H10a6 6 0 0 0 0 12h3" />
  </svg>
);

export const MenuIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const LockIcon = ({ size }: IconProps) => (
  <svg {...base(size ?? 14)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const TrashIcon = ({ size }: IconProps) => (
  <svg {...base(size)}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

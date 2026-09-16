export function Ship({ variant = "ship" }: { variant?: "ship" | "data" }) {
  return (
    <svg
      viewBox="0 0 16 12"
      aria-hidden="true"
      className={`sprite ${variant}`}
      shapeRendering="crispEdges"
    >
      {variant === "ship" ? (
        <>
          <path d="M7 0h2v3h2v3h2v2h2v3H1V8h2V6h2V3h2z" fill="currentColor" />
          <path d="M7 4h2v5H7z" fill="#080c14" />
          <path d="M3 11h3v1H3zm7 0h3v1h-3z" fill="#ffd166" />
        </>
      ) : (
        <>
          <path
            d="M3 1h2v2h6V1h2v3h2v5h-2v2h-3V9H6v2H3V9H1V4h2z"
            fill="currentColor"
          />
          <path d="M4 5h2v2H4zm6 0h2v2h-2z" fill="#080c14" />
        </>
      )}
    </svg>
  );
}

export function Earth() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="earth-sprite"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path
        d="M10 1h12v2h5v4h3v5h1v9h-3v6h-5v3H10v-2H5v-5H2V10h3V5h5z"
        fill="#72e4ff"
      />
      <path
        d="M10 1h10v4h-4v4h-4v5H6v-3H3v-1h2V5h5zm9 12h7v4h4v4h-5v5h-5v-6h-3v-4h2zM6 21h5v4h4v5h-5v-2H5v-5h1z"
        fill="#80ff9f"
      />
      <path
        d="M22 3h5v4h3v5h1v9h-3v6h-5v3h-5v-3h5v-5h3V10h-4z"
        fill="#080c14"
        opacity=".3"
      />
    </svg>
  );
}

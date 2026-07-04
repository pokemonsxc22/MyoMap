import { useState, useRef } from "react";
import { createPortal } from "react-dom";

export default function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords]   = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const show = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCoords({ top: r.top, left: r.left + r.width / 2 });
    }
    setVisible(true);
  };

  return (
    <div className="inline-flex items-center">
      <button
        ref={btnRef}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          border: "1.5px solid white", color: "white",
          fontSize: 9, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, background: "transparent", cursor: "default",
          padding: 0, transition: "box-shadow 0.2s",
          boxShadow: visible ? "0 0 6px #0D9488, 0 0 12px rgba(13,148,136,0.4)" : "none",
          flexShrink: 0,
        }}
        aria-label="More info"
      >
        i
      </button>
      {visible && createPortal(
        <div
          style={{
            position: "fixed", top: coords.top, left: coords.left,
            transform: "translate(-50%, calc(-100% - 8px))",
            width: 216, padding: "8px 12px",
            background: "#1E293B", border: "1px solid #0D9488",
            borderRadius: 8, color: "white", fontSize: 12,
            lineHeight: 1.5, zIndex: 99999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(13,148,136,0.1)",
            pointerEvents: "none", textAlign: "center", whiteSpace: "normal",
          }}
        >
          {text}
          <div
            style={{
              position: "absolute", top: "100%", left: "50%",
              transform: "translateX(-50%)", width: 0, height: 0,
              borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
              borderTop: "5px solid #0D9488",
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

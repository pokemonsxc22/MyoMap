import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Activity, ChevronLeft, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ── Muscle group → mesh name(s) map ───────────────────────────────
const MUSCLE_MESH_MAP: Record<string, string[]> = {
  "lower-back":      ["lowerBack"],
  "mid-back":        ["midTorso"],
  "upper-back":      ["upperTorso"],
  "neck-shoulders":  ["neck", "lShoulder", "rShoulder"],
  "chest":           ["upperTorso"],
  "arms":            ["lUpperArm", "rUpperArm", "lForearm", "rForearm"],
  "abs-core":        ["coreTorso", "midTorso"],
  "quads":           ["lThigh", "rThigh"],
  "hamstrings":      ["lThigh", "rThigh"],
  "calves":          ["lCalf", "rCalf"],
  "knees":           ["lKnee", "rKnee"],
  "hips":            ["hipBone"],
};

const PAIN_AREA_LABELS: Record<string, string> = {
  "lower-back": "Lower Back",
  "mid-back": "Mid Back",
  "upper-back": "Upper Back",
  "neck-shoulders": "Neck & Shoulders",
  "chest": "Chest",
  "arms": "Arms",
  "abs-core": "Abs & Core",
  "quads": "Quads",
  "hamstrings": "Hamstrings",
  "calves": "Calves",
  "knees": "Knees",
  "hips": "Hips",
};

export default function Visual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const [painLabel, setPainLabel] = useState("Lower Back");
  const [webGLError, setWebGLError] = useState(false);

  useEffect(() => {
    let painArea = "lower-back";
    let sex = "male";

    try {
      const stored = sessionStorage.getItem("mobilityFormData");
      if (stored) {
        const d = JSON.parse(stored) as { painArea?: string; sex?: string };
        if (d.painArea) painArea = d.painArea;
        if (d.sex) sex = d.sex;
      }
    } catch { /* ignore */ }

    setPainLabel(PAIN_AREA_LABELS[painArea] ?? painArea);

    const container = containerRef.current;
    if (!container) return;

    const isMale = sex !== "female";
    // Shoulder width multiplier — males broader, females narrower
    const sw = isMale ? 1.0 : 0.82;
    // Hip width multiplier — females wider
    const hw = isMale ? 0.88 : 1.08;

    // ── Scene ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c14);
    scene.fog = new THREE.FogExp2(0x080c14, 0.12);

    // ── Camera ─────────────────────────────────────────────────────
    const W = container.clientWidth;
    const H = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 60);
    camera.position.set(0, 0.5, 4.2);

    // ── Renderer ───────────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setWebGLError(true);
      return;
    }
    if (!renderer.getContext()) {
      setWebGLError(true);
      renderer.dispose();
      return;
    }
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ── Lights ─────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(2, 5, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 1.2);
    rimLight.position.set(-3, 1, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x1e3a8a, 1.5, 8);
    fillLight.position.set(0, -1, 2);
    scene.add(fillLight);

    // ── Grid floor ─────────────────────────────────────────────────
    const grid = new THREE.GridHelper(6, 12, 0x1e293b, 0x1e293b);
    grid.position.y = -1.0;
    scene.add(grid);

    // ── Material factories ─────────────────────────────────────────
    const highlighted = new Set(MUSCLE_MESH_MAP[painArea] ?? []);

    function baseMat(): THREE.MeshPhysicalMaterial {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x475569),
        transparent: true,
        opacity: 0.30,
        roughness: 0.75,
        metalness: 0.05,
        transmission: 0.15,
      });
    }

    function hlMat(): THREE.MeshPhysicalMaterial {
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x2563eb),
        transparent: true,
        opacity: 0.88,
        roughness: 0.20,
        metalness: 0.12,
        emissive: new THREE.Color(0x1e3a8a),
        emissiveIntensity: 0.55,
      });
    }

    // ── Mesh helper ────────────────────────────────────────────────
    const meshMap = new Map<string, THREE.Mesh>();

    function add(
      name: string,
      geo: THREE.BufferGeometry,
      x: number, y: number, z: number,
      rx = 0, ry = 0, rz = 0
    ): THREE.Mesh {
      const mat = highlighted.has(name) ? hlMat() : baseMat();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rx, ry, rz);
      mesh.castShadow = true;
      mesh.name = name;
      scene.add(mesh);
      meshMap.set(name, mesh);
      return mesh;
    }

    const cap  = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 8, 16);
    const sph  = (r: number)            => new THREE.SphereGeometry(r, 20, 20);
    const box  = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d, 2, 2, 2);

    // ── Body (all positions are Y-up, body centred near y≈0.45) ───
    // Head
    add("head",       sph(0.185),                0,           1.85, 0);
    // Neck
    add("neck",       cap(0.065, 0.10),           0,           1.62, 0);
    // Shoulders
    add("lShoulder",  sph(0.095),               -0.42 * sw,  1.47, 0);
    add("rShoulder",  sph(0.095),                0.42 * sw,  1.47, 0);
    // Upper torso (chest / upper back)
    add("upperTorso", cap(0.26 * sw, 0.26),       0,           1.26, 0);
    // Mid torso (mid back / obliques)
    add("midTorso",   cap(0.22, 0.22),             0,           0.95, 0);
    // Core / abs
    add("coreTorso",  cap(0.21, 0.20),             0,           0.67, 0);
    // Lower back
    add("lowerBack",  cap(0.23 * hw, 0.18),        0,           0.43, 0);
    // Hips / pelvis
    add("hipBone",    cap(0.25 * hw, 0.12),        0,           0.23, 0);

    // Arms
    add("lUpperArm",  cap(0.068, 0.30),          -0.50 * sw,  1.24, 0);
    add("rUpperArm",  cap(0.068, 0.30),           0.50 * sw,  1.24, 0);
    add("lForearm",   cap(0.058, 0.26),          -0.53 * sw,  0.84, 0);
    add("rForearm",   cap(0.058, 0.26),           0.53 * sw,  0.84, 0);
    add("lHand",      sph(0.062),               -0.55 * sw,  0.57, 0);
    add("rHand",      sph(0.062),                0.55 * sw,  0.57, 0);

    // Legs
    add("lThigh",     cap(0.092, 0.40),          -0.20 * hw, -0.05, 0);
    add("rThigh",     cap(0.092, 0.40),           0.20 * hw, -0.05, 0);
    add("lKnee",      sph(0.075),               -0.20 * hw, -0.34, 0);
    add("rKnee",      sph(0.075),                0.20 * hw, -0.34, 0);
    add("lCalf",      cap(0.068, 0.36),          -0.20 * hw, -0.60, 0);
    add("rCalf",      cap(0.068, 0.36),           0.20 * hw, -0.60, 0);
    add("lFoot",      box(0.115, 0.065, 0.24),  -0.20 * hw, -0.84, 0.04);
    add("rFoot",      box(0.115, 0.065, 0.24),   0.20 * hw, -0.84, 0.04);

    // ── Controls ───────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.45, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.8;
    controls.maxDistance = 8.0;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.9;
    controls.update();

    let userInteracted = false;
    controls.addEventListener("start", () => {
      userInteracted = true;
      controls.autoRotate = false;
    });

    // ── Resize ─────────────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Animation loop ─────────────────────────────────────────────
    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Pulse emissive on highlighted meshes
      meshMap.forEach((mesh, name) => {
        if (highlighted.has(name)) {
          const mat = mesh.material as THREE.MeshPhysicalMaterial;
          mat.emissiveIntensity = 0.35 + 0.30 * Math.sin(t * 2.2);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      meshMap.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      scene.clear();
    };
  }, []);

  // ── Shared nav ────────────────────────────────────────────────────
  const TopNav = () => (
    <nav className="absolute top-0 left-0 right-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm tracking-tight">AI Mobility Coach</span>
        </div>
        <button
          onClick={() => setLocation("/results")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
          data-testid="button-back-results"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Results
        </button>
      </div>
    </nav>
  );

  // ── WebGL not available fallback ───────────────────────────────────
  if (webGLError) {
    return (
      <div className="relative flex flex-col min-h-screen bg-background text-foreground">
        <TopNav />
        <div className="flex-1 flex items-center justify-center px-6 pt-14">
          <div className="max-w-sm w-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary tracking-widest uppercase block mb-3">
              Body Visual
            </span>
            <h1 className="text-2xl font-black mb-3">3D View Unavailable</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              Your browser doesn't support WebGL, which is required for the 3D body model.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              Try opening the app in Chrome, Firefox, or Safari on a desktop or mobile device.
            </p>
            <div className="p-4 rounded-2xl bg-card border border-primary/20 text-left mb-8">
              <p className="text-xs font-semibold text-primary mb-2">Highlighted area</p>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                <span className="text-sm font-semibold">{painLabel}</span>
              </div>
            </div>
            <button
              onClick={() => setLocation("/results")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all mx-auto text-sm font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col" style={{ height: "100dvh", overflow: "hidden" }}>
      <TopNav />

      {/* ── 3D Canvas ── */}
      <div
        ref={containerRef}
        className="flex-1 w-full"
        style={{ cursor: "grab" }}
        data-testid="canvas-3d-body"
      />

      {/* ── Highlight legend ── */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 whitespace-nowrap">
        <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(59,130,246,0.8)] flex-shrink-0 animate-pulse" />
        <span className="text-sm font-semibold text-white">{painLabel}</span>
        <span className="text-xs text-white/50">highlighted in blue</span>
      </div>

      {/* ── Hint ── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 text-xs text-white/35 whitespace-nowrap">
        <RotateCcw className="w-3 h-3" />
        Drag to rotate · scroll to zoom
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, RotateCcw, Wand2 } from "lucide-react";

// Helper: read file to object URL safely
function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

// A simple Dropzone + FilePicker component
function ImagePicker({ onPick }: { onPick: (f: File) => void }) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setIsOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f && f.type.startsWith("image/")) onPick(f);
      }}
      className={`border-2 border-dashed rounded-2xl p-10 text-center transition shadow-sm cursor-pointer select-none ${isOver ? "bg-muted/50 border-primary" : "bg-muted/20"
        }`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow">
        <UploadCloud className="h-6 w-6" />
      </div>
      <p className="text-lg font-medium">Upload a rectangle image</p>
      <p className="text-sm text-muted-foreground">Click to choose or drag & drop</p>
    </div>
  );
}

// Interactive 3D Card with tilt, parallax, shine, and drag
function InteractiveCard({
  src,
  intensity = 30,
  glare = true,
  draggable = false,
}: { src: string; intensity?: number; glare?: boolean; draggable?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9); // Default aspect ratio
  const [viewportWidth, setViewportWidth] = useState<number>(320); // Default viewport width

  // Motion values for tilt
  const mx = useMotionValue(0); // -1 .. 1
  const my = useMotionValue(0); // -1 .. 1

  // Store initial device orientation for relative positioning
  const initialOrientation = useRef<{ beta: number; gamma: number } | null>(null);

  // Load image and calculate aspect ratio
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      setAspectRatio(ratio);
    };
    img.src = src;
  }, [src]);

  // Track viewport width changes
  useEffect(() => {
    const updateViewportWidth = () => {
      if (typeof window !== 'undefined') {
        setViewportWidth(window.innerWidth);
      }
    };

    // Set initial width
    updateViewportWidth();

    // Add resize listener
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateViewportWidth);
      return () => window.removeEventListener('resize', updateViewportWidth);
    }
  }, []);

  // Smooth spring
  const smx = useSpring(mx, { stiffness: 200, damping: 20, mass: 0.5 });
  const smy = useSpring(my, { stiffness: 200, damping: 20, mass: 0.5 });

  const rotX = useTransform(smy, (v) => `${-v * intensity}deg`);
  const rotY = useTransform(smx, (v) => `${v * intensity}deg`);
  const translateZ = useTransform(smx, () => `30px`);

  // Calculate responsive dimensions based on aspect ratio and viewport
  const getCardDimensions = () => {
    // Use viewport-based widths with maximum constraints
    const maxWidth = {
      mobile: Math.min(320, viewportWidth * 0.85), // 85% of viewport, max 320px
      sm: 400,
      lg: 480,
      xl: 560
    };

    // Calculate height based on aspect ratio
    const mobile = { width: maxWidth.mobile, height: maxWidth.mobile / aspectRatio };
    const sm = { width: maxWidth.sm, height: maxWidth.sm / aspectRatio };
    const lg = { width: maxWidth.lg, height: maxWidth.lg / aspectRatio };
    const xl = { width: maxWidth.xl, height: maxWidth.xl / aspectRatio };

    return { mobile, sm, lg, xl };
  };

  const dimensions = getCardDimensions();

  // Reset drag position when draggable is disabled
  useEffect(() => {
    if (!draggable && cardRef.current) {
      // Reset the transform to center position
      cardRef.current.style.transform = cardRef.current.style.transform.replace(/translate3d\([^)]*\)/g, 'translate3d(0px, 0px, 0px)');
    }
  }, [draggable]);

  // Shine position
  const shineX = useTransform(smx, (v) => `${(v + 1) * 50}%`);
  const shineY = useTransform(smy, (v) => `${(1 - (v + 1) / 2) * 100}%`);

  // Track mouse relative to element
  function handlePointerMove(e: React.PointerEvent) {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const px = (e.clientX - bounds.left) / bounds.width; // 0..1
    const py = (e.clientY - bounds.top) / bounds.height; // 0..1
    mx.set(px * 2 - 1);
    my.set(py * 2 - 1);
  }
  function resetTilt() {
    mx.set(0); my.set(0);
  }

  // Handle touch events to prevent scrolling
  function handleTouchStart(e: React.TouchEvent) {
    // Prevent scrolling when touching the card
    e.preventDefault();
  }

  function handleTouchMove(e: React.TouchEvent) {
    // Prevent scrolling during touch move on the card
    e.preventDefault();

    // Convert touch to pointer-like event for tilt
    const touch = e.touches[0];
    if (touch && containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect();
      const px = (touch.clientX - bounds.left) / bounds.width;
      const py = (touch.clientY - bounds.top) / bounds.height;
      mx.set(px * 2 - 1);
      my.set(py * 2 - 1);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    e.preventDefault();
    resetTilt();
  }

  // Optional: device orientation for mobile tilt
  useEffect(() => {
    function onDeviceOrientation(e: DeviceOrientationEvent) {
      if (e.beta == null || e.gamma == null) return;

      // Capture initial orientation on first reading
      if (!initialOrientation.current) {
        initialOrientation.current = { beta: e.beta, gamma: e.gamma };
        return; // Don't tilt on first reading, just establish baseline
      }

      // Calculate relative change from initial position
      const deltaGamma = e.gamma - initialOrientation.current.gamma;
      const deltaBeta = e.beta - initialOrientation.current.beta;

      // Clamp the relative changes to reasonable ranges
      const g = Math.max(-45, Math.min(45, deltaGamma)); // left/right
      const b = Math.max(-45, Math.min(45, deltaBeta)); // front/back

      mx.set(g / 45);
      my.set(b / 45);
    }

    // Reset initial orientation when component mounts
    initialOrientation.current = null;

    // only attach after user gesture (first pointerdown)
    let armed = false;
    const arm = () => {
      armed = true;
      initialOrientation.current = null; // Reset baseline when user interacts
      window.removeEventListener("pointerdown", arm);
    };
    window.addEventListener("pointerdown", arm);

    const listener = () => {
      if (!armed) return;
      window.removeEventListener("deviceorientation", onDeviceOrientation as EventListener);
      window.addEventListener("deviceorientation", onDeviceOrientation as EventListener);
    };
    window.addEventListener("pointermove", listener, { once: true });
    return () => {
      window.removeEventListener("pointermove", listener as EventListener);
      window.removeEventListener("deviceorientation", onDeviceOrientation as EventListener);
      window.removeEventListener("pointerdown", arm);
    };
  }, [mx, my]);

  return (
    <div className="flex w-full items-center justify-center overflow-hidden">
      <motion.div
        ref={containerRef}
        className="relative [perspective:1100px]"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => resetTilt()}
        onPointerCancel={() => resetTilt()}
        onPointerUp={() => resetTilt()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <motion.div
          ref={cardRef}
          style={{
            rotateX: rotX,
            rotateY: rotY,
            transformStyle: "preserve-3d",
            width: `min(${dimensions.mobile.width}px, 85vw)`,
            height: `${dimensions.mobile.height}px`,
            '--sm-width': `${dimensions.sm.width}px`,
            '--sm-height': `${dimensions.sm.height}px`,
            '--lg-width': `${dimensions.lg.width}px`,
            '--lg-height': `${dimensions.lg.height}px`,
            '--xl-width': `${dimensions.xl.width}px`,
            '--xl-height': `${dimensions.xl.height}px`,
          } as React.CSSProperties}
          className="relative max-w-[85vw] overflow-hidden rounded-2xl shadow-2xl sm:rounded-3xl [width:min(var(--sm-width),85vw)] [height:var(--sm-height)] lg:[width:min(var(--lg-width),85vw)] lg:[height:var(--lg-height)] xl:[width:min(var(--xl-width),85vw)] xl:[height:var(--xl-height)]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.995 }}
          drag={draggable}
          dragElastic={0.06}
          dragConstraints={{ left: -30, right: 30, top: -30, bottom: 30 }}
          dragMomentum={false}
        >
          {/* Image layer */}
          <motion.img
            src={src}
            alt="Interactive card"
            className="h-full w-full object-cover"
            style={{ transform: `translateZ(0px)` }}
            draggable={false}
          />

          {/* Floating content layer for subtle depth */}
          <motion.div
            style={{ transform: translateZ }}
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute bottom-4 left-4 rounded-xl bg-black/30 px-4 py-2 text-white shadow-lg backdrop-blur-sm">
              <span className="text-sm font-medium">Drag • Hover • Tilt</span>
            </div>
          </motion.div>

          {/* Shine / glare */}
          {glare && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(500px 300px at var(--x) var(--y), rgba(255,255,255,0.25), rgba(255,255,255,0.08) 35%, transparent 60%)",
                "--x": shineX,
                "--y": shineY,
              } as React.CSSProperties}
            />
          )}

          {/* Subtle vignette */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5 [box-shadow:inset_0_0_80px_rgba(0,0,0,0.35)]" />
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [intensity, setIntensity] = useState(30);
  const [glare, setGlare] = useState(true);
  const [dragEnabled, setDragEnabled] = useState(false);
  const url = useObjectUrl(file);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-2 py-4 sm:px-4 sm:py-6 lg:py-10 w-full">
        <div className="mb-3 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Interactive Card Playground</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFile(null); }}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button variant="default" onClick={() => {
              setIntensity(30); setGlare(true);
            }}>
              <Wand2 className="mr-2 h-4 w-4" /> Defaults
            </Button>
          </div>
        </div>

        {!url ? (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>1) Upload an image</CardTitle>
            </CardHeader>
            <CardContent>
              <ImagePicker onPick={setFile} />
              <p className="mt-3 text-sm text-muted-foreground">
                Tip: A landscape/rectangle image (e.g., 3:2 or 16:9) looks great.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>2) Play with the card</CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden">
                <InteractiveCard src={url} intensity={intensity} glare={glare} draggable={dragEnabled} />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Tuning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">Tilt intensity</span>
                      <span className="tabular-nums text-muted-foreground">{intensity}°</span>
                    </div>
                    <Slider
                      value={[intensity]}
                      min={6}
                      max={35}
                      step={1}
                      onValueChange={(v: number[]) => setIntensity(v[0])}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Glare / shine</span>
                    <Button variant={glare ? "default" : "secondary"} onClick={() => setGlare((g) => !g)}>
                      {glare ? "On" : "Off"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Drag</span>
                    <Button variant={dragEnabled ? "default" : "secondary"} onClick={() => setDragEnabled((d) => !d)}>
                      {dragEnabled ? "On" : "Off"}
                    </Button>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p className="mb-2 font-semibold text-foreground">Tips</p>
                    <ul className="list-disc pl-5">
                      <li>Hover to tilt, drag to nudge the card.</li>
                      <li>On mobile, the card can follow device tilt after your first tap.</li>
                      <li>Use a PNG with transparent background for neat effects.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-muted-foreground sm:mt-6 lg:mt-8">
          Built with React • Tailwind • shadcn/ui • framer-motion
        </div>
      </div>
    </div>
  );
}

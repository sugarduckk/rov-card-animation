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
  intensity = 18,
  glare = true,
}: { src: string; intensity?: number; glare?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Motion values for tilt
  const mx = useMotionValue(0); // -1 .. 1
  const my = useMotionValue(0); // -1 .. 1

  // Smooth spring
  const smx = useSpring(mx, { stiffness: 200, damping: 20, mass: 0.5 });
  const smy = useSpring(my, { stiffness: 200, damping: 20, mass: 0.5 });

  const rotX = useTransform(smy, (v) => `${-v * intensity}deg`);
  const rotY = useTransform(smx, (v) => `${v * intensity}deg`);
  const translateZ = useTransform(smx, () => `30px`);

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

  // Optional: device orientation for mobile tilt
  useEffect(() => {
    function onDeviceOrientation(e: DeviceOrientationEvent) {
      if (e.beta == null || e.gamma == null) return;
      const g = Math.max(-45, Math.min(45, e.gamma)); // left/right
      const b = Math.max(-45, Math.min(45, e.beta)); // front/back
      mx.set(g / 45);
      my.set(b / 45);
    }
    // only attach after user gesture (first pointerdown)
    let armed = false;
    const arm = () => { armed = true; window.removeEventListener("pointerdown", arm); };
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
    <div className="flex w-full items-center justify-center">
      <motion.div
        ref={containerRef}
        className="relative [perspective:1100px]"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => resetTilt()}
        onPointerCancel={() => resetTilt()}
        onPointerUp={() => resetTilt()}
      >
        <motion.div
          style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
          className="relative h-[380px] w-[620px] max-w-[90vw] overflow-hidden rounded-3xl shadow-2xl"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.995 }}
          drag
          dragElastic={0.06}
          dragConstraints={{ left: -30, right: 30, top: -30, bottom: 30 }}
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
  const [intensity, setIntensity] = useState(18);
  const [glare, setGlare] = useState(true);
  const url = useObjectUrl(file);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Interactive Card Playground</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFile(null); }}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button variant="default" onClick={() => {
              setIntensity(18); setGlare(true);
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
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>2) Play with the card</CardTitle>
              </CardHeader>
              <CardContent>
                <InteractiveCard src={url} intensity={intensity} glare={glare} />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Tuning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
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
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Built with React • Tailwind • shadcn/ui • framer-motion
        </div>
      </div>
    </div>
  );
}

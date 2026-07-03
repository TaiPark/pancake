import { SideRays } from "@/components/react-bits/SideRays";

export function KineticBackground() {
  return (
    <div className="side-rays-background" aria-hidden="true">
      <SideRays
        className="opacity-90"
        origin="top-right"
        speed={0.72}
        rayColor1="#73e6c7"
        rayColor2="#f2d18b"
        intensity={1.45}
        spread={1.4}
        tilt={-10}
        saturation={0.95}
        blend={0.62}
        falloff={1.55}
        opacity={0.72}
      />
    </div>
  );
}

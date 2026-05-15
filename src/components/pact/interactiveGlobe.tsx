import { useEffect, useRef } from "react";

type InteractiveGlobeProps = {
  autoRotate?: boolean;
  className?: string;
  interactive?: boolean;
};

type PointerState = {
  active: boolean;
  x: number;
  y: number;
};

const GLOBE_RADIUS = 1.56;

export function InteractiveGlobe({ autoRotate = true, className = "", interactive = true }: InteractiveGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) {
      return;
    }

    if (!("WebGLRenderingContext" in window)) {
      host.dataset.globeFallback = "true";
      return;
    }

    let disposed = false;
    let cleanup = () => undefined;

    void import("three").then((THREE) => {
      if (disposed) {
        return;
      }

      const [red, green, blue] = readAccentColor(host);
      const accent = new THREE.Color(red / 255, green / 255, blue / 255);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0, 4.7);

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          canvas,
          preserveDrawingBuffer: true
        });
      } catch {
        host.dataset.globeFallback = "true";
        return;
      }
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const globe = new THREE.Group();
      globe.rotation.set(-0.18, -0.58, 0.08);
      scene.add(globe);

      const glowGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.01, 48, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.11,
        depthWrite: false
      });
      globe.add(new THREE.Mesh(glowGeometry, glowMaterial));

      const dotGeometry = new THREE.BufferGeometry();
      dotGeometry.setAttribute("position", new THREE.Float32BufferAttribute(buildPointCloud(), 3));
      const dotMaterial = new THREE.PointsMaterial({
        color: accent,
        size: 0.033,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.94,
        depthWrite: false
      });
      globe.add(new THREE.Points(dotGeometry, dotMaterial));

      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(buildGuideLines(), 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0.24,
        depthWrite: false
      });
      globe.add(new THREE.LineSegments(lineGeometry, lineMaterial));

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const pointer: PointerState = { active: false, x: 0, y: 0 };
      let animationFrame = 0;

      const resize = () => {
        const rect = host.getBoundingClientRect();
        const width = Math.max(1, Math.floor(rect.width));
        const height = Math.max(1, Math.floor(rect.height));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();

      const render = () => {
        if (autoRotate && !prefersReducedMotion && !pointer.active) {
          globe.rotation.y += 0.0035;
          globe.rotation.x += Math.sin(Date.now() * 0.0007) * 0.0002;
        }

        renderer.render(scene, camera);
        animationFrame = window.requestAnimationFrame(render);
      };

      const onPointerDown = (event: PointerEvent) => {
        pointer.active = true;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        host.setPointerCapture(event.pointerId);
        host.dataset.dragging = "true";
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!pointer.active) {
          return;
        }

        const deltaX = event.clientX - pointer.x;
        const deltaY = event.clientY - pointer.y;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        globe.rotation.y += deltaX * 0.007;
        globe.rotation.x = clamp(globe.rotation.x + deltaY * 0.005, -1.1, 1.1);
      };

      const onPointerUp = (event: PointerEvent) => {
        pointer.active = false;
        host.releasePointerCapture(event.pointerId);
        delete host.dataset.dragging;
      };

      if (interactive) {
        host.addEventListener("pointerdown", onPointerDown);
        host.addEventListener("pointermove", onPointerMove);
        host.addEventListener("pointerup", onPointerUp);
        host.addEventListener("pointercancel", onPointerUp);
      }
      render();

      cleanup = () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        if (interactive) {
          host.removeEventListener("pointerdown", onPointerDown);
          host.removeEventListener("pointermove", onPointerMove);
          host.removeEventListener("pointerup", onPointerUp);
          host.removeEventListener("pointercancel", onPointerUp);
        }
        glowGeometry.dispose();
        glowMaterial.dispose();
        dotGeometry.dispose();
        dotMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [autoRotate, interactive]);

  return (
    <div className={`interactive-globe ${className}`.trim()} ref={hostRef} aria-hidden="true" data-interactive={interactive ? "true" : "false"}>
      <canvas className="interactive-globe-canvas" ref={canvasRef} />
    </div>
  );
}

function readAccentColor(element: HTMLElement) {
  const value = window.getComputedStyle(element).getPropertyValue("--accent-rgb").trim();
  const [red = 42, green = 157, blue = 143] = value.split(",").map((part) => Number.parseInt(part.trim(), 10));
  return [red, green, blue];
}

function buildPointCloud() {
  const points: number[] = [];

  for (let latitude = -58; latitude <= 72; latitude += 3) {
    for (let longitude = -178; longitude <= 178; longitude += 3) {
      const jitter = seededJitter(latitude, longitude);
      const lat = latitude + (jitter - 0.5) * 1.2;
      const lon = longitude + (seededJitter(longitude, latitude) - 0.5) * 1.4;

      if (isLandLike(lat, lon) || seededJitter(lat * 4, lon * 4) > 0.982) {
        points.push(...spherePoint(lat, lon, GLOBE_RADIUS));
      }
    }
  }

  return points;
}

function buildGuideLines() {
  const vertices: number[] = [];
  const longitudes = [-120, -60, 0, 60, 120];
  const latitudes = [-45, -20, 0, 20, 45];

  for (const longitude of longitudes) {
    for (let latitude = -72; latitude < 72; latitude += 5) {
      vertices.push(...spherePoint(latitude, longitude, GLOBE_RADIUS * 1.006));
      vertices.push(...spherePoint(latitude + 3.5, longitude, GLOBE_RADIUS * 1.006));
    }
  }

  for (const latitude of latitudes) {
    for (let longitude = -180; longitude < 180; longitude += 5) {
      vertices.push(...spherePoint(latitude, longitude, GLOBE_RADIUS * 1.006));
      vertices.push(...spherePoint(latitude, longitude + 3.5, GLOBE_RADIUS * 1.006));
    }
  }

  return vertices;
}

function spherePoint(latitude: number, longitude: number, radius: number) {
  const lat = degToRad(latitude);
  const lon = degToRad(longitude);
  const x = Math.cos(lat) * Math.cos(lon) * radius;
  const y = Math.sin(lat) * radius;
  const z = Math.cos(lat) * Math.sin(lon) * radius;
  return [x, y, z];
}

function isLandLike(latitude: number, longitude: number) {
  return (
    ellipse(latitude, longitude, 47, -102, 34, 55) ||
    ellipse(latitude, longitude, -15, -60, 42, 26) ||
    ellipse(latitude, longitude, 7, 22, 42, 35) ||
    ellipse(latitude, longitude, 50, 65, 58, 82) ||
    ellipse(latitude, longitude, 22, 77, 24, 30) ||
    ellipse(latitude, longitude, -25, 134, 22, 24) ||
    ellipse(latitude, longitude, 64, -42, 12, 18)
  );
}

function ellipse(latitude: number, longitude: number, centerLat: number, centerLon: number, latRadius: number, lonRadius: number) {
  const normalizedLon = Math.abs(normalizeLongitude(longitude - centerLon)) / lonRadius;
  const normalizedLat = Math.abs(latitude - centerLat) / latRadius;
  return normalizedLon * normalizedLon + normalizedLat * normalizedLat <= 1;
}

function normalizeLongitude(value: number) {
  return ((value + 540) % 360) - 180;
}

function seededJitter(a: number, b: number) {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function degToRad(value: number) {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

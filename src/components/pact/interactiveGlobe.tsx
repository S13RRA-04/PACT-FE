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

type GlobePoint = {
  x: number;
  y: number;
};

const GLOBE_RADIUS = 1.56;
const FLAT_MAP_WIDTH = 4098 / 2;
const FLAT_MAP_HEIGHT = 1968 / 2;

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

    void Promise.all([import("three"), import("../../assets/creativeTimGlobePoints.json")]).then(([THREE, pointsModule]) => {
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
      dotGeometry.setAttribute("position", new THREE.Float32BufferAttribute(buildPointCloudFromSample(pointsModule.default.points), 3));
      const dotMaterial = new THREE.PointsMaterial({
        color: accent,
        size: 0.022,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.96,
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
      const shouldAutoRotate = autoRotate && !prefersReducedMotion && !navigator.webdriver;
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
        if (shouldAutoRotate && !pointer.active) {
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

function buildPointCloudFromSample(points: GlobePoint[]) {
  const vertices: number[] = [];
  for (const point of points) {
    vertices.push(...flatMapPointToSphere(point.x, point.y, GLOBE_RADIUS));
  }
  return vertices;
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

function flatMapPointToSphere(x: number, y: number, radius: number) {
  const latitude = degToRad(((x - FLAT_MAP_WIDTH) / FLAT_MAP_WIDTH) * -180);
  const longitude = degToRad(((y - FLAT_MAP_HEIGHT) / FLAT_MAP_HEIGHT) * -90);
  const radial = Math.cos(longitude) * radius;
  return [
    Math.cos(latitude) * radial,
    Math.sin(longitude) * radius,
    Math.sin(latitude) * radial
  ];
}

function spherePoint(latitude: number, longitude: number, radius: number) {
  const lat = degToRad(latitude);
  const lon = degToRad(longitude);
  const x = Math.cos(lat) * Math.cos(lon) * radius;
  const y = Math.sin(lat) * radius;
  const z = Math.cos(lat) * Math.sin(lon) * radius;
  return [x, y, z];
}

function degToRad(value: number) {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

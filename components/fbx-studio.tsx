"use client";

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { RATIOS, SWATCHES } from "@/lib/constants";
import type { GarmentView } from "@/lib/database.types";
import { useCustomizer } from "@/components/customizer-provider";

const MODEL_URL = "/models/Meshy_AI_Winter_Workwear_Figure_20261112_generate.fbx";
const PRESETS = [
  { label: "Уурхай", base: 202, accent: 209 },
  { label: "Инженер", base: 204, accent: 205 },
  { label: "Замын ажил", base: 201, accent: 210 },
  { label: "Хар", base: 212, accent: 204 },
] as const;

type ModelSummary = { meshes: number; materials: number; triangles: number };
type LoadState = "loading" | "ready" | "error";

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

function formatModelNote(summary: ModelSummary | null) {
  if (!summary) return "FBX загварын бүрдлийг шалгаж байна.";
  const structure = summary.meshes === 1 && summary.materials === 1
    ? "Энэ FBX нь нэг mesh, нэг ерөнхий material-тай."
    : `Энэ FBX-д ${summary.meshes} mesh, ${summary.materials} material байна.`;
  return `${structure} Хувцасны хэсгүүд тусад нь ялгарахгүй тул өнгө, хүрэм/өмд, гэрэл ойлгогч тууз, логоны сонголт загварын дүрслэлийг өөрчлөхгүй; захиалгад хадгалагдана.`;
}

function Swatches({
  value,
  onChange,
  prefix,
}: {
  value: number;
  onChange: (code: number) => void;
  prefix: string;
}) {
  return (
    <div className="swatches" role="group" aria-label={prefix}>
      {SWATCHES.map((swatch) => (
        <button
          aria-label={`${prefix}: ${swatch.label}`}
          aria-pressed={value === swatch.code}
          className="swatch"
          key={swatch.code}
          onClick={() => onChange(swatch.code)}
          style={{ "--swatch": swatch.color } as CSSProperties}
          title={swatch.label}
          type="button"
        />
      ))}
    </div>
  );
}

export function FbxStudio() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneModel = useRef<THREE.Object3D | null>(null);
  const renderRequest = useRef<number | null>(null);
  const invalidateRef = useRef<(() => void) | null>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const targetRotationRef = useRef(0);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [progress, setProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [summary, setSummary] = useState<ModelSummary | null>(null);
  const [retry, setRetry] = useState(0);

  const {
    baseSwatch,
    setBaseSwatch,
    accentSwatch,
    setAccentSwatch,
    garmentView,
    setGarmentView,
    backView,
    setBackView,
    reflectiveTape,
    setReflectiveTape,
    reflectiveColor,
    setReflectiveColor,
    fabricRatio,
    setFabricRatio,
    logoText,
    setLogoText,
    lux,
    setLux,
  } = useCustomizer();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let disposed = false;
    let isVisible = false;
    let pageIsVisible = !document.hidden;
    let pointerDown = false;
    let previousX = 0;
    let currentRotation = targetRotationRef.current;
    let root: THREE.Group | null = null;
    let observer: IntersectionObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      void Promise.resolve().then(() => {
        if (disposed) return;
        setLoadState("error");
        setErrorMessage("Энэ төхөөрөмжид WebGL дэмжигдэхгүй байна. Өөр хөтөч эсвэл төхөөрөмжөөс нээнэ үү.");
      });
      return () => { disposed = true; };
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#101a27");
    const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
    const hemisphere = new THREE.HemisphereLight(0xe4edf4, 0x202a36, 1.7);
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.35);
    keyLight.position.set(3.5, 5.5, 7);
    const fillLight = new THREE.DirectionalLight(0x9dcfc5, 1.2);
    fillLight.position.set(-5, 1.4, 4);
    const rimLight = new THREE.DirectionalLight(0xc9a96c, 1.35);
    rimLight.position.set(-3.5, 4, -5);
    scene.add(hemisphere, keyLight, fillLight, rimLight);
    hemisphereRef.current = hemisphere;
    keyLightRef.current = keyLight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.domElement.setAttribute(
      "aria-label",
      "Ажлын хувцасны 3D загвар. Чирж эргүүлэх эсвэл суман товч ашиглана уу.",
    );
    renderer.domElement.tabIndex = 0;
    stage.appendChild(renderer.domElement);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (!root) return;
      const bounds = new THREE.Box3().setFromObject(root);
      const size = bounds.getSize(new THREE.Vector3());
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const verticalFit = size.y / (2 * Math.tan(verticalFov / 2));
      const horizontalFit = size.x / (2 * Math.tan(horizontalFov / 2));
      const depthFit = size.z / (2 * Math.tan(horizontalFov / 2));
      const distance = Math.max(verticalFit, horizontalFit, depthFit) * 1.16;
      camera.position.set(0, 0, Math.max(distance, 2.2));
      camera.lookAt(0, 0, 0);
    };

    const render = () => {
      renderRequest.current = null;
      if (disposed || !isVisible || !pageIsVisible) return;
      if (root) {
        const target = targetRotationRef.current;
        if (!reducedMotion && Math.abs(target - currentRotation) > 0.002) {
          currentRotation += (target - currentRotation) * 0.14;
          root.rotation.y = currentRotation;
          renderRequest.current = requestAnimationFrame(render);
          return;
        }
        currentRotation = target;
        root.rotation.y = target;
      }
      renderer.render(scene, camera);
    };

    const invalidate = () => {
      if (disposed || !isVisible || !pageIsVisible || renderRequest.current !== null) return;
      renderRequest.current = requestAnimationFrame(render);
    };
    invalidateRef.current = invalidate;

    const updateVisibility = (nextVisible: boolean) => {
      isVisible = nextVisible;
      if (isVisible) invalidate();
      else if (renderRequest.current !== null) {
        cancelAnimationFrame(renderRequest.current);
        renderRequest.current = null;
      }
    };
    const onDocumentVisibility = () => {
      pageIsVisible = !document.hidden;
      if (pageIsVisible) invalidate();
      else if (renderRequest.current !== null) {
        cancelAnimationFrame(renderRequest.current);
        renderRequest.current = null;
      }
    };
    document.addEventListener("visibilitychange", onDocumentVisibility);
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry) updateVisibility(entry.isIntersecting);
      });
      observer.observe(stage);
    } else {
      isVisible = true;
    }
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    resize();

    const onPointerDown = (event: PointerEvent) => {
      pointerDown = true;
      previousX = event.clientX;
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown || !root) return;
      const change = (event.clientX - previousX) * 0.009;
      previousX = event.clientX;
      targetRotationRef.current += change;
      currentRotation = targetRotationRef.current;
      root.rotation.y = currentRotation;
      invalidate();
    };
    const onPointerUp = () => {
      pointerDown = false;
      renderer.domElement.style.cursor = "grab";
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!root || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      targetRotationRef.current += event.key === "ArrowLeft" ? -0.18 : 0.18;
      if (reducedMotion) {
        currentRotation = targetRotationRef.current;
        root.rotation.y = currentRotation;
      }
      invalidate();
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    renderer.domElement.addEventListener("keydown", onKeyDown);

    new FBXLoader().load(
      MODEL_URL,
      (loaded) => {
        if (disposed) {
          disposeObject(loaded);
          return;
        }
        root = new THREE.Group();
        const bounds = new THREE.Box3().setFromObject(loaded);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        loaded.position.sub(center);
        const longestSide = Math.max(size.x, size.y, size.z);
        if (longestSide > 0) loaded.scale.setScalar(4.9 / longestSide);
        root.add(loaded);
        currentRotation = targetRotationRef.current;
        root.rotation.y = currentRotation;
        scene.add(root);
        sceneModel.current = root;

        const meshList: THREE.Mesh[] = [];
        const materialIds = new Set<string>();
        let triangles = 0;
        loaded.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          meshList.push(mesh);
          triangles += mesh.geometry.index
            ? mesh.geometry.index.count / 3
            : (mesh.geometry.attributes.position?.count ?? 0) / 3;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material && materialIds.add(material.uuid));
        });
        setSummary({ meshes: meshList.length, materials: materialIds.size, triangles: Math.round(triangles) });
        setLoadState("ready");
        setProgress(100);
        resize();
        invalidate();
      },
      (event) => {
        if (event.lengthComputable && event.total > 0) {
          setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      },
      (error) => {
        if (disposed) return;
        setLoadState("error");
        setErrorMessage(error instanceof Error ? error.message : "FBX загвар ачаалж чадсангүй.");
      },
    );

    return () => {
      disposed = true;
      observer?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener("visibilitychange", onDocumentVisibility);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.domElement.removeEventListener("keydown", onKeyDown);
      if (renderRequest.current !== null) cancelAnimationFrame(renderRequest.current);
      if (root) disposeObject(root);
      renderer.dispose();
      renderer.domElement.remove();
      renderRequest.current = null;
      sceneModel.current = null;
      hemisphereRef.current = null;
      keyLightRef.current = null;
      invalidateRef.current = null;
    };
    // Load the FBX once; visual controls are applied through refs in effects below.
  }, [retry]);

  useEffect(() => {
    targetRotationRef.current = backView ? Math.PI : 0;
    invalidateRef.current?.();
  }, [backView]);

  useEffect(() => {
    const level = lux / 500;
    if (hemisphereRef.current) hemisphereRef.current.intensity = 0.55 + level * 1.15;
    if (keyLightRef.current) keyLightRef.current.intensity = 0.35 + level * 2;
    invalidateRef.current?.();
  }, [lux]);

  const retryLoad = useCallback(() => {
    setLoadState("loading");
    setProgress(null);
    setErrorMessage("");
    setSummary(null);
    setRetry((value) => value + 1);
  }, []);
  const selectGarment = (view: GarmentView) => setGarmentView(view);

  return (
    <>
      <div className="studio-stage" ref={stageRef}>
        {loadState === "loading" && (
          <div className="model-state" role="status" aria-live="polite">
            <span className="loading-ring" aria-hidden="true" />
            <strong>3D загвар ачаалж байна</strong>
            <p>{progress === null ? "FBX файлыг уншиж байна…" : `Татаж байна · ${progress}%`}</p>
            <div className="progress-track" role="progressbar" aria-label="FBX загварын ачаалал" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress ?? undefined}>
              <div className={`progress-fill ${progress === null ? "progress-indeterminate" : ""}`} style={progress === null ? undefined : { width: `${progress}%` }} />
            </div>
          </div>
        )}
        {loadState === "error" && (
          <div className="model-state model-state-error" role="alert">
            <strong>3D загвар нээгдсэнгүй</strong>
            <p>FBX файл ачаалж чадсангүй. Файлын зам болон холболтыг шалгаад дахин оролдоно уу.</p>
            {errorMessage && <p className="inline-code">{errorMessage.slice(0, 160)}</p>}
            <button className="button-secondary" type="button" onClick={retryLoad}>Дахин оролдох</button>
          </div>
        )}
      </div>
      <div className="viewer-caption">
        <span>Чирж эсвэл суман товчоор эргүүлнэ</span>
        <span>{summary ? `${summary.meshes} mesh · ${summary.materials} material` : "FBX загвар"}</span>
      </div>

      <div className="studio-controls" id="studio-controls">
        <div className="control-block">
          <div className="control-label"><span>Үндсэн өнгө</span><small>Захиалгын сонголт</small></div>
          <Swatches value={baseSwatch} onChange={setBaseSwatch} prefix="Үндсэн өнгө" />
        </div>
        <div className="control-block">
          <div className="control-label"><span>Нэмэлт өнгө</span><small>Захиалгын сонголт</small></div>
          <Swatches value={accentSwatch} onChange={setAccentSwatch} prefix="Нэмэлт өнгө" />
        </div>
        <div className="control-block">
          <div className="control-label"><span>Загварын төрөл</span><small>Захиалгын сонголт</small></div>
          <div className="control-row" role="group" aria-label="Захиалгын хувцасны төрөл">
            {(["suit", "jacket", "pants"] as const).map((view) => (
              <button aria-pressed={garmentView === view} className="choice-button" key={view} onClick={() => selectGarment(view)} type="button">
                {view === "suit" ? "Хослол" : view === "jacket" ? "Хүрэм" : "Өмд"}
              </button>
            ))}
          </div>
        </div>
        <div className="control-block">
          <div className="control-label"><span>Гэрэл ойлгогч тууз</span><small>Захиалгын сонголт</small></div>
          <div className="control-row">
            <button aria-pressed={reflectiveTape} className="choice-button" onClick={() => setReflectiveTape(!reflectiveTape)} type="button">
              {reflectiveTape ? "Оруулах" : "Оруулахгүй"}
            </button>
            <button aria-label="Туузны өнгө: мөнгөлөг" aria-pressed={reflectiveColor === "#E2E8F0"} className="choice-button" onClick={() => setReflectiveColor("#E2E8F0")} type="button">Мөнгөлөг</button>
            <button aria-label="Туузны өнгө: ногоон" aria-pressed={reflectiveColor === "#84CC16"} className="choice-button" onClick={() => setReflectiveColor("#84CC16")} type="button">Ногоон</button>
          </div>
        </div>
        <p className="model-limit full-row" role="status">{formatModelNote(summary)}</p>
        <div className="control-block">
          <label className="control-label" htmlFor="lux-range"><span>Гэрэлтүүлэг</span><small>{lux} / 500</small></label>
          <input className="range-control" id="lux-range" max={500} min={0} onChange={(event) => setLux(Number(event.currentTarget.value))} type="range" value={lux} />
        </div>
        <div className="control-block">
          <div className="control-label"><span>Даавууны харьцаа</span><small>Захиалгын сонголт</small></div>
          <div className="control-row" role="group" aria-label="Даавууны харьцаа">
            {(Object.keys(RATIOS) as (keyof typeof RATIOS)[]).map((ratio) => (
              <button aria-pressed={fabricRatio === ratio} className="choice-button" key={ratio} onClick={() => setFabricRatio(ratio)} type="button">{ratio}</button>
            ))}
          </div>
          <p className="ratio-detail">{RATIOS[fabricRatio].description}</p>
        </div>
        <div className="control-block full-row">
          <div className="control-label"><span>Өнгөний тохиргоо</span><small>Захиалгын сонголт</small></div>
          <div className="control-row">
            {PRESETS.map((preset) => (
              <button className="choice-button" key={preset.label} onClick={() => { setBaseSwatch(preset.base); setAccentSwatch(preset.accent); }} type="button">{preset.label}</button>
            ))}
          </div>
        </div>
        <div className="control-block full-row">
          <label className="field-label" htmlFor="logo-text">Лого дээрх бичвэр <small>Захиалгад тэмдэглэнэ · 40 хүртэл тэмдэгт</small></label>
          <input className="text-control" id="logo-text" maxLength={40} onChange={(event) => setLogoText(event.currentTarget.value)} placeholder="Жишээ: OCHIR" value={logoText} />
        </div>
        <div className="control-block full-row">
          <div className="control-label"><span>Эргүүлэх</span></div>
          <div className="control-row">
            <button aria-pressed={!backView} className="choice-button" onClick={() => setBackView(false)} type="button">Урд тал</button>
            <button aria-pressed={backView} className="choice-button" onClick={() => setBackView(true)} type="button">Ар тал</button>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

export function StudioLazy() {
  const host = useRef<HTMLDivElement>(null);
  const [Studio, setStudio] = useState<ComponentType | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const target = host.current;
    if (!target) return;
    let cancelled = false;
    let requested = false;
    const requestStudio = async () => {
      if (requested) return;
      requested = true;
      setLoadError(false);
      try {
        const studioChunk = await import("@/components/fbx-studio");
        if (!cancelled) setStudio(() => studioChunk.FbxStudio);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    };

    if (!("IntersectionObserver" in window)) {
      void requestStudio();
      return () => { cancelled = true; };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void requestStudio();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(target);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [attempt]);

  return (
    <div ref={host} className="studio-frame" aria-label="3D загварын студи">
      {Studio ? <Studio /> : loadError ? (
        <div className="viewer-placeholder" role="alert">
          <strong>3D студи ачаалж чадсангүй</strong>
          <span>Холболтоо шалгаад дахин оролдоно уу.</span>
          <button className="button-secondary" type="button" onClick={() => { setStudio(null); setAttempt((value) => value + 1); }}>
            Дахин ачаалах
          </button>
        </div>
      ) : (
        <div className="viewer-placeholder" role="status">
          <span className="loading-ring" aria-hidden="true" />
          <strong>3D студи нээгдэж байна</strong>
          <span>FBX загварыг харахад бэлдэж байна.</span>
        </div>
      )}
    </div>
  );
}

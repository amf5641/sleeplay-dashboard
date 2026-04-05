"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Topbar from "@/components/topbar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_FACTOR = 0.08;

interface Person { id: string; name: string; title: string; location: string; managerId: string | null; photo: string | null }

const LINE = "#b8aed5";
const VGAP = 24;
const CHILD_GAP = 36;

function Dot() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 12, height: 12, zIndex: 2, margin: "-1px 0" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${LINE}`, backgroundColor: "#fff" }} />
    </div>
  );
}

function OrgNode({ person, people, onClickPerson, isChild }: { person: Person; people: Person[]; onClickPerson: (id: string) => void; isChild?: boolean }) {
  const reports = people.filter((p) => p.managerId === person.id);
  return (
    <div className="flex flex-col items-center">
      {isChild && (
        <>
          <div style={{ width: 2, height: VGAP, backgroundColor: LINE }} />
          <Dot />
        </>
      )}

      <div
        className="bg-white rounded-lg p-4 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50 min-w-[180px] text-center cursor-pointer hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow"
        onClick={(e) => { e.stopPropagation(); onClickPerson(person.id); }}
      >
        {person.photo ? (
          <img src={person.photo} alt="" className="w-12 h-12 rounded-full mx-auto mb-2 object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full mx-auto mb-2 bg-lavender flex items-center justify-center text-midnight-blue font-bold text-lg">
            {person.name.charAt(0)}
          </div>
        )}
        <div className="font-semibold text-sm font-heading">{person.name}</div>
        <div className="text-xs text-brand-gray">{person.title}</div>
        {person.location && <div className="text-xs text-brand-gray mt-0.5">{person.location}</div>}
      </div>

      {reports.length > 0 && (
        <>
          <div style={{ width: 2, height: VGAP, backgroundColor: LINE }} />
          <Dot />
          <div className="relative" style={{ display: "flex", gap: CHILD_GAP }}>
            {reports.length > 1 && (
              <div
                className="absolute pointer-events-none"
                style={{
                  top: 0,
                  height: 2,
                  backgroundColor: LINE,
                  left: `calc(100% / ${reports.length} / 2)`,
                  right: `calc(100% / ${reports.length} / 2)`,
                }}
              />
            )}
            {reports.map((r) => (
              <div key={r.id} className="flex flex-col items-center">
                <OrgNode person={r} people={people} onClickPerson={onClickPerson} isChild />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: people = [] } = useSWR<Person[]>("/api/people", fetcher);
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const roots = people.filter((p) => !p.managerId);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const direction = e.deltaY > 0 ? -1 : 1;

    setZoom((prevZoom) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom * (1 + direction * ZOOM_FACTOR)));
      const scale = newZoom / prevZoom;

      setPan((prevPan) => ({
        x: cursorX - scale * (cursorX - prevPan.x),
        y: cursorY - scale * (cursorY - prevPan.y),
      }));

      return newZoom;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        zoomBy(0.2);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomBy(-0.2);
      } else if (e.key === "0") {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const zoomBy = (delta: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setZoom((prevZoom) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + delta));
      const scale = newZoom / prevZoom;
      setPan((prevPan) => ({
        x: centerX - scale * (centerX - prevPan.x),
        y: centerY - scale * (centerY - prevPan.y),
      }));
      return newZoom;
    });
  };

  const resetZoom = () => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const prevZoom = zoom;
    const newZoom = 1;
    const scale = newZoom / prevZoom;

    setAnimating(true);
    setZoom(newZoom);
    setPan((prevPan) => ({
      x: centerX - scale * (centerX - prevPan.x),
      y: centerY - scale * (centerY - prevPan.y),
    }));
    setTimeout(() => setAnimating(false), 300);
  };

  const fitToView = () => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const containerRect = container.getBoundingClientRect();
    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;

    const padding = 64;
    const scaleX = (containerRect.width - padding * 2) / contentWidth;
    const scaleY = (containerRect.height - padding * 2) / contentHeight;
    const newZoom = Math.min(Math.max(MIN_ZOOM, Math.min(scaleX, scaleY)), 1.5);

    const newPanX = (containerRect.width - contentWidth * newZoom) / 2;
    const newPanY = (containerRect.height - contentHeight * newZoom) / 2;

    setAnimating(true);
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
    setTimeout(() => setAnimating(false), 300);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    setAnimating(false);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  const onDoubleClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    setAnimating(true);
    setZoom((prevZoom) => {
      const newZoom = Math.min(MAX_ZOOM, prevZoom * 1.5);
      const scale = newZoom / prevZoom;
      setPan((prevPan) => ({
        x: cursorX - scale * (cursorX - prevPan.x),
        y: cursorY - scale * (cursorY - prevPan.y),
      }));
      return newZoom;
    });
    setTimeout(() => setAnimating(false), 300);
  };

  // Track if mouse moved during drag to avoid navigating on drag release
  const didDrag = useRef(false);
  const onMouseDownCard = () => { didDrag.current = false; };
  const onMouseMoveCard = () => { if (dragging) didDrag.current = true; };

  const handleClickPerson = (id: string) => {
    if (!didDrag.current) {
      router.push(`/team/${id}`);
    }
  };

  return (
    <>
      <Topbar
        title="Org Chart"
        actions={
          <div className="flex gap-2">
            <button onClick={fitToView} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Fit</button>
            <button onClick={() => zoomBy(0.2)} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">+</button>
            <button onClick={() => zoomBy(-0.2)} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">-</button>
          </div>
        }
      />
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-white-smoke relative"
        onMouseDown={(e) => { onMouseDown(e); onMouseDownCard(); }}
        onMouseMove={(e) => { onMouseMove(e); onMouseMoveCard(); }}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
      >
        <div
          ref={contentRef}
          className="inline-flex p-16"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            transition: animating ? "transform 0.3s ease-out" : "none",
          }}
        >
          <div className="flex gap-16">
            {roots.map((r) => (
              <OrgNode key={r.id} person={r} people={people} onClickPerson={handleClickPerson} />
            ))}
          </div>
        </div>

        <button
          onClick={resetZoom}
          className="absolute bottom-4 left-4 px-3 py-1.5 text-xs font-medium rounded-md bg-white border border-platinum shadow-sm hover:bg-lavender/30 transition-colors select-none"
          title="Click to reset to 100%"
        >
          {Math.round(zoom * 100)}%
        </button>
      </div>
    </>
  );
}

"use client";

export default function LoomEmbed({ url }: { url: string }) {
  if (!url) return null;
  const m = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  const embedUrl = `https://www.loom.com/embed/${m[1]}`;
  return (
    <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full rounded"
        allowFullScreen
        allow="autoplay"
      />
    </div>
  );
}

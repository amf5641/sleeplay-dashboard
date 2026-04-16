"use client";
import { useRef, useCallback } from "react";

export default function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedValue = useRef(value);

  const handleBlur = useCallback(() => {
    const html = editorRef.current?.innerHTML || "";
    const cleaned = html === `<br>` || html === `<div><br></div>` ? "" : html;
    if (cleaned !== savedValue.current) {
      savedValue.current = cleaned;
      onChange(cleaned);
    }
  }, [onChange]);

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    editorRef.current?.focus();
  };

  return (
    <div className="border border-platinum rounded-lg focus-within:border-royal-purple transition-colors duration-150">
      <div className="flex gap-0.5 px-2 py-1.5 border-b border-platinum/60 bg-white-smoke/30 rounded-t-lg">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} className="px-2 py-0.5 text-xs font-bold rounded hover:bg-platinum transition-colors duration-150" title="Bold">B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} className="px-2 py-0.5 text-xs italic rounded hover:bg-platinum transition-colors duration-150" title="Italic">I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("underline"); }} className="px-2 py-0.5 text-xs underline rounded hover:bg-platinum transition-colors duration-150" title="Underline">U</button>
        <div className="w-px bg-platinum mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("insertUnorderedList"); }} className="px-2 py-0.5 text-xs rounded hover:bg-platinum transition-colors duration-150" title="Bullet list">&#8226; List</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec("insertOrderedList"); }} className="px-2 py-0.5 text-xs rounded hover:bg-platinum transition-colors duration-150" title="Numbered list">1. List</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        dangerouslySetInnerHTML={{ __html: value }}
        data-placeholder={placeholder}
        className="min-h-[120px] px-3 py-2 text-sm focus:outline-none rounded-b-lg [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-brand-gray/40"
      />
    </div>
  );
}

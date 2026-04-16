"use client";
import { useRef, useCallback } from "react";
import { sanitizeHtml } from "@/lib/sanitize";

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

  const wrapSelection = (tag: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    // Check if already wrapped in this tag — unwrap if so
    let parent: Node | null = range.commonAncestorContainer;
    while (parent && parent !== editorRef.current) {
      if (parent instanceof HTMLElement && parent.tagName === tag.toUpperCase()) {
        const frag = document.createDocumentFragment();
        while (parent.firstChild) frag.appendChild(parent.firstChild);
        parent.parentNode?.replaceChild(frag, parent);
        editorRef.current.focus();
        return;
      }
      parent = parent.parentNode;
    }

    const wrapper = document.createElement(tag);
    try {
      range.surroundContents(wrapper);
    } catch {
      // If selection spans multiple elements, extract and wrap
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
    }
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    sel.addRange(newRange);
    editorRef.current.focus();
  };

  const insertList = (ordered: boolean) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) return;

    const list = document.createElement(ordered ? "ol" : "ul");
    const li = document.createElement("li");
    const content = range.extractContents();
    if (content.textContent) {
      li.appendChild(content);
    } else {
      li.appendChild(document.createElement("br"));
    }
    list.appendChild(li);
    range.insertNode(list);

    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(li);
    newRange.collapse(false);
    sel.addRange(newRange);
    editorRef.current.focus();
  };

  return (
    <div className="border border-platinum rounded-lg focus-within:border-royal-purple transition-colors duration-150">
      <div className="flex gap-0.5 px-2 py-1.5 border-b border-platinum/60 bg-white-smoke/30 rounded-t-lg">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); wrapSelection("strong"); }} className="px-2 py-0.5 text-xs font-bold rounded hover:bg-platinum transition-colors duration-150" title="Bold">B</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); wrapSelection("em"); }} className="px-2 py-0.5 text-xs italic rounded hover:bg-platinum transition-colors duration-150" title="Italic">I</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); wrapSelection("u"); }} className="px-2 py-0.5 text-xs underline rounded hover:bg-platinum transition-colors duration-150" title="Underline">U</button>
        <div className="w-px bg-platinum mx-0.5" />
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertList(false); }} className="px-2 py-0.5 text-xs rounded hover:bg-platinum transition-colors duration-150" title="Bullet list">&#8226; List</button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertList(true); }} className="px-2 py-0.5 text-xs rounded hover:bg-platinum transition-colors duration-150" title="Numbered list">1. List</button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        data-placeholder={placeholder}
        className="min-h-[120px] px-3 py-2 text-sm focus:outline-none rounded-b-lg [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-brand-gray/40"
      />
    </div>
  );
}

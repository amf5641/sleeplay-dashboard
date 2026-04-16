"use client";
import { getDailyQuote } from "@/lib/quotes";

export default function DailyQuote() {
  const quote = getDailyQuote();

  return (
    <div className="bg-white rounded-xl p-8 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50">
      <p className="text-lg text-brand-black leading-relaxed mb-3 italic text-center">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="text-sm text-brand-gray text-center">
        &mdash; {quote.author}
      </p>
    </div>
  );
}

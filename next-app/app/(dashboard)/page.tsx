"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@/components/topbar";

const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Your limitation — it's only your imagination.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDailyQuote() {
  // Pick a quote based on the day of the year so it changes daily but is consistent throughout the day
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return quotes[dayOfYear % quotes.length];
}

function getFirstName(email: string | null | undefined) {
  if (!email) return "";
  const local = email.split("@")[0];
  const first = local.split(".")[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export default function HomePage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const quote = getDailyQuote();
  const greeting = getGreeting();
  const name = getFirstName(session?.user?.email);

  if (!mounted) return null;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <>
      <Topbar title="Home" />
      <div className="flex-1 flex flex-col items-center justify-center p-8 -mt-16">
        <div className="text-center max-w-2xl">
          <p className="text-sm text-brand-gray mb-2">{dateStr}</p>
          <h1 className="text-3xl font-heading font-bold text-brand-black mb-8">
            {greeting}{name ? `, ${name}` : ""}
          </h1>
          <div className="bg-white rounded-xl p-10 shadow-[0_4px_34px_rgba(0,0,0,0.05)] border border-platinum/50">
            <svg className="w-8 h-8 text-royal-purple/30 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <p className="text-xl text-brand-black leading-relaxed mb-4 italic">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="text-sm text-brand-gray">
              &mdash; {quote.author}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";
import useSWR from "swr";
import Link from "next/link";
import Topbar from "@/components/topbar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Person { id: string; name: string; title: string; location: string; photo: string | null }

export default function TeamPage() {
  const { data: people = [] } = useSWR<Person[]>("/api/people", fetcher);

  return (
    <>
      <Topbar title="Meet the Team" count={people.length} />
      <div className="p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {people.map((p) => (
            <Link
              key={p.id}
              href={`/team/${p.id}`}
              className="bg-white rounded-lg p-5 text-center shadow-[0_4px_34px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_34px_rgba(0,0,0,0.08)] transition-shadow border border-platinum/50"
            >
              {p.photo ? (
                <img src={p.photo} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-lavender flex items-center justify-center text-midnight-blue font-bold text-xl">
                  {p.name.charAt(0)}
                </div>
              )}
              <h3 className="font-semibold font-heading text-sm">{p.name}</h3>
              <p className="text-xs text-brand-gray">{p.title}</p>
              {p.location && <p className="text-xs text-brand-gray mt-0.5">{p.location}</p>}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

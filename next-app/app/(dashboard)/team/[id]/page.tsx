"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Topbar from "@/components/topbar";
import ConfirmDialog from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const ADMIN_EMAIL = "admin@sleeplay.com";

interface Person { id: string; name: string; title: string; location: string; photo: string | null; goals: string; hobbies: string; interests: string; managerId: string | null }
interface PersonSummary { id: string; name: string }

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize; }
          else { width = (width / height) * maxSize; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function TeamMemberPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  const { data: person, mutate } = useSWR<Person>(`/api/people/${id}`, fetcher);
  const { data: allPeople = [] } = useSWR<PersonSummary[]>("/api/people", fetcher);
  const [goals, setGoals] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [interests, setInterests] = useState("");
  const [managerId, setManagerId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (person) {
      setGoals(person.goals);
      setHobbies(person.hobbies);
      setInterests(person.interests);
      setManagerId(person.managerId);
    }
  }, [person]);

  const save = async () => {
    await fetch(`/api/people/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals, hobbies, interests, managerId }),
    });
    mutate();
  };

  const uploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file, 500);
    await fetch(`/api/people/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo: dataUrl }),
    });
    mutate();
  };

  if (!person) return <div className="p-8 text-brand-gray">Loading...</div>;

  return (
    <>
      <Topbar
        title=""
        actions={
          <div className="flex gap-3">
            {isAdmin && <button onClick={() => setConfirmDelete(true)} className="px-3 py-1.5 text-sm rounded bg-red-50 text-red-700 hover:bg-red-100">Delete</button>}
            <button onClick={() => { save(); router.push("/team"); }} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Save & Back</button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            {person.photo ? (
              <img src={person.photo} alt="" className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-lavender flex items-center justify-center text-midnight-blue font-bold text-3xl">
                {person.name.charAt(0)}
              </div>
            )}
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-royal-purple text-white rounded-full flex items-center justify-center text-sm hover:bg-midnight-blue">
              +
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </div>
          <div>
            <h2 className="text-2xl font-bold font-heading">{person.name}</h2>
            <p className="text-brand-gray">{person.title}</p>
            {person.location && <p className="text-sm text-brand-gray">{person.location}</p>}
          </div>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-brand-gray mb-2">Reports to</label>
          {isAdmin ? (
            <select
              value={managerId ?? ""}
              onChange={(e) => setManagerId(e.target.value || null)}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
            >
              <option value="">None (top-level)</option>
              {allPeople.filter((p) => p.id !== id).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm">{allPeople.find((p) => p.id === managerId)?.name ?? "None"}</p>
          )}
        </div>

        {[
          { label: "About Me", value: goals, set: setGoals },
          { label: "Hobbies/Interests", value: hobbies, set: setHobbies },
        ].map((field) => (
          <div key={field.label} className="mb-6">
            <label className="block text-sm font-medium text-brand-gray mb-2">{field.label}</label>
            <textarea
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y bg-white"
            />
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await fetch(`/api/people/${id}`, { method: "DELETE" });
          router.push("/team");
        }}
        title="Delete Team Member"
        message={`Are you sure you want to remove ${person.name}? This will also delete their PTO requests.`}
      />
    </>
  );
}

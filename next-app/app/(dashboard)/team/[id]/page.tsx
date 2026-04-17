"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Topbar from "@/components/topbar";
import ConfirmDialog from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const ADMIN_EMAIL = "admin@sleeplay.com";

interface Person { id: string; name: string; email: string | null; title: string; location: string; photo: string | null; goals: string; hobbies: string; interests: string; responsibilities: string; skills: string; startDate: string | null; managerId: string | null }
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
  const userEmail = session?.user?.email;
  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined;
  const isAdmin = userEmail === ADMIN_EMAIL || userRole === "admin";
  const { data: person, mutate } = useSWR<Person>(`/api/people/${id}`, fetcher);
  const isOwnProfile = person?.email === userEmail;
  const canEdit = isAdmin || isOwnProfile;
  const { data: allPeople = [] } = useSWR<PersonSummary[]>("/api/people", fetcher);
  const [goals, setGoals] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [interests, setInterests] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [skills, setSkills] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [managerId, setManagerId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (person) {
      setGoals(person.goals);
      setHobbies(person.hobbies);
      setInterests(person.interests);
      setResponsibilities(person.responsibilities || "");
      setSkills(person.skills || "");
      setStartDate(person.startDate ? person.startDate.slice(0, 10) : "");
      setManagerId(person.managerId);
    }
  }, [person]);

  const save = async () => {
    await fetch(`/api/people/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals, hobbies, interests, responsibilities, skills, startDate: startDate || null, managerId }),
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
            {canEdit ? (
              <button onClick={() => { save(); router.push("/team"); }} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Save & Back</button>
            ) : (
              <button onClick={() => router.push("/team")} className="px-3 py-1.5 text-sm rounded bg-platinum hover:bg-lavender">Back</button>
            )}
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
            {canEdit && (
              <>
                <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 bg-royal-purple text-white rounded-full flex items-center justify-center text-sm hover:bg-midnight-blue">
                  +
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
              </>
            )}
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

        <div className="mb-6">
          <label className="block text-sm font-medium text-brand-gray mb-2">Start Date</label>
          {isAdmin ? (
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
            />
          ) : (
            <p className="text-sm text-brand-black">
              {startDate ? new Date(startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
              {startDate && <span className="text-brand-gray ml-2">({Math.floor((Date.now() - new Date(startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000) * 10) / 10} years)</span>}
            </p>
          )}
        </div>

        {[
          { label: "Responsibilities", value: responsibilities, set: setResponsibilities, placeholder: "Day-to-day ownership areas, e.g.\n• Leads performance marketing\n• Owns Klaviyo lifecycle flows\n• Manages ad budget allocation" },
          { label: "Key Skills", value: skills, set: setSkills, placeholder: "Areas of expertise — comma-separated or bulleted, e.g. Paid Ads, SEO, Analytics, Copywriting" },
          { label: "About Me", value: goals, set: setGoals, placeholder: "" },
          { label: "Hobbies/Interests", value: hobbies, set: setHobbies, placeholder: "" },
        ].map((field) => (
          <div key={field.label} className="mb-6">
            <label className="block text-sm font-medium text-brand-gray mb-2">{field.label}</label>
            {canEdit ? (
              <textarea
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                rows={field.label === "Responsibilities" ? 5 : 3}
                placeholder={field.placeholder}
                className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y bg-white"
              />
            ) : (
              <p className="text-sm text-brand-black whitespace-pre-wrap">{field.value || "—"}</p>
            )}
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

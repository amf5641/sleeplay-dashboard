"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Topbar from "@/components/topbar";
import ConfirmDialog from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const ADMIN_EMAIL = "admin@sleeplay.com";

interface DirectReport { id: string; name: string; title: string; photo: string | null }
interface PersonProject { id: string; name: string; color: string; status: string }
interface Person { id: string; name: string; email: string | null; title: string; location: string; photo: string | null; goals: string; hobbies: string; interests: string; responsibilities: string; skills: string; startDate: string | null; birthday: string | null; slack: string; phone: string; managerId: string | null; reports: DirectReport[]; projects: PersonProject[] }
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
  const [birthday, setBirthday] = useState<string>("");
  const [slack, setSlack] = useState("");
  const [phone, setPhone] = useState("");
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
      setBirthday(person.birthday ? person.birthday.slice(0, 10) : "");
      setSlack(person.slack || "");
      setPhone(person.phone || "");
      setManagerId(person.managerId);
    }
  }, [person]);

  const save = async () => {
    await fetch(`/api/people/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals, hobbies, interests, responsibilities, skills, startDate: startDate || null, birthday: birthday || null, slack, phone, managerId }),
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
          <label className="block text-sm font-medium text-brand-gray mb-2">Contact</label>
          {canEdit ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-brand-gray mb-1">Slack handle</label>
                <input
                  type="text"
                  value={slack}
                  onChange={(e) => setSlack(e.target.value)}
                  placeholder="@username"
                  className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-brand-gray mb-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555-123-4567"
                  className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 text-sm">
              {person.email && <a href={`mailto:${person.email}`} className="text-royal-purple hover:underline">{person.email}</a>}
              {slack && <span className="text-brand-black">Slack: {slack.startsWith("@") ? slack : `@${slack}`}</span>}
              {phone && <a href={`tel:${phone}`} className="text-royal-purple hover:underline">{phone}</a>}
              {!person.email && !slack && !phone && <span className="text-brand-gray">—</span>}
            </div>
          )}
        </div>

        {(person.reports?.length ?? 0) > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-brand-gray mb-2">Direct Reports ({person.reports.length})</label>
            <div className="flex flex-wrap gap-2">
              {person.reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/team/${r.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-platinum hover:border-royal-purple hover:bg-lavender transition-colors"
                >
                  {r.photo ? (
                    <img src={r.photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-lavender flex items-center justify-center text-midnight-blue text-xs font-bold">
                      {r.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-brand-black">{r.name}</span>
                  {r.title && <span className="text-xs text-brand-gray">· {r.title}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {(person.projects?.length ?? 0) > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-brand-gray mb-2">Active Projects ({person.projects.length})</label>
            <div className="flex flex-wrap gap-2">
              {person.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-platinum hover:border-royal-purple hover:bg-lavender transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm text-brand-black">{p.name}</span>
                  <span className="text-xs text-brand-gray">· {p.status}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-brand-gray mb-2">Birthday</label>
          {canEdit ? (
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple bg-white"
            />
          ) : (
            <p className="text-sm text-brand-black">
              {birthday ? new Date(birthday + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "—"}
            </p>
          )}
          {canEdit && <p className="text-[11px] text-brand-gray mt-1">Year is private — only month and day are shown to teammates</p>}
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

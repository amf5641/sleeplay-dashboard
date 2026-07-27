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

        {/* Job Position card: title + roles & responsibilities + skills */}
        <div className="mb-6 bg-white rounded-xl border border-platinum/70 shadow-[0_4px_34px_rgba(0,0,0,0.05)] p-5">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-royal-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <h3 className="text-sm font-semibold font-heading text-brand-black">Job Position</h3>
          </div>
          <p className="text-base font-medium text-royal-purple mb-4">{person.title || "—"}</p>

          <p className="text-xs font-medium text-brand-gray uppercase tracking-wide mb-2">Roles &amp; Responsibilities</p>
          {canEdit ? (
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              rows={5}
              placeholder={"One per line, e.g.\nLeads performance marketing\nOwns Klaviyo lifecycle flows\nManages ad budget allocation"}
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y bg-white mb-4"
            />
          ) : responsibilities ? (
            <ul className="space-y-1.5 mb-4">
              {responsibilities.split("\n").map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-brand-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-royal-purple mt-1.5 flex-shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-gray mb-4">Not filled in yet.</p>
          )}

          <p className="text-xs font-medium text-brand-gray uppercase tracking-wide mb-2">Key Skills</p>
          {canEdit ? (
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              rows={2}
              placeholder="Comma-separated, e.g. Paid Ads, SEO, Analytics, Copywriting"
              className="w-full px-3 py-2 border border-platinum rounded text-sm focus:outline-none focus:border-royal-purple resize-y bg-white"
            />
          ) : skills ? (
            <div className="flex flex-wrap gap-1.5">
              {skills.split(/[,\n]/).map((s) => s.replace(/^[-•*]\s*/, "").trim()).filter(Boolean).map((s, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-lavender text-midnight-blue font-medium">{s}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-gray">Not filled in yet.</p>
          )}
        </div>

        {[
          { label: "About Me", value: goals, set: setGoals, placeholder: "" },
          { label: "Hobbies/Interests", value: hobbies, set: setHobbies, placeholder: "" },
        ].map((field) => (
          <div key={field.label} className="mb-6">
            <label className="block text-sm font-medium text-brand-gray mb-2">{field.label}</label>
            {canEdit ? (
              <textarea
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                rows={3}
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

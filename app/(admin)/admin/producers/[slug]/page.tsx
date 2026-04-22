"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  FormField,
  FormSection,
  SaveButton,
  DangerButton,
} from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";

export default function EditProducerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { getProducerBySlug, updateProducer, deleteProducer, notify } = useCmsStore();

  const producer = getProducerBySlug(slug);
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    specialty: string;
    credits: string;
    signature: string;
    bio: string;
    heroImageUrl: string;
    profileImageUrl: string;
    "socialLinks.instagram": string;
    "socialLinks.spotify": string;
    "socialLinks.soundcloud": string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formInitialized = useRef(false);

  // Seed form from producer once — rollback-triggered store changes must NOT
  // re-seed or the user's in-progress edits would be silently wiped.
  useEffect(() => {
    if (!producer || formInitialized.current) return;
    formInitialized.current = true;
    setForm({
      name: producer.name,
      slug: producer.slug,
      specialty: producer.specialty,
      credits: producer.credits,
      signature: producer.signature,
      bio: producer.bio ?? "",
      heroImageUrl: producer.heroImageUrl ?? "",
      profileImageUrl: producer.profileImageUrl ?? "",
      "socialLinks.instagram": producer.socialLinks?.instagram ?? "",
      "socialLinks.spotify": producer.socialLinks?.spotify ?? "",
      "socialLinks.soundcloud": producer.socialLinks?.soundcloud ?? "",
    });
  }, [producer]);

  if (!producer || !form) {
    return (
      <AdminShell title="Producer Not Found">
        <p className="text-white/30 text-sm">No producer found with slug &ldquo;{slug}&rdquo;.</p>
        <a href="/admin/producers" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors">
          ← Back to Producers
        </a>
      </AdminShell>
    );
  }

  function set(key: string, value: string) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form!.name.trim()) errs.name = "Name is required";
    if (!form!.slug.trim()) errs.slug = "Slug is required";
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!producer || !form) return;
    setSaving(true);
    try {
      await updateProducer(producer.id, {
        name: form!.name,
        specialty: form!.specialty,
        credits: form!.credits,
        signature: form!.signature,
        bio: form!.bio || undefined,
        heroImageUrl: form!.heroImageUrl || undefined,
        profileImageUrl: form!.profileImageUrl || undefined,
        socialLinks: {
          instagram: form!["socialLinks.instagram"] || undefined,
          spotify: form!["socialLinks.spotify"] || undefined,
          soundcloud: form!["socialLinks.soundcloud"] || undefined,
        },
      });
      notify("success", `Producer "${form!.name}" saved.`);
    } catch {
      // bgSync already surfaced an error toast; keep form edits intact.
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!producer) return;
    if (confirm(`Delete "${producer.name}"? This cannot be undone.`)) {
      deleteProducer(producer.id);
      notify("success", `Producer "${producer.name}" deleted.`);
      router.push("/admin/producers");
    }
  }

  return (
    <AdminShell title={`Edit — ${producer.name}`}>
      <div className="max-w-2xl space-y-10">
        <div className="flex items-center justify-between">
          <a href="/admin/producers" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
            ← Producers
          </a>
          <a href={`/producers/${producer.slug}`} target="_blank" rel="noopener noreferrer"
            className="text-[10px] font-mono text-white/25 hover:text-white transition-colors">
            ↗ /producers/{producer.slug}
          </a>
        </div>

        <FormSection title="Identity">
          <FormField type="text" label="Name" required value={form.name} error={errors.name}
            onChange={(v) => set("name", v)} />
          {/* Slug is immutable after creation — changing it would break public URLs */}
          <div className="space-y-0">
            <p className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
              Slug <span className="text-white/15 normal-case tracking-normal ml-1">(read-only)</span>
            </p>
            <input
              type="text"
              readOnly
              value={form.slug}
              className="w-full bg-white/[0.02] border border-white/5 px-4 py-2.5 text-sm text-white/40 font-mono text-xs cursor-not-allowed"
            />
            <p className="mt-1.5 text-[10px] text-white/20">
              Used in URLs: /producers/[slug] — cannot be changed after creation.
            </p>
          </div>
          <FormField type="text" label="Specialty" value={form.specialty} onChange={(v) => set("specialty", v)} />
          <FormField type="text" label="Credits" value={form.credits} onChange={(v) => set("credits", v)} />
          <FormField type="text" label="Signature Sound" value={form.signature} onChange={(v) => set("signature", v)} />
        </FormSection>

        <FormSection title="Biography">
          <FormField type="textarea" label="Bio" rows={5} value={form.bio} onChange={(v) => set("bio", v)} />
        </FormSection>

        <FormSection title="Images">
          <FormField type="url" label="Hero Image URL" value={form.heroImageUrl}
            placeholder="https://…" mono onChange={(v) => set("heroImageUrl", v)} />
          <FormField type="url" label="Profile Image URL" value={form.profileImageUrl}
            placeholder="https://…" mono onChange={(v) => set("profileImageUrl", v)} />
        </FormSection>

        <FormSection title="Social Links">
          <FormField type="url" label="Instagram" value={form["socialLinks.instagram"]}
            mono onChange={(v) => set("socialLinks.instagram", v)} />
          <FormField type="url" label="Spotify" value={form["socialLinks.spotify"]}
            mono onChange={(v) => set("socialLinks.spotify", v)} />
          <FormField type="url" label="SoundCloud" value={form["socialLinks.soundcloud"]}
            mono onChange={(v) => set("socialLinks.soundcloud", v)} />
        </FormSection>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} saving={saving} />
          <DangerButton onClick={handleDelete} label="Delete Producer" />
        </div>
      </div>
    </AdminShell>
  );
}

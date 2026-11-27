"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AuthorAvatar } from "@/components/authors/author-avatar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mutationErrorMessage, writeOutcomeUncertain } from "@/lib/api-error";
import { authorPhoto } from "@/lib/author-presentation";
import { authorPhotoTypes, fetchPublicAuthorProfile, savePublicAuthorProfile, uploadAuthorPhoto, validateAuthorPhoto } from "@/lib/author-profile";
import { scheduleRequest } from "@/lib/schedule-request";

export function AdminAuthorProfileForm({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [profile, setProfile] = useState<{ name: string; bio: string; profilePicture: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [uncertain, setUncertain] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    const cancel = scheduleRequest(async () => {
      try {
        const source = await fetchPublicAuthorProfile(id);
        if (active) setProfile({
          name: String(source.name),
          bio: typeof source.bio === "string" ? source.bio : "",
          profilePicture: authorPhoto({ profilePicture: typeof source.profilePicture === "string" ? source.profilePicture : null }),
        });
      } catch {
        if (active) setError("The linked public profile could not be loaded.");
      }
    });
    return () => { active = false; cancel(); };
  }, [id, attempt]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile?.name.trim() || busy.current || uncertain) return;
    busy.current = true;
    setSaving(true);
    setError("");
    let profileWriteStarted = false;
    try {
      const profilePicture = file ? await uploadAuthorPhoto(file, "admin") : undefined;
      if (profilePicture) {
        setProfile({ ...profile, profilePicture });
        setFile(null);
      }
      profileWriteStarted = true;
      await savePublicAuthorProfile(id, {
        name: profile.name.trim(),
        bio: profile.bio.trim(),
        ...(profilePicture || profile.profilePicture ? { profilePicture: profilePicture ?? profile.profilePicture } : {}),
      });
      toast.success("Author profile saved.");
      onSaved();
    } catch (failure) {
      setUncertain(profileWriteStarted && writeOutcomeUncertain(failure));
      setError(profileWriteStarted
        ? mutationErrorMessage(failure, "Could not save the author profile. Check the fields and try again.")
        : failure instanceof Error ? failure.message : "The photo could not upload.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  if (!profile) return error
    ? <ErrorState title="Public profile unavailable" message={error} onRetry={() => { setError(""); setAttempt((value) => value + 1); }} />
    : <p role="status">Loading public profile…</p>;

  return (
    <form onSubmit={save} className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-semibold">Public profile</h3>
      <AuthorAvatar author={profile} className="size-16 text-lg" sizes="64px" />
      <Label htmlFor="admin-author-name">Name</Label>
      <Input id="admin-author-name" required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
      <Label htmlFor="admin-author-bio">Biography</Label>
      <Textarea id="admin-author-bio" maxLength={2000} value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
      <Label htmlFor="admin-author-photo">Upload a photo</Label>
      <Input id="admin-author-photo" type="file" accept={authorPhotoTypes} onChange={(event) => {
        const photo = event.target.files?.[0];
        setFile(null);
        if (!photo) return;
        try { validateAuthorPhoto(photo); setFile(photo); setError(""); }
        catch (failure) {
          setError(failure instanceof Error ? failure.message : "Choose a valid image.");
          event.target.value = "";
        }
      }} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {uncertain && <Link href={`/authors/${encodeURIComponent(id)}`} className="block text-sm underline">Check the public profile</Link>}
      <Button type="submit" disabled={saving || uncertain}>{saving ? "Saving…" : "Save public profile"}</Button>
    </form>
  );
}

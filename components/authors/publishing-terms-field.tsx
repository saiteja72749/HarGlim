"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiResource } from "@/hooks/use-api-resource";
import { acceptTerms, loadTerms, termsConflict } from "@/lib/publishing-terms";
import { describeApiError } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth-store";

export function usePublishingTerms() {
  const resource = useApiResource("publishing-terms", () => loadTerms());
  const [agreedVersion, setAgreedVersion] = useState<string>();
  const [message, setMessage] = useState("");
  const checking = useRef(false);
  const refresh = async () => {
    setAgreedVersion(undefined);
    setMessage("");
    try {
      const current = await loadTerms(true);
      await resource.mutate(current, { revalidate: false });
    } catch {
      await resource.mutate(undefined, { revalidate: false });
      setMessage("Publishing terms could not refresh. Check your connection and try again.");
    }
  };

  async function confirm() {
    if (checking.current || !resource.data) return false;
    checking.current = true;
    setMessage("");
    const session = useAuthStore.getState().user;
    const accountId = session?._id ?? session?.id;
    const assertAccount = () => {
      const active = useAuthStore.getState().user;
      if (!accountId || (active?._id ?? active?.id) !== accountId) throw new Error("The author session changed.");
    };
    try {
      const current = await loadTerms();
      assertAccount();
      if (current.required && current.version !== resource.data.version) {
        await refresh();
        setMessage("The terms changed. Review the current version before continuing.");
        return false;
      }
      await resource.mutate(current, { revalidate: false });
      if (!current.required) return true;
      if (!current.version || current.version !== agreedVersion || !current.sections.length ||
        JSON.stringify(current.sections) !== JSON.stringify(resource.data.sections)) {
        setAgreedVersion(undefined);
        setMessage("Review the current publishing terms before submitting.");
        return false;
      }
      assertAccount();
      const accepted = await acceptTerms(current.version);
      assertAccount();
      await resource.mutate(accepted, { revalidate: false });
      return true;
    } catch (error) {
      const failure = describeApiError(error);
      if (failure.response?.status === 409 || termsConflict(error)) await refresh();
      setMessage(failure.response?.status === 429 ? "Too many requests. Wait before checking acceptance again."
        : failure.response?.status === 409 || termsConflict(error) ? "The terms changed. Review the current version before continuing."
          : "Publishing terms acceptance could not be verified. Refresh the status and try again.");
      return false;
    } finally {
      checking.current = false;
    }
  }

  return { resource, agreedVersion, setAgreedVersion, message, refresh, confirm,
    ready: Boolean(resource.data && !resource.loading && !resource.error &&
      (!resource.data.required || (resource.data.sections.length && agreedVersion === resource.data.version))) };
}

export function PublishingTermsField({ terms, disabled }: { terms: ReturnType<typeof usePublishingTerms>; disabled: boolean }) {
  const id = useId();
  const { resource, message } = terms;
  const status = resource.data;
  return (
    <>
      {resource.loading && <p role="status">Checking publishing terms…</p>}
      {(resource.error || message || (status?.required && !status.sections.length)) && <div role="alert" className="space-y-2 text-sm">
        <p>{message || (resource.error ? "Publishing terms could not load." : "The required publishing terms are not published.")}</p>
        <Button type="button" variant="outline" disabled={disabled || resource.loading} onClick={() => void terms.refresh()}>Refresh publishing terms</Button>
      </div>}
      {status?.required && status.version && status.effectiveAt && status.sections.length > 0 && !resource.error && <fieldset disabled={disabled} className="space-y-3 rounded-lg border p-4">
        <legend className="px-1 font-semibold">Publishing terms · {status.version}</legend>
        <p className="text-sm">Effective {new Date(status.effectiveAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
        <div className="max-h-64 space-y-3 overflow-auto text-sm" tabIndex={0} aria-label="Current publishing terms">
          {status.sections.map((section, index) => <div key={index}><h3 className="font-semibold">{section.title}</h3>
            <p className="whitespace-pre-wrap">{section.content}</p></div>)}
        </div>
        <label htmlFor={id} className="flex items-center gap-2 text-sm">
          <input id={id} type="checkbox" checked={terms.agreedVersion === status.version}
            onChange={(event) => terms.setAgreedVersion(event.target.checked ? status.version ?? undefined : undefined)} />
          I accept the current publishing terms
        </label>
      </fieldset>}
    </>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";
type FieldErrors = { name?: string; email?: string; message?: string };

const FIELD_CLASS =
  "border-border focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.22)] rounded-lg border bg-white/[0.02] px-3.5 py-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-white/25";

export function ContactForm() {
  const t = useTranslations("ContactForm");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate(formData: FormData): FieldErrors {
    const next: FieldErrors = {};
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!name) next.name = t("errorRequired");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t("errorEmail");
    if (message.length < 10) next.message = t("errorMessage");
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const nextErrors = validate(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      // Focus the first invalid field by name, not by querying for
      // aria-invalid="true" — setErrors() hasn't re-rendered yet at this
      // point, so that attribute is still absent and the query finds nothing.
      const firstInvalidName = (["name", "email", "message"] as const).find(
        (field) => nextErrors[field],
      );
      if (firstInvalidName) {
        form.querySelector<HTMLElement>(`#${firstInvalidName}`)?.focus();
      }
      return;
    }

    setStatus("submitting");

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
      turnstileToken: formData.get("cf-turnstile-response"),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("request_failed");

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      id="contact"
      className="relative overflow-hidden border-t border-white/[0.09] bg-[#080808] px-6 py-10 md:px-11 md:py-11"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-230px] left-[38%] h-[420px] w-[520px] bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.18),rgba(217,119,6,0)_62%)]"
      />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 md:flex-row md:gap-11">
        <div className="md:w-[320px] md:shrink-0">
          <h2 className="m-0 text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em] md:text-[38px]">
            {t("heading")}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed text-pretty md:text-[14.5px]">
            {t("intro")}
          </p>
          <div className="mt-4 flex flex-col gap-1.5">
            <a href="mailto:hello@yushko.dev" className="hover:text-accent-bright font-mono text-[13.5px] leading-[1.6] transition-colors">
              hello@yushko.dev
            </a>
            <a href="https://github.com/yushkonazar" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-accent-bright font-mono text-[13.5px] leading-[1.6] transition-colors">
              github.com/yushkonazar
            </a>
            <a href="https://linkedin.com/in/nazar-yushko" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-accent-bright font-mono text-[13.5px] leading-[1.6] transition-colors">
              linkedin.com/in/nazar-yushko
            </a>
          </div>
        </div>

        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />

        <form onSubmit={handleSubmit} noValidate className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-muted-foreground font-mono text-[11px] tracking-[0.1em] uppercase">
              {t("name")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={200}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              placeholder={t("namePlaceholder")}
              className={cn(FIELD_CLASS, errors.name && "border-destructive bg-destructive/[0.06]")}
            />
            {errors.name && (
              <span id="name-error" className="text-destructive text-[12.5px]">
                {errors.name}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-muted-foreground font-mono text-[11px] tracking-[0.1em] uppercase">
              {t("email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={200}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              placeholder={t("emailPlaceholder")}
              className={cn(FIELD_CLASS, errors.email && "border-destructive bg-destructive/[0.06]")}
            />
            {errors.email && (
              <span id="email-error" className="text-destructive text-[12.5px]">
                {errors.email}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="message" className="text-muted-foreground font-mono text-[11px] tracking-[0.1em] uppercase">
              {t("message")}
            </label>
            <textarea
              id="message"
              name="message"
              required
              maxLength={5000}
              rows={3}
              aria-invalid={Boolean(errors.message)}
              aria-describedby={errors.message ? "message-error" : undefined}
              placeholder={t("messagePlaceholder")}
              className={cn(FIELD_CLASS, "resize-y", errors.message && "border-destructive bg-destructive/[0.06]")}
            />
            {errors.message && (
              <span id="message-error" className="text-destructive text-[12.5px]">
                {errors.message}
              </span>
            )}
          </div>

          <div className="cf-turnstile md:col-span-2" data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />

          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
            <span className="text-muted-foreground font-mono text-[11.5px] leading-[1.4]">
              {t("privacyNote")}
            </span>
            <button
              type="submit"
              disabled={status === "submitting"}
              className={cn(
                "bg-accent text-accent-foreground hover:bg-accent-bright focus-visible:outline-accent-bright h-12 cursor-pointer rounded-lg px-7 text-[14.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:h-[46px]",
                status === "submitting" && "cursor-wait opacity-60",
              )}
            >
              {status === "submitting" ? t("submitting") : t("submit")}
            </button>
          </div>

          <div aria-live="polite" className="md:col-span-2 empty:hidden">
            {status === "success" && (
              <p role="status" className="flex items-start gap-2.5 rounded-lg border border-emerald-400/40 bg-emerald-500/[0.08] px-3.5 py-3 text-[13.5px] leading-relaxed text-emerald-200">
                <span aria-hidden className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-emerald-400" />
                {t("success")}
              </p>
            )}
            {status === "error" && (
              <p role="alert" className="text-destructive border-destructive/40 bg-destructive/[0.06] rounded-lg border px-3.5 py-3 text-[13.5px] leading-relaxed">
                {t("error")}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

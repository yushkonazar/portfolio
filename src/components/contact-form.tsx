"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { TypingPlaceholder } from "./typing-placeholder";
import { Reveal } from "./reveal";
import { GitHubIcon, LinkedInIcon, MailIcon } from "./icons";

type Status = "idle" | "submitting" | "success" | "error";
type Verification = "loading" | "ready" | "failed";
type FieldErrors = { name?: string; email?: string; message?: string };

// placeholder:text-white/25 measured at ~2.2:1 against the field background —
// well under the 4.5:1 WCAG AA floor. /50 lands at ~5.3:1.
const FIELD_CLASS =
  "border-border focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.22)] rounded-lg border bg-white/[0.02] px-3.5 py-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-white/50";

// Only a deadline for giving up, not the moment of truth: success is detected
// the instant the widget draws its iframe. Six seconds used to be both, which
// declared failure on any connection slow enough to still be fetching the
// script — a throttled phone reached it easily.
const VERIFY_DEADLINE_MS = 15000;

// The address stays in `value` even though it isn't drawn — it's what the
// button announces to a screen reader and what shows on hover as a title.
const CONTACTS = [
  {
    label: "Email",
    value: "hello@yushko.dev",
    href: "mailto:hello@yushko.dev",
    Icon: MailIcon,
  },
  {
    label: "GitHub",
    value: "github.com/yushkonazar",
    href: "https://github.com/yushkonazar",
    Icon: GitHubIcon,
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/nazar-yushko",
    href: "https://linkedin.com/in/nazar-yushko",
    Icon: LinkedInIcon,
  },
];

export function ContactForm() {
  const t = useTranslations("ContactForm");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [verification, setVerification] = useState<Verification>("loading");
  const [messageValue, setMessageValue] = useState("");
  const [messageFocused, setMessageFocused] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = turnstileRef.current;
    if (!host) return;

    let settled = false;
    const settle = (state: Verification) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(deadline);
      window.clearTimeout(initial);
      setVerification(state);
    };

    // Turnstile renders whenever its script finishes, which is not on any
    // schedule we control — so watch for the iframe instead of guessing when
    // to look for it.
    const observer = new MutationObserver(() => {
      if (host.querySelector("iframe")) settle("ready");
    });
    observer.observe(host, { childList: true, subtree: true });

    // Covers the case where the script was cached and had already rendered
    // before this effect ran, which the observer would never report.
    const initial = window.setTimeout(() => {
      if (host.querySelector("iframe")) settle("ready");
    }, 0);

    const deadline = window.setTimeout(() => {
      settle(host.querySelector("iframe") ? "ready" : "failed");
    }, VERIFY_DEADLINE_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(deadline);
      window.clearTimeout(initial);
    };
  }, []);

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
      setMessageValue("");
    } catch {
      setStatus("error");
    }
  }

  // Memoised because a fresh array each render would be a new dependency for
  // the placeholder's effect, restarting its timer on every keystroke.
  const prompts = useMemo(() => t("messagePrompts").split("|"), [t]);
  const showTypingPlaceholder = !messageFocused && messageValue === "";

  return (
    // Padding inside the max-width box, matching every other section — on the
    // section it put this column a gutter left of the work list above it.
    <section
      id="contact"
      className="relative overflow-hidden border-t border-white/[0.09] bg-[#0f0f0f]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-230px] left-[38%] h-[420px] w-[520px] bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.18),rgba(217,119,6,0)_62%)]"
      />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:flex-row md:gap-11 md:px-11 md:py-11">
        <Reveal className="md:w-[320px] md:shrink-0">
          <h2 className="m-0 text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em] md:text-[38px]">
            {t("heading")}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed text-pretty md:text-[14.5px]">
            {t("intro")}
          </p>

          {/* These are the only copies on the page now, so they carry the
              weight the footer used to share. Three equal buttons: the label
              alone at rest, the mark sliding in beside it on approach. The
              cells are fixed-width so one button expanding its icon re-centres
              its own contents instead of nudging its neighbours. */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {CONTACTS.map(({ label, value, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={`${label} — ${value}`}
                title={value}
                {...(href.startsWith("http")
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
                className="group border-border hover:border-accent focus-visible:outline-accent-bright flex h-11 items-center justify-center rounded-lg border transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] motion-reduce:transition-none">
                  <span className="min-w-0 overflow-hidden">
                    <Icon className="text-accent-bright mr-2 h-[15px] w-[15px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
                  </span>
                </span>
                <span className="group-hover:text-accent-bright font-mono text-[11.5px] tracking-[0.12em] uppercase transition-colors">
                  {label}
                </span>
              </a>
            ))}
          </div>
        </Reveal>

        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          onError={() => setVerification("failed")}
        />

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
            <div className="relative">
              <textarea
                id="message"
                name="message"
                required
                maxLength={5000}
                rows={3}
                value={messageValue}
                onChange={(event) => setMessageValue(event.target.value)}
                onFocus={() => setMessageFocused(true)}
                onBlur={() => setMessageFocused(false)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "message-error" : undefined}
                className={cn(FIELD_CLASS, "w-full resize-y", errors.message && "border-destructive bg-destructive/[0.06]")}
              />
              {showTypingPlaceholder && <TypingPlaceholder phrases={prompts} />}
            </div>
            {errors.message && (
              <span id="message-error" className="text-destructive text-[12.5px]">
                {errors.message}
              </span>
            )}
          </div>

          {/* Hidden once it has done its job — a large "success" panel from a
              third party is noise the visitor never asked to read. */}
          <div
            ref={turnstileRef}
            className={cn(
              "cf-turnstile md:col-span-2",
              (status === "success" || verification === "failed") && "hidden",
            )}
            data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          />

          {verification === "failed" && (
            <p
              role="alert"
              className="text-muted-foreground border-border md:col-span-2 rounded-lg border border-dashed px-3.5 py-3 text-[13px] leading-relaxed"
            >
              {t("verifyFailed")}
            </p>
          )}

          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
            <span className="text-muted-foreground font-mono text-[11.5px] leading-[1.4]">
              {t("privacyNote")}
            </span>
            <button
              type="submit"
              disabled={status === "submitting" || verification === "failed"}
              className={cn(
                "bg-accent text-accent-foreground hover:bg-accent-bright focus-visible:outline-accent-bright h-12 cursor-pointer rounded-lg px-7 text-[14.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:h-[46px]",
                status === "submitting" && "cursor-wait opacity-60",
                verification === "failed" && "cursor-not-allowed opacity-40",
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

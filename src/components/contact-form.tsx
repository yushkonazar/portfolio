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

/**
 * Only the corner of the Turnstile API this form uses. Explicit render is what
 * makes the states below trustworthy: the auto-rendering `cf-turnstile` class
 * gives the page nothing to read except the DOM, and a widget that has drawn
 * its *own* error inside the iframe (unlisted hostname, network trouble) looks
 * exactly like a working one from out here. The callbacks say which it is.
 */
type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
    },
  ) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    /** Named in the script URL's `onload`, so it has to live on window. */
    onTurnstileReady?: () => void;
  }
}

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileReady";

// Inlined at build time, so reading it once out here is the same value the
// effect would read on every render.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// placeholder:text-white/25 measured at ~2.2:1 against the field background —
// well under the 4.5:1 WCAG AA floor. /50 lands at ~5.3:1.
const FIELD_CLASS =
  "border-border focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.22)] rounded-lg border bg-white/[0.02] px-3.5 py-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-white/50";

/** How long the "Copied" confirmation stays up. */
const COPIED_MS = 1800;

const EMAIL_ADDRESS = "hello@yushko.dev";

// The address stays in `value` even though it isn't drawn — it's what the
// button announces to a screen reader and what shows on hover as a title.
//
// Email copies instead of opening a mail client. Plenty of people read their
// mail somewhere the OS handler doesn't point at, and for them a mailto: is a
// dead end where the address itself would have been useful.
const CONTACTS = [
  {
    label: "Email",
    value: EMAIL_ADDRESS,
    href: `mailto:${EMAIL_ADDRESS}`,
    copies: true,
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
  // Starting in the fallback when there is no key at all: the widget could
  // never issue a token, so a submit button here would be a guaranteed dead
  // end, and there is nothing to wait for that would change that.
  const [verification, setVerification] = useState<Verification>(
    SITE_KEY ? "loading" : "failed",
  );
  // Held separately from `verification` because the two expire independently:
  // a widget stays rendered and healthy long after the token it issued goes
  // stale, and only the token is what the server will accept.
  const [token, setToken] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [messageValue, setMessageValue] = useState("");
  const [messageFocused, setMessageFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const host = turnstileRef.current;
    if (!host || !SITE_KEY) return;

    const render = () => {
      if (widgetId.current !== null) return;
      widgetId.current =
        window.turnstile?.render(host, {
          sitekey: SITE_KEY,
          theme: "dark",
          callback: (issued) => {
            setToken(issued);
            setVerification("ready");
          },
          "error-callback": () => {
            setToken(null);
            setVerification("failed");
          },
          "expired-callback": () => setToken(null),
        }) ?? null;
    };

    window.onTurnstileReady = render;
    // A remount — Fast Refresh, or a return through the router — arrives after
    // the script has already run and fired its onload, which will not fire a
    // second time.
    if (window.turnstile) render();

    return () => {
      window.onTurnstileReady = undefined;
      const rendered = widgetId.current;
      widgetId.current = null;
      if (rendered !== null) window.turnstile?.remove(rendered);
    };
  }, []);

  // Reset runs from here rather than from the click handler so it lands after
  // the render that puts the widget back on screen — a display:none widget is
  // a poor target for it. `attempt` starts at 0, which skips the mount.
  useEffect(() => {
    if (attempt === 0) return;
    const rendered = widgetId.current;
    if (rendered !== null) window.turnstile?.reset(rendered);
  }, [attempt]);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(EMAIL_ADDRESS);
    } catch {
      // Denied permission, or an insecure origin. The address is already in
      // the button's title and its accessible name, so there's nothing to
      // announce and nothing lost.
      return;
    }
    setCopied(true);
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  }

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

    // Belt to the disabled button's braces: without a token the server will
    // reject this anyway, and the visitor would read the rejection as a fault
    // of their own message.
    if (!token) return;

    setStatus("submitting");

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
      turnstileToken: token,
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
      // Turnstile tokens are single-use. Dropping it here is what makes the
      // second send go through a fresh challenge instead of replaying this one.
      setToken(null);
    } catch {
      setStatus("error");
    }
  }

  // A second message is a normal thing to want — "forgot to add the link" —
  // and after a success the widget is hidden and its token spent, so there is
  // nothing left to submit with until the challenge runs again.
  function startOver() {
    setStatus("idle");
    setErrors({});
    setToken(null);
    setVerification("loading");
    setAttempt((count) => count + 1);
    // The button that called this unmounts with the success panel, so focus
    // has to be placed deliberately or it drops to the document.
    formRef.current?.querySelector<HTMLElement>("#name")?.focus();
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
      // Translucent for the same reason as the services band: it composites to
      // the old #080808 over the page colour, but without blacking out the
      // fixed frame behind it.
      className="relative overflow-hidden border-t border-white/[0.09] bg-white/[0.012]"
    >
      {/* The amber ellipse that used to bleed out of the bottom-right of this
          section is gone. It had no source — nothing in the layout is lit from
          down there — so it read as a stray glow above the footer rather than as
          light. The warmth in this section comes from the button and the traces,
          both of which are actually emitting. */}
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 md:flex-row md:gap-11 md:px-11 md:py-11">
        <Reveal className="md:w-[320px] md:shrink-0">
          <h2 className="m-0 text-[1.875rem] leading-[1.05] font-extrabold tracking-[-0.03em] md:text-[2.375rem]">
            {t("heading")}
          </h2>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed text-pretty md:text-[0.90625rem]">
            {t("intro")}
          </p>

          {/* These are the only copies on the page now, so they carry the
              weight the footer used to share. Three equal buttons: the label
              alone at rest, the mark sliding in beside it on approach. The
              cells are fixed-width so one button expanding its icon re-centres
              its own contents instead of nudging its neighbours. */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            {CONTACTS.map(({ label, value, href, copies, Icon }) => {
              const cellClass =
                "group border-border hover:border-accent focus-visible:outline-accent-bright flex h-11 w-full cursor-pointer items-center justify-center rounded-lg border transition-colors hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2";
              const contents = (
                <>
                  <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] motion-reduce:transition-none">
                    <span className="min-w-0 overflow-hidden">
                      <Icon className="text-accent-bright mr-2 h-[15px] w-[15px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
                    </span>
                  </span>
                  <span className="group-hover:text-accent-bright font-mono text-[0.71875rem] tracking-[0.12em] uppercase transition-colors">
                    {label}
                  </span>
                </>
              );

              if (!copies) {
                return (
                  <a
                    key={label}
                    href={href}
                    aria-label={`${label} — ${value}`}
                    title={value}
                    {...(href.startsWith("http")
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                    className={cellClass}
                  >
                    {contents}
                  </a>
                );
              }

              return (
                // Positioned so the confirmation can sit over this one cell
                // without the other two shifting to make room for it.
                <span key={label} className="relative">
                  <button
                    type="button"
                    onClick={copyAddress}
                    aria-label={`${t("copyEmail")} — ${value}`}
                    // Still the mailto, for anyone who wants their mail client
                    // and reaches for the context menu.
                    title={`${value} · ${href}`}
                    className={cellClass}
                  >
                    {contents}
                  </button>
                  <span
                    role="status"
                    className={cn(
                      "text-accent-bright pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[0.6875rem] tracking-[0.08em] transition-opacity duration-200 motion-reduce:transition-none",
                      copied ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {copied ? t("copied") : ""}
                  </span>
                </span>
              );
            })}
          </div>
        </Reveal>

        <Script
          src={TURNSTILE_SRC}
          async
          defer
          onError={() => setVerification("failed")}
        />

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.1em] uppercase">
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
              <span id="name-error" className="text-destructive text-[0.78125rem]">
                {errors.name}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.1em] uppercase">
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
              <span id="email-error" className="text-destructive text-[0.78125rem]">
                {errors.email}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label htmlFor="message" className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.1em] uppercase">
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
              <span id="message-error" className="text-destructive text-[0.78125rem]">
                {errors.message}
              </span>
            )}
          </div>

          {/* Rendered into by the effect above, not by the `cf-turnstile`
              class. Hidden once it has done its job — a large "success" panel
              from a third party is noise the visitor never asked to read. */}
          <div
            ref={turnstileRef}
            className={cn(
              "md:col-span-2",
              (status === "success" || verification === "failed") && "hidden",
            )}
          />

          {verification === "failed" && (
            <p
              role="alert"
              className="text-muted-foreground border-border md:col-span-2 rounded-lg border border-dashed px-3.5 py-3 text-[0.8125rem] leading-relaxed"
            >
              {t("verifyFailed")}
            </p>
          )}

          <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
            <span className="text-muted-foreground font-mono text-[0.71875rem] leading-[1.4]">
              {t("privacyNote")}
            </span>
            <button
              type="submit"
              // No token, no send. The widget sits directly above this button
              // and shows its own progress, so a disabled button while the
              // challenge runs reads as "not yet" rather than as a dead end.
              disabled={status === "submitting" || !token}
              className={cn(
                "bg-accent text-accent-foreground hover:bg-accent-bright focus-visible:outline-accent-bright h-12 cursor-pointer rounded-lg px-7 text-[0.90625rem] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 md:h-[2.875rem]",
                status === "submitting" && "cursor-wait opacity-60",
                !token && status !== "submitting" && "cursor-not-allowed opacity-40",
              )}
            >
              {status === "submitting" ? t("submitting") : t("submit")}
            </button>
          </div>

          <div aria-live="polite" className="md:col-span-2 empty:hidden">
            {status === "success" && (
              <>
                <p role="status" className="flex items-start gap-2.5 rounded-lg border border-emerald-400/40 bg-emerald-500/[0.08] px-3.5 py-3 text-[0.84375rem] leading-relaxed text-emerald-200">
                  <span aria-hidden className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-emerald-400" />
                  {t("success")}
                </p>
                <button
                  type="button"
                  onClick={startOver}
                  className="focus-visible:outline-accent-bright mt-3 cursor-pointer border-b border-white/25 pb-px text-[0.84375rem] font-bold transition-colors hover:border-white focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {t("sendAnother")}
                </button>
              </>
            )}
            {status === "error" && (
              <p role="alert" className="text-destructive border-destructive/40 bg-destructive/[0.06] rounded-lg border px-3.5 py-3 text-[0.84375rem] leading-relaxed">
                {t("error")}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const t = useTranslations("ContactForm");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");

    const form = event.currentTarget;
    const formData = new FormData(form);
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

      if (!response.ok) {
        throw new Error("request_failed");
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <h2 className="text-sm font-medium tracking-wide uppercase">
        {t("heading")}
      </h2>

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm">
            {t("name")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={200}
            className="border-border focus:border-accent rounded-md border bg-transparent px-3 py-2 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={200}
            className="border-border focus:border-accent rounded-md border bg-transparent px-3 py-2 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="message" className="text-sm">
            {t("message")}
          </label>
          <textarea
            id="message"
            name="message"
            required
            maxLength={5000}
            rows={5}
            className="border-border focus:border-accent rounded-md border bg-transparent px-3 py-2 outline-none"
          />
        </div>

        <div
          className="cf-turnstile"
          data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />

        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            "bg-accent text-accent-foreground cursor-pointer rounded-md px-4 py-2 font-medium transition-opacity",
            status === "submitting" && "opacity-60",
          )}
        >
          {status === "submitting" ? t("submitting") : t("submit")}
        </button>

        {status === "success" && (
          <p className="text-sm text-emerald-500">{t("success")}</p>
        )}
        {status === "error" && (
          <p className="text-destructive text-sm">{t("error")}</p>
        )}
      </form>
    </section>
  );
}

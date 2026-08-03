import { getCloudflareContext } from "@opennextjs/cloudflare";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
};

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ContactPayload | null;

  if (!body) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const { name, email, message, turnstileToken } = body;

  if (
    !isNonEmptyString(name, 200) ||
    !isNonEmptyString(email, 200) ||
    !EMAIL_PATTERN.test(email) ||
    !isNonEmptyString(message, 5000) ||
    !isNonEmptyString(turnstileToken, 4000)
  ) {
    return Response.json({ error: "invalid_fields" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });

  const verifyResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
      }),
    },
  );
  const verifyData = (await verifyResponse.json()) as { success: boolean };

  if (!verifyData.success) {
    return Response.json({ error: "turnstile_failed" }, { status: 400 });
  }

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Portfolio contact form <hello@yushko.dev>",
      to: "hello@yushko.dev",
      reply_to: email,
      subject: `New message from ${name}`,
      text: message,
    }),
  });

  if (!emailResponse.ok) {
    return Response.json({ error: "send_failed" }, { status: 502 });
  }

  return Response.json({ success: true });
}

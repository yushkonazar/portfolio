import { getCloudflareContext } from "@opennextjs/cloudflare";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Everything that could break a mail header if it reached one, plus DEL. The
 * name is interpolated into the subject line; Resend takes JSON rather than a
 * raw header block, so this is depth rather than the only thing standing
 * between a newline and an injected header.
 */
const CONTROL_CHARS = /[\r\n\t\x00-\x1f\x7f]/g;
const SUBJECT_NAME_MAX = 100;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
};

/**
 * The fields of the siteverify response this route acts on. `hostname` is the
 * domain the challenge was actually solved on, which is what makes a token
 * farmed through a widget embedded somewhere else useless here.
 */
type SiteverifyResult = {
  success: boolean;
  hostname?: string;
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

  // Cloudflare sets this itself and it can't be spoofed by the client, unlike
  // X-Forwarded-For. Turnstile uses it to weigh the token against the address
  // that solved the challenge.
  const remoteip = request.headers.get("CF-Connecting-IP");

  const verifyResponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        ...(remoteip ? { remoteip } : {}),
      }),
    },
  );
  const verifyData = (await verifyResponse.json()) as SiteverifyResult;

  if (!verifyData.success || !isAllowedHostname(verifyData.hostname, env)) {
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
      subject: `New message from ${sanitizeSubjectName(name)}`,
      text: message,
    }),
  });

  if (!emailResponse.ok) {
    // The status alone is what distinguishes an expired API key from a rate
    // limit from an outage. The body is not logged: it echoes the message.
    console.error(
      `Resend rejected the contact email: ${emailResponse.status} ${emailResponse.statusText}`,
    );
    return Response.json({ error: "send_failed" }, { status: 502 });
  }

  return Response.json({ success: true });
}

function sanitizeSubjectName(name: string) {
  return name.replace(CONTROL_CHARS, "").trim().slice(0, SUBJECT_NAME_MAX);
}

function isAllowedHostname(
  hostname: string | undefined,
  env: CloudflareEnv,
): boolean {
  if (!hostname) return false;
  if (hostname === env.CONTACT_ALLOWED_HOSTNAME) return true;
  // wrangler.jsonc routes the apex and www to the same worker, so the widget
  // can legitimately have been solved on either one.
  if (hostname === `www.${env.CONTACT_ALLOWED_HOSTNAME}`) return true;

  // Local development only. `localhost` is where the form is served from, and
  // `example.com` is what siteverify reports for Cloudflare's always-pass test
  // keys — verified against the live endpoint, not assumed.
  if (process.env.NODE_ENV === "production") return false;
  return ["localhost", "127.0.0.1", "example.com"].includes(hostname);
}

// Public contact points only. The phone number and city stay off the site on
// purpose — they live in the CV for people who actually get that far.
export const contacts = {
  email: "hello@yushko.dev",
  github: "https://github.com/yushkonazar",
  linkedin: "https://linkedin.com/in/nazar-yushko",
} as const;

export const contactLinks = [
  { label: "Email", href: `mailto:${contacts.email}`, text: contacts.email },
  { label: "GitHub", href: contacts.github, text: "GitHub", external: true },
  {
    label: "LinkedIn",
    href: contacts.linkedin,
    text: "LinkedIn",
    external: true,
  },
] as const;

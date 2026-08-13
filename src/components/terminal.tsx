"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { projects } from "@/lib/projects";
import { featuredOrder, projectMeta } from "@/lib/project-meta";
import { contacts } from "@/lib/contacts";
import { skillGroups } from "@/lib/resume";

/**
 * An overlay terminal on the backquote key.
 *
 * Deliberately undiscoverable by anyone who wouldn't enjoy finding it: there is
 * no button, no hint, and no trace of it in the layout. People who reach for
 * `` ` `` on a portfolio are looking for exactly this; everyone else never
 * learns it exists, which is the point.
 *
 * English in both locales, because it is a terminal. Its content is read out of
 * the same data the pages render, so it can't drift out of date on its own.
 */

const PROMPT = "visitor@yushko.dev:~$";

/** Where `sudo hire-me` sets the trace field off, as fractions of the viewport. */
const BURST_POINTS = [
  [0.18, 0.22],
  [0.52, 0.14],
  [0.83, 0.3],
  [0.3, 0.6],
  [0.68, 0.72],
  [0.47, 0.44],
];

/** Staggered, so it spreads like a fracture instead of flashing all at once. */
const BURST_STAGGER_MS = 90;

type Line = { text: string; href?: string };

const BANNER: Line[] = [
  { text: "yushko.dev — type `help` for the list, `exit` or Escape to leave." },
];

const HELP: Line[] = [
  { text: "help       this list" },
  { text: "projects   what I've shipped" },
  { text: "stack      what I build with" },
  { text: "contact    how to reach me" },
  { text: "cv         the resume, as a PDF" },
  { text: "clear      wipe the screen" },
  { text: "exit       close the terminal" },
  { text: "" },
  { text: "There is one more. It isn't in this list." },
];

/** Read from the project data so the terminal can't fall out of step with it. */
function projectLines(): Line[] {
  return featuredOrder.flatMap((slug) => {
    const project = projects.find((entry) => entry.slug === slug);
    const meta = projectMeta[slug];
    if (!project || !meta) return [];
    const where =
      project.links?.demo ?? project.links?.repo ?? "private — code on request";
    return [
      {
        text: `${project.title.padEnd(13)}${meta.statusShort.en.padEnd(15)}${where}`,
      },
    ];
  });
}

function stackLines(): Line[] {
  return skillGroups.map((group) => ({
    text: `${group.label.en.padEnd(20)}${group.items.join(", ")}`,
  }));
}

const CONTACT: Line[] = [
  { text: contacts.email, href: `mailto:${contacts.email}` },
  { text: contacts.github.replace("https://", ""), href: contacts.github },
  { text: contacts.linkedin.replace("https://", ""), href: contacts.linkedin },
];

const CV: Line[] = [
  { text: "/Nazar-Yushko-CV.pdf", href: "/Nazar-Yushko-CV.pdf" },
];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function Terminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([]);
  const historyAt = useRef(-1);
  /** Where focus was before the terminal took it, so it can be handed back. */
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
    opener.current = null;
  }, []);

  useEffect(() => {
    // A key nobody can press is a feature nobody has. Touch devices get nothing
    // here, and lose nothing by it.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // `code`, not `key`: `key` is what the active layout produces, so on a
      // Ukrainian layout this physical key isn't a backquote at all and the
      // terminal was unreachable without switching layouts first. `code` names
      // the key itself.
      if (event.code !== "Backquote" || isTyping(event.target)) return;
      event.preventDefault();
      setOpen((current) => {
        if (current) return current;
        opener.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        return true;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus follows the terminal in and, via close(), back out again.
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // New output belongs on screen, not below the fold of a scrolled pane.
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [lines]);

  function scatterBursts() {
    BURST_POINTS.forEach(([fx, fy], index) => {
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("portfolio:burst", {
            detail: { x: window.innerWidth * fx, y: window.innerHeight * fy },
          }),
        );
      }, index * BURST_STAGGER_MS);
    });
  }

  function run(raw: string) {
    const command = raw.trim();
    const echo: Line = { text: `${PROMPT} ${command}` };

    if (command === "") {
      setLines((current) => [...current, echo]);
      return;
    }

    history.current = [command, ...history.current];
    historyAt.current = -1;

    switch (command.toLowerCase()) {
      case "help":
        setLines((current) => [...current, echo, ...HELP]);
        return;
      case "projects":
        setLines((current) => [...current, echo, ...projectLines()]);
        return;
      case "stack":
        setLines((current) => [...current, echo, ...stackLines()]);
        return;
      case "contact":
        setLines((current) => [...current, echo, ...CONTACT]);
        return;
      case "cv":
        setLines((current) => [...current, echo, ...CV]);
        return;
      case "clear":
        setLines([]);
        return;
      case "exit":
        close();
        return;
      case "sudo hire-me":
        setLines((current) => [
          ...current,
          echo,
          { text: `Access granted. ${contacts.email}`, href: `mailto:${contacts.email}` },
        ]);
        scatterBursts();
        return;
      default:
        setLines((current) => [
          ...current,
          echo,
          { text: `command not found: ${command} — try help` },
        ]);
    }
  }

  /**
   * Keeps Tab inside the dialog without stopping it.
   *
   * It used to be refused outright, on the reasoning that the input was the only
   * thing in here to focus. `contact` and `cv` print links, so that stopped
   * being true and left them unreachable from the keyboard — the output was
   * readable and its links were not.
   */
  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = dialog.current?.querySelectorAll<HTMLElement>(
      "a[href], button, input",
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

    event.preventDefault();
    const entries = history.current;
    if (entries.length === 0) return;
    const next =
      event.key === "ArrowUp"
        ? Math.min(historyAt.current + 1, entries.length - 1)
        : historyAt.current - 1;
    historyAt.current = Math.max(next, -1);
    setValue(historyAt.current === -1 ? "" : entries[historyAt.current]);
  }

  if (!open) return null;

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label="Terminal"
      onKeyDown={onDialogKeyDown}
      className="fixed inset-x-0 bottom-0 z-50 flex h-[60vh] flex-col border-t border-white/[0.16] bg-[#0a0a0a] font-mono text-[13px] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)]"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-2 text-[10.5px] tracking-[0.14em] text-white/40 uppercase">
        <span>terminal</span>
        <span aria-hidden>esc to close</span>
      </div>

      <div
        ref={scroller}
        className="text-muted-foreground flex-1 overflow-y-auto px-4 py-3 leading-[1.65]"
      >
        {lines.map((line, index) => (
          <p
            key={`${index}-${line.text}`}
            className="m-0 break-words whitespace-pre-wrap"
          >
            {line.href ? (
              <a
                href={line.href}
                {...(line.href.startsWith("http")
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
                className="text-accent-bright focus-visible:outline-accent-bright underline decoration-white/25 underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {line.text}
              </a>
            ) : (
              line.text
            )}
          </p>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(value);
          setValue("");
        }}
        className="flex shrink-0 items-center gap-2 border-t border-white/[0.08] px-4 py-3"
      >
        <span aria-hidden className="text-accent-bright shrink-0">
          {PROMPT}
        </span>
        <input
          ref={input}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Command"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="caret-accent-bright text-foreground min-w-0 flex-1 bg-transparent outline-none"
        />
      </form>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { projects } from "@/lib/projects";
import { featuredOrder, projectMeta } from "@/lib/project-meta";
import { contacts } from "@/lib/contacts";
import { now } from "@/lib/now";
import { skillGroups } from "@/lib/resume";

/**
 * An overlay terminal on the backquote key.
 *
 * It used to be deliberately undiscoverable, on the reasoning that people who
 * reach for `` ` `` on a portfolio are looking for exactly this and everyone else
 * loses nothing. That was wrong in the way a hidden feature is always wrong: the
 * owner couldn't find it either without being told. There is a mark in the footer
 * now, and the key still works for anyone who never looks down there.
 *
 * English in both locales, because it is a terminal. Its content is read out of
 * the same data the pages render, so it can't drift out of date on its own.
 */

const PROMPT = "visitor@yushko.dev:~$";
/** What the input row shows below `sm`, where the full one eats the line. */
const SHORT_PROMPT = "~$";

/** The event the footer's mark dispatches — the same shape the canvas already
 * uses for click bursts, rather than a second mechanism for the same job. */
export const TERMINAL_EVENT = "portfolio:terminal";

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

/**
 * A paste can be any length, and every line typed stays in the DOM. Neither is a
 * threat, but an unbounded list of nodes is still an unbounded list of nodes, and
 * a terminal that has to be closed and reopened to become responsive again is a
 * broken one.
 */
const MAX_INPUT = 120;
const MAX_LINES = 240;
const MAX_HISTORY = 60;

type Line = { text: string; href?: string };

/**
 * One table for the command set, so `help` and tab-completion cannot disagree
 * about what exists. `sudo` is deliberately absent — see the switch.
 */
const COMMANDS: [name: string, blurb: string][] = [
  ["help", "this list"],
  ["ls", "what's on this site"],
  ["open", "go somewhere — `open svitanok`"],
  ["projects", "what I've shipped"],
  ["stack", "what I build with"],
  ["contact", "how to reach me"],
  ["cv", "the resume, as a PDF"],
  ["whoami", "who's asking"],
  ["now", "what I'm working on"],
  ["history", "what you've typed"],
  ["clear", "wipe the screen"],
  ["exit", "close the terminal"],
];

/**
 * Everywhere `open` is allowed to go, and the only thing it consults.
 *
 * A fixed table rather than a parsed argument: the whole risk in an `open`
 * command is that it turns typed text into a destination. Here the text either
 * matches a key or nothing happens, so there is no path from the input to a URL.
 * Internal routes only — `open` navigates this site, it doesn't launch tabs.
 */
const PAGES: [target: string, path: string, blurb: string][] = [
  ["home", "/", "the front page"],
  ["work", "/#work", "the project list"],
  ["resume", "/resume", "experience, skills, education"],
  ["privacy", "/privacy", "what the site does and doesn't collect"],
  ...featuredOrder.map(
    (slug) =>
      [slug, `/projects/${slug}`, "case study"] as [string, string, string],
  ),
];

const BANNER: Line[] = [
  { text: "yushko.dev — type `help` for the list, `exit` or Escape to leave." },
];

function helpLines(): Line[] {
  return [
    ...COMMANDS.map(([name, blurb]) => ({ text: `${name.padEnd(11)}${blurb}` })),
    { text: "" },
    { text: "Tab completes. Up and Down walk what you've typed." },
    // Enough of a thread to follow, and no more. Naming it here would make it
    // one more line in a list; `sudo` on its own answers back.
    { text: "There is one more, and it isn't in this list." },
  ];
}

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

function listLines(): Line[] {
  return [
    ...PAGES.map(([target, , blurb]) => ({
      text: `${target.padEnd(13)}${blurb}`,
    })),
    { text: "" },
    { text: "`open <name>` to go there." },
  ];
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

/** Longest common prefix of the candidates, so Tab fills in as far as it can. */
function sharedPrefix(words: string[]) {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const word of words.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < word.length && prefix[i] === word[i]) i++;
    prefix = prefix.slice(0, i);
  }
  return prefix;
}

/**
 * What the typed text could become — read both by the list shown while typing
 * and by Tab, so the two can't offer different things.
 *
 * `typed` comes back alongside the hits because the list wants to show which part
 * of each candidate is already on the line, and `prefix` is what completing
 * writes in front of the chosen one.
 */
function candidates(value: string) {
  const text = value.trimStart();

  // Past the verb: complete a destination rather than another command.
  if (/^open\s/.test(text)) {
    const typed = text.slice(5).trimStart();
    const hits = PAGES.map(([target]) => target).filter((target) =>
      target.startsWith(typed),
    );
    return { kind: "target" as const, typed, hits, prefix: `open ` };
  }

  // A verb only while it is still one word. Anything with a space in it has
  // already committed to a command, and suggesting verbs then would be noise.
  if (text === "" || /\s/.test(text)) {
    return { kind: "none" as const, typed: text, hits: [], prefix: "" };
  }

  const hits = COMMANDS.map(([name]) => name).filter((name) =>
    name.startsWith(text),
  );
  return { kind: "verb" as const, typed: text, hits, prefix: "" };
}

export function Terminal() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([]);
  const historyAt = useRef(-1);
  /** Where focus was before the terminal took it, so it can be handed back. */
  const opener = useRef<HTMLElement | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
    opener.current = null;
  }, []);

  const show = useCallback(() => {
    setOpen((current) => {
      if (current) return current;
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      return true;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // `code`, not `key`: `key` is what the active layout produces, so on a
      // Ukrainian layout this physical key isn't a backquote at all and the
      // terminal was unreachable without switching layouts first. `code` names
      // the key itself.
      if (event.code !== "Backquote" || isTyping(event.target)) return;
      event.preventDefault();
      show();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(TERMINAL_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(TERMINAL_EVENT, show);
    };
  }, [show]);

  // Focus follows the terminal in and, via close(), back out again.
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  /**
   * Makes the rest of the document unreachable while this is up.
   *
   * `aria-modal="true"` was a claim with nothing behind it: the sheet covers the
   * lower 60vh, the page above stayed clickable and tabbable, and the trap only
   * held while focus happened to be inside already. Either the attribute had to
   * go or this did. `inert` is the same tool the portrait card uses for the face
   * turned away from the reader, so the pattern is the project's own.
   *
   * Only siblings this component didn't render, and only the ones it set itself
   * are cleared again — an element that was already inert stays that way.
   */
  useEffect(() => {
    if (!open) return;
    const mine = root.current;
    const parent = mine?.parentElement;
    if (!parent) return;

    const silenced = [...parent.children].filter(
      (element): element is HTMLElement =>
        element !== mine && element instanceof HTMLElement && !element.inert,
    );
    for (const element of silenced) element.inert = true;
    return () => {
      for (const element of silenced) element.inert = false;
    };
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

  /** Keeps the newest MAX_LINES, so a long session can't grow the DOM forever. */
  const append = useCallback((...added: Line[]) => {
    setLines((current) => [...current, ...added].slice(-MAX_LINES));
  }, []);

  function goTo(argument: string) {
    const match = PAGES.find(([target]) => target === argument);
    if (!match) {
      return [
        { text: argument ? `no such place: ${argument}` : "open where? try `ls`" },
      ];
    }
    const [target, path] = match;
    // Same tab, same site, and the path comes off the table rather than out of
    // what was typed. Locale is the routing config's job, not a string join.
    router.push(path);

    /* And then get out of the way. Left open, the sheet carried on making the
       page inert — so `open resume` delivered a resume nobody could touch until
       they closed the terminal.

       The scrollback does not survive the trip, which I checked rather than
       assumed after writing here that it would: the component remounts across a
       route change even from inside the layout, so a reopened terminal starts at
       its banner. Nothing is lost that matters — the destination is the answer —
       but it is not a session.

       Not `close()`: that hands focus back to whatever opened the terminal, and
       after a navigation that element is detached. Focus belongs to the new
       document. */
    opener.current = null;
    setOpen(false);
    return [{ text: `opening ${target} …` }];
  }

  function run(raw: string) {
    const command = raw.trim();
    const echo: Line = { text: `${PROMPT} ${command}` };

    if (command === "") {
      historyAt.current = -1;
      append(echo);
      return;
    }

    history.current = [command, ...history.current].slice(0, MAX_HISTORY);
    historyAt.current = -1;

    const [verb, ...rest] = command.toLowerCase().split(/\s+/);
    const argument = rest.join(" ");

    switch (verb) {
      case "help":
        return append(echo, ...helpLines());
      case "ls":
        return append(echo, ...listLines());
      case "open":
        return append(echo, ...goTo(argument));
      case "projects":
        return append(echo, ...projectLines());
      case "stack":
        return append(echo, ...stackLines());
      case "contact":
        return append(echo, ...CONTACT);
      case "cv":
        return append(echo, ...CV);
      case "whoami":
        // Read, not collected: what the page already knows about itself. No
        // storage, no beacon, nothing that isn't on screen anyway.
        return append(
          echo,
          { text: `guest, reading ${pathname} in ${document.documentElement.lang}` },
          { text: `local time ${new Date().toLocaleTimeString()}` },
        );
      // Dated on screen, not in a comment: whoever reads it can see for
      // themselves whether it is still current.
      case "now":
        return append(
          echo,
          ...now.lines.map((text) => ({ text })),
          { text: "" },
          { text: `as of ${now.asOf}` },
        );
      case "history":
        return append(
          echo,
          ...(history.current.length <= 1
            ? [{ text: "nothing yet." }]
            : history.current
                .slice(1)
                .map((entry, index) => ({ text: `${index + 1}  ${entry}` }))),
        );
      case "clear":
        setLines([]);
        return;
      case "exit":
        return close();
      // The thread from `help`. It answers rather than tells, which is the
      // difference between finding something and being handed it.
      case "sudo":
        if (argument === "hire-me") {
          append(echo, {
            text: `Access granted. ${contacts.email}`,
            href: `mailto:${contacts.email}`,
          });
          scatterBursts();
          return;
        }
        return append(
          echo,
          {
            text: argument
              ? `sudo: ${argument}: command not found`
              : "sudo: what would you like to do?",
          },
          { text: "one thing, and it's the reason you're here." },
        );
      default:
        return append(echo, {
          text: `command not found: ${command} — try help`,
        });
    }
  }

  /** What could be typed next, recomputed each render — it is a filter over two
   * constant tables, so there is nothing here worth memoising. */
  const suggestions = candidates(value);

  /** Fills the line in as far as the candidates agree, the way a shell does. */
  function complete() {
    const { hits, prefix } = suggestions;
    if (hits.length === 0) return;
    setValue(prefix + (hits.length === 1 ? hits[0] : sharedPrefix(hits)));
  }

  /** Clicking a suggestion takes it whole, which is the point of showing it. */
  function accept(hit: string) {
    setValue(`${suggestions.prefix}${hit} `.trimStart());
    input.current?.focus();
  }

  /**
   * Keeps Tab inside the dialog without refusing it.
   *
   * It used to be refused outright, on the reasoning that the input was the only
   * thing in here to focus. `contact` and `cv` print links, so that stopped being
   * true and left them unreachable from the keyboard.
   */
  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    // Completing takes precedence over moving, which is what a shell does — but
    // only from the input, so Tab still walks the links in the output.
    if (
      !event.shiftKey &&
      document.activeElement === input.current &&
      value.trim() !== ""
    ) {
      event.preventDefault();
      complete();
      return;
    }

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
    <div ref={root}>
      {/* The backdrop is what makes the modality real rather than declared: the
          page above is dimmed, and pressing it closes — the gesture everyone
          already knows. */}
      <button
        type="button"
        aria-label="Close terminal"
        onClick={close}
        className="fixed inset-0 z-40 cursor-default bg-black/45"
      />

      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Terminal"
        onKeyDown={onDialogKeyDown}
        className="fixed inset-x-0 bottom-0 z-50 flex h-[60vh] flex-col border-t border-white/[0.16] bg-[#0a0a0a] font-mono text-[0.8125rem] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-2 text-[0.65625rem] tracking-[0.14em] text-white/40 uppercase">
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

        <div className="relative shrink-0">
          {/* What the line could become, while it's being typed.

              Absolutely positioned above the input rather than in the flow: a row
              that appears and disappears as you type would move the input under
              your hands on every keystroke.

              `aria-hidden`, and the items are not focusable. Everything here is
              also reachable by Tab, which completes from the same function this
              list reads — so to a screen reader this is a second copy of a
              feature it already has, and a focusable control hidden from the
              accessibility tree is worse than no control. Ambiguous Tab used to
              print the candidates into the scrollback; that was this, once per
              press, and it isn't needed now. */}
          {suggestions.hits.length > 0 && value.trim() !== "" && (
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-full left-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap gap-1 pb-2"
            >
              {suggestions.hits.map((hit) => (
                <button
                  key={hit}
                  type="button"
                  tabIndex={-1}
                  onClick={() => accept(hit)}
                  className="hover:border-accent/50 hover:bg-accent/[0.12] pointer-events-auto cursor-pointer rounded border border-white/[0.14] bg-[#0f0f0f] px-1.5 py-[3px] text-[0.71875rem] leading-none transition-colors"
                >
                  {/* The part already on the line, then the part Tab would add —
                      so the list shows what completing does, not just what
                      exists. */}
                  <span className="text-accent-bright">
                    {hit.slice(0, suggestions.typed.length)}
                  </span>
                  <span className="text-white/45">
                    {hit.slice(suggestions.typed.length)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              run(value);
              setValue("");
            }}
            className="flex items-center gap-2 border-t border-white/[0.08] px-4 py-3"
          >
              {/* Short where the line is short. Measured at 375px, the full prompt
                took 150px of a 375px row — 40% of it — and left 185px to type
                into. A shell's prompt is a display choice, and the transcript
                below still carries the whole thing. */}
            <span aria-hidden className="text-accent-bright shrink-0 sm:hidden">
              {SHORT_PROMPT}
            </span>
            <span aria-hidden className="text-accent-bright hidden shrink-0 sm:inline">
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
              maxLength={MAX_INPUT}
              className="caret-accent-bright text-foreground min-w-0 flex-1 bg-transparent outline-none"
            />
          </form>
        </div>
      </div>
    </div>
  );
}

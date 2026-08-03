export type Project = {
  slug: string;
  title: string;
  summary: string;
  stack: string[];
  links?: {
    repo?: string;
    demo?: string;
  };
};

// Placeholder/MVP data — real bilingual case-study copy comes later.
// Facts (stack, links) are accurate; summaries are provisional.
export const projects: Project[] = [
  {
    slug: "moviehouse",
    title: "MovieHouse",
    summary: "Movie search web app powered by the TMDB API.",
    stack: ["Node.js", "Express", "EJS", "Tailwind CSS"],
    links: {
      repo: "https://github.com/yushkonazar/moviehouse",
      demo: "https://moviehouse-mou1.onrender.com",
    },
  },
  {
    slug: "modern-blog",
    title: "Modern Blog",
    summary:
      "Full-stack blog with server-side rendering and validated forms.",
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Clerk", "Zod"],
    links: {
      repo: "https://github.com/yushkonazar/modern-blog",
      demo: "https://modern-blog-5k8a.onrender.com",
    },
  },
  {
    slug: "svitanok",
    title: "Svitanok",
    summary:
      "Personal Telegram assistant with a morning briefing, conversational LLM actions, and a Mini App dashboard.",
    stack: ["TypeScript", "Cloudflare Workers", "Cloudflare KV", "React", "Vite"],
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}

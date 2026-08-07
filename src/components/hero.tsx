import Image from "next/image";

export function Hero({ name, role }: { name: string; role: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16 text-center md:flex-row md:gap-14 md:text-left">
      <div className="relative shrink-0">
        <div
          aria-hidden
          className="bg-accent/30 absolute -inset-6 -z-10 rounded-full blur-3xl"
        />
        <Image
          src="/avatar.jpg"
          alt={name}
          width={800}
          height={1200}
          priority
          className="border-border/60 h-56 w-auto rounded-2xl border object-cover shadow-2xl md:h-72"
        />
      </div>
      <div>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          {name}
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">{role}</p>
      </div>
    </div>
  );
}

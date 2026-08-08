import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Github,
  HeartPulse,
  Linkedin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "HealthGuard | The team behind Smart Pillbox AI",
  description:
    "Meet HealthGuard: the three-person team designing and building Smart Pillbox AI across care, business, software, hardware, and AI.",
};

const githubUrl = "https://github.com/stephenovo/smart-pillbox-ai";

const members = [
  {
    name: "Sunny SUN",
    formalName: "SUN Yuemeng",
    role: "Team Lead · UX & Business Strategy",
    description:
      "Sunny leads HealthGuard and keeps every decision grounded in people, viability, and purpose. She shapes the user experience while guiding market positioning, financial thinking, and business strategy.",
    image: "/team/sunny-sun.jpg",
    linkedIn: "https://www.linkedin.com/in/yuemeng-sun-19aa40390/",
    accent: "#f1b75d",
    accentSoft: "#fff4dc",
    tags: ["Team leadership", "UX design", "Market strategy", "Finance & advisory"],
  },
  {
    name: "Rebecca LUO",
    formalName: "LUO Peijia",
    role: "Software & Future Strategy",
    description:
      "Rebecca develops the software experience and turns future possibilities into a practical product direction. Her work connects engineering, long-term roadmap design, and business development.",
    image: "/team/rebecca-luo.jpg",
    linkedIn: "https://www.linkedin.com/in/peijia-luo-4a971438b/",
    accent: "#ff777c",
    accentSoft: "#fff0ee",
    tags: ["Software development", "Future roadmap", "Product direction", "Business design"],
  },
  {
    name: "Stephen ZHANG",
    formalName: "ZHANG Shunxi",
    role: "Technical Lead · Product Engineering",
    description:
      "Stephen leads the technical system end to end—from connected hardware and software to interface design and model training. He turns the team’s care vision into a working, integrated product.",
    image: "/team/stephen-zhang.jpg",
    linkedIn: "https://www.linkedin.com/in/stephenzsx",
    accent: "#53d1af",
    accentSoft: "#e7f6f2",
    tags: ["Hardware & software", "UI design", "Model training", "Technical leadership"],
  },
] as const;

function BrandMark() {
  return (
    <Image
      src="/brand-icon.png"
      alt=""
      aria-hidden="true"
      width={42}
      height={42}
      priority
      className="h-10 w-10 drop-shadow-[0_8px_18px_rgba(18,58,49,0.18)]"
    />
  );
}

export default function TeamPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fffdfa] text-[#22201c]">
      <section className="relative overflow-hidden border-b border-[#dce6e1] bg-[#eef6f2]">
        <div className="pointer-events-none absolute -left-28 top-20 h-80 w-80 rounded-full bg-[#f4c9c0]/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 -top-16 h-[430px] w-[430px] rounded-full bg-[#8edbc7]/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/55 to-transparent" />

        <nav className="relative z-10 border-b border-[#cfe0d8]/80 bg-white/35 backdrop-blur-md">
          <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <Link href="/" className="flex items-center gap-3" aria-label="Back to Smart Pillbox AI home">
              <BrandMark />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#28725f]">
                  HealthGuard
                </p>
                <p className="text-sm font-bold text-[#173c35]">Smart Pillbox AI</p>
              </div>
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#c8d8d0] bg-white/75 px-4 text-sm font-bold text-[#173c35] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              <span className="hidden sm:inline">Back to home</span>
              <span className="sm:hidden">Home</span>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-[590px] w-full max-w-[1440px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:px-12 lg:py-24">
          <div className="max-w-[790px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#b7d7cb] bg-white/65 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#176a4c] shadow-sm">
              <Sparkles aria-hidden="true" size={13} />
              Meet HealthGuard
            </span>
            <h1 className="mt-7 max-w-[760px] text-[48px] font-bold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-[78px]">
              Three minds.
              <span className="block text-[#267763]">One quieter way to care.</span>
            </h1>
            <p className="mt-7 max-w-[650px] text-base leading-7 text-[#5f6d65] sm:text-lg sm:leading-8">
              HealthGuard brings together human-centred design, business thinking,
              connected product engineering, and AI. We are building medication care
              that feels reassuring—not intrusive.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#173c35] px-5 text-sm font-bold text-white shadow-[0_18px_35px_-20px_rgba(23,60,53,0.9)] transition hover:-translate-y-0.5 hover:bg-[#245047]"
              >
                <Github aria-hidden="true" size={18} />
                Explore our GitHub
                <ArrowUpRight aria-hidden="true" size={15} />
              </a>
              <Link
                href="/hardware-simulator"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#bdd0c7] bg-white/70 px-5 text-sm font-bold text-[#173c35] transition hover:-translate-y-0.5 hover:bg-white"
              >
                View what we built <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[470px] lg:justify-self-end">
            <div className="absolute -inset-5 rotate-3 rounded-[34px] border border-[#bad8cc] bg-white/35" />
            <div className="relative rounded-[30px] border border-white/80 bg-[#173c35] p-6 text-white shadow-[0_35px_85px_-40px_rgba(23,60,53,0.8)] sm:p-8">
              <div className="flex items-start justify-between gap-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#53d1af] text-[#173c35]">
                  <HeartPulse aria-hidden="true" size={25} />
                </span>
                <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">
                  Team of three
                </span>
              </div>
              <p className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-[#81d8c8]">
                Our shared principle
              </p>
              <blockquote className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
                “Technology belongs in the background. Care stays at the centre.”
              </blockquote>
              <div className="mt-10 grid grid-cols-3 gap-2 border-t border-white/15 pt-5 text-center">
                {[
                  ["Care", "Human first"],
                  ["Build", "End to end"],
                  ["Learn", "Always ahead"],
                ].map(([label, copy]) => (
                  <div key={label}>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="mt-1 text-[10px] text-white/55">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fffdfa] py-20 sm:py-28">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-8 border-b border-[#e4ddd2] pb-10 md:grid-cols-[0.75fr_1.25fr] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b04a3c]">
                The people behind the product
              </p>
              <h2 className="mt-3 text-4xl font-bold tracking-[-0.035em] sm:text-5xl">
                Built across disciplines.
              </h2>
            </div>
            <p className="max-w-[650px] text-base leading-7 text-[#6e675c] md:justify-self-end">
              Each person owns a different part of the system, but no decision lives in
              isolation. Design informs engineering, engineering informs possibility,
              and business thinking keeps the product grounded in the real world.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {members.map((member, index) => (
              <article
                key={member.name}
                className="group overflow-hidden rounded-[28px] border border-[#e2ddd5] bg-white shadow-[0_24px_60px_-48px_rgba(38,39,34,0.55)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_32px_70px_-44px_rgba(38,39,34,0.65)]"
              >
                <div className="relative aspect-[1.12] overflow-hidden bg-[#f1eee8]">
                  <div
                    className="absolute inset-0 opacity-65"
                    style={{
                      background: `radial-gradient(circle at 75% 18%, ${member.accentSoft}, transparent 48%)`,
                    }}
                  />
                  <Image
                    src={member.image}
                    alt={`${member.name}, ${member.role}`}
                    fill
                    sizes="(min-width: 1024px) 31vw, (min-width: 640px) 70vw, 100vw"
                    className="object-cover object-center transition duration-500 group-hover:scale-[1.025]"
                    priority={index === 0}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
                  <span
                    className="absolute left-5 top-5 rounded-full border border-white/65 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#35342f] shadow-sm backdrop-blur-md"
                  >
                    {index === 0 ? "Team lead" : index === 1 ? "Software" : "Technical lead"}
                  </span>
                  <a
                    href={member.linkedIn}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${member.name}'s LinkedIn profile`}
                    className="absolute bottom-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/90 text-[#173c35] shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white"
                  >
                    <Linkedin aria-hidden="true" size={19} />
                  </a>
                </div>

                <div className="p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold tracking-[-0.025em]">{member.name}</h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#91897e]">
                        {member.formalName}
                      </p>
                    </div>
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full shadow-[0_0_0_6px_rgba(0,0,0,0.035)]"
                      style={{ backgroundColor: member.accent }}
                    />
                  </div>
                  <p className="mt-5 text-sm font-bold text-[#176a4c]">{member.role}</p>
                  <p className="mt-4 min-h-[112px] text-sm leading-7 text-[#6e675c]">
                    {member.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 border-t border-[#eee8df] pt-5">
                    {member.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#e8e1d8] bg-[#faf8f4] px-3 py-1.5 text-[10px] font-bold text-[#5f5a52]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#d4e3dc] bg-[#eaf4ef] py-16 sm:py-20">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col items-start justify-between gap-8 px-5 sm:px-8 md:flex-row md:items-center">
          <div className="flex max-w-[690px] items-start gap-4">
            <span className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#267763] shadow-sm">
              <ShieldCheck aria-hidden="true" size={24} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#28725f]">
                Open work, shared progress
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Follow the product as we build it.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#5f6d65]">
                Explore the interface, simulator, connected hardware work, and the
                technical decisions behind Smart Pillbox AI.
              </p>
            </div>
          </div>
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#173c35] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#245047]"
          >
            <Github aria-hidden="true" size={18} /> GitHub repository
            <ArrowUpRight aria-hidden="true" size={15} />
          </a>
        </div>
      </section>

      <footer className="bg-[#173c35] text-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="font-bold">HealthGuard</p>
              <p className="mt-0.5 text-xs text-white/55">The team behind Smart Pillbox AI</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-white/65">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <Link href="/hardware-simulator" className="transition hover:text-white">Simulator</Link>
            <a href={githubUrl} target="_blank" rel="noreferrer" className="transition hover:text-white">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

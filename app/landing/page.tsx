import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  MessageCircle,
  MonitorPlay,
  Pill,
  Radio,
  ShieldCheck,
  Sparkles,
  Wifi,
} from "lucide-react";
import IOSComingSoonButton from "./IOSComingSoonButton";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Smart Pillbox AI | Medication care that keeps families close",
  description:
    "A connected pillbox and a calm caregiver app for families supporting medication routines from near or far.",
};

function BrandMark() {
  return (
    <Image
      src="/brand-icon.png"
      alt=""
      aria-hidden="true"
      width={44}
      height={44}
      priority
      className="h-11 w-11 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
    />
  );
}

function PhonePreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-[330px] rounded-[40px] border-[7px] border-[#171816] bg-[#272824] p-2 shadow-[0_2px_0_#4f504b,0_42px_72px_-28px_rgba(0,0,0,0.78)]"
      aria-label="Smart Pillbox AI caregiver app preview"
    >
      <span className="absolute -left-[10px] top-24 h-14 w-1 rounded-l bg-[#30322f] shadow-[-1px_0_0_#62635e]" />
      <span className="absolute -left-[10px] top-44 h-9 w-1 rounded-l bg-[#30322f] shadow-[-1px_0_0_#62635e]" />
      <span className="absolute -right-[10px] top-32 h-20 w-1 rounded-r bg-[#30322f] shadow-[1px_0_0_#62635e]" />
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#171816] shadow-[inset_0_-1px_0_#393a37]" />
      <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[#faf7f2] px-4 pb-5 pt-10 text-[#22201c] shadow-[inset_0_0_14px_rgba(43,38,30,0.08)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-white/20" />
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#8b8479]">Monday, 4 Aug</p>
            <p className="mt-1 text-lg font-bold">Good morning, Sarah</p>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e7f6f2] text-[10px] font-bold text-[#00685f]">
            SC
          </span>
        </div>

        <div className="mt-5 border-b border-[#ece5da] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffe4df] text-sm font-bold text-[#b04a3c]">
              ML
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Margaret is doing well</p>
              <p className="mt-0.5 text-[11px] text-[#777064]">3 of 4 doses today</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-[#00a699]" />
          </div>
        </div>

        <div className="py-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold">Today</p>
            <p className="text-[10px] font-semibold text-[#8b8479]">Live</p>
          </div>
          <div className="mt-3 space-y-2">
            {[
              ["8:06", "Blood Pressure Pill", "Taken", "bg-[#e7f6f2] text-[#00685f]"],
              ["8:12", "Diabetes Pill", "Taken", "bg-[#e7f6f2] text-[#00685f]"],
              ["13:40", "Vitamin D", "40 min late", "bg-[#fdf3e2] text-[#8a5a12]"],
              ["20:00", "Heart Medicine", "Upcoming", "bg-[#f4efe7] text-[#6e675c]"],
            ].map(([time, medicine, status, tone]) => (
              <div
                key={`${time}-${medicine}`}
                className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-white px-2.5 py-2.5 shadow-[0_1px_2px_rgba(34,32,28,0.07)]"
              >
                <span className="text-[10px] font-bold text-[#8b8479]">{time}</span>
                <span className="truncate text-[11px] font-bold">{medicine}</span>
                <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${tone}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-[#fff0ee] p-3">
          <Sparkles aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-[#ff5a5f]" />
          <p className="text-[10px] leading-4 text-[#5f554e]">
            Evenings have been a little late this week. A short call after dinner may help.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="overflow-hidden bg-[#fffdfa] text-[#22201c]">
      <section className="relative h-[88svh] min-h-[520px] max-h-[800px] overflow-hidden bg-[#282923]">
        <Image
          src="/landing/smart-pillbox-ai-family.jpg"
          alt="An older couple sharing a creative afternoon with their caregiver"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[58%_center]"
        />
        <div className="absolute inset-0 bg-black/42" />

        <nav className="absolute inset-x-0 top-0 z-20 border-b border-white/20 bg-black/10 backdrop-blur-md">
          <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
            <BrandMark />
            <div className="hidden items-center gap-8 text-sm font-semibold text-white/90 lg:flex">
              <a href="#why" className="transition hover:text-white">
                Why Smart Pillbox AI
              </a>
              <a href="#how" className="transition hover:text-white">
                How it works
              </a>
              <a href="#together" className="transition hover:text-white">
                For families
              </a>
              <a href="#simulator" className="transition hover:text-white">
                Simulator demo
              </a>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/80 bg-white px-4 text-sm font-bold text-[#22201c] shadow-[0_10px_22px_-12px_rgba(0,0,0,0.75)] transition hover:-translate-y-0.5 hover:bg-[#f6f1e9]"
            >
              Open app <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1440px] items-end px-5 pb-10 pt-24 sm:px-8 sm:pb-14 lg:px-12">
          <div className="max-w-[760px] text-white">
            <p className={`${styles.revealEyebrow} mb-3 flex items-center gap-2 text-xs font-bold uppercase text-white/80`}>
              <span className="h-2 w-2 rounded-full bg-[#53d1af]" />
              Connected medication care
            </p>
            <h1 className={`${styles.revealTitle} text-[42px] font-bold leading-none sm:text-6xl lg:text-7xl`}>
              Smart Pillbox AI
            </h1>
            <p className={`${styles.revealCopy} mt-5 max-w-[600px] text-xl font-semibold leading-7 sm:text-2xl sm:leading-8`}>
              A little more independence for them. A lot more peace of mind for you.
            </p>
            <p className={`${styles.revealCopy} mt-4 max-w-[560px] text-sm leading-6 text-white/82 sm:text-base sm:leading-7`}>
              A connected pillbox and a calm family app keep the medication routine visible, without turning every day into a check-in.
            </p>
            <div className={`${styles.revealActions} mt-7 flex flex-wrap gap-3`}>
              <IOSComingSoonButton />
              <Link
                href="/hardware-simulator"
                className="inline-flex h-14 items-center gap-2 rounded-full border border-white/55 bg-black/10 px-7 text-sm font-bold text-white shadow-[0_14px_26px_-18px_rgba(0,0,0,0.85)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-black/20"
              >
                <MonitorPlay aria-hidden="true" size={17} />
                View simulator demo
              </Link>
              <a
                href="#how"
                className="inline-flex h-14 items-center gap-2 rounded-full px-4 text-sm font-bold text-white/90 transition hover:text-white"
              >
                See how it works <ArrowRight aria-hidden="true" size={17} />
              </a>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-white/80 lg:hidden">
              <Pill aria-hidden="true" size={15} /> Connected pillbox + caregiver app
            </div>
          </div>
        </div>

      </section>

      <section id="why" className="border-b border-[#ece5da] bg-[#fffdfa]">
        <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.25fr_0.75fr] md:items-end lg:px-12 lg:py-14">
          <h2 className="max-w-[820px] text-3xl font-bold leading-tight sm:text-4xl">
            Loved ones keep their rhythm. Families stay in the loop.
          </h2>
          <p className="max-w-[470px] text-sm leading-7 text-[#6e675c] md:justify-self-end">
            Smart Pillbox AI turns a simple lid opening into one quiet, shared signal. No cameras. No constant calls. Just the information a family needs.
          </p>
        </div>
      </section>

      <section id="how" className="bg-[#f6f1e9] py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-12">
          <div className="max-w-[460px]">
            <p className="text-xs font-bold uppercase text-[#b04a3c]">At home</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
              Familiar enough for every day. Smart enough to notice.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#6e675c]">
              Each compartment follows the medication plan, lights up at the right time, and records an opening without asking your loved one to learn another screen.
            </p>
            <div className="mt-8 divide-y divide-[#ddd4c7] border-y border-[#ddd4c7]">
              {[
                [BellRing, "Gentle light and chime reminders"],
                [Radio, "Automatic opening records"],
                [Wifi, "Secure device-to-family sync"],
              ].map(([Icon, label]) => (
                <div key={label as string} className="flex items-center gap-3 py-4">
                  <Icon aria-hidden="true" size={18} className="text-[#00685f]" />
                  <span className="text-sm font-bold">{label as string}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-[#ddd3c5] bg-[#faf6ee] shadow-[0_32px_70px_-48px_rgba(67,52,36,0.6)]">
            <Image
              src="/landing/smart-pillbox-product-v2.png"
              alt="Smart Pillbox AI eight-compartment connected pillbox with illuminated lids"
              width={1448}
              height={1086}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="h-auto w-full"
            />
            <p className="absolute bottom-5 right-6 rounded-full border border-[#c8bfae]/60 bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase text-[#514b42] shadow-sm backdrop-blur-sm">
              8-compartment connected pillbox
            </p>
          </div>
        </div>
      </section>

      <section id="together" className="bg-[#173c35] py-20 text-white sm:py-24">
        <div className="mx-auto grid w-full max-w-[1280px] gap-16 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-12">
          <div className="order-2 lg:order-1">
            <div className="relative mx-auto max-w-[390px] py-5">
              <div className="absolute inset-x-12 inset-y-10 rotate-6 rounded-[42px] border border-white/12 bg-[#264b43] shadow-[0_30px_55px_-34px_rgba(0,0,0,0.8)]" />
              <div className="relative rotate-[-2deg]">
                <div className={styles.phoneFloat}>
                  <PhonePreview />
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 max-w-[500px] lg:order-2 lg:justify-self-end">
            <p className="text-xs font-bold uppercase text-[#81d8c8]">Wherever you are</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
              See the day, not a wall of data.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/70">
              The Smart Pillbox AI app shows what happened, what still needs attention, and the gentle next step. It is designed for daughters, sons, partners, neighbours, and everyone sharing the care.
            </p>
            <div className="mt-8 space-y-5">
              {[
                "One live view for the whole care circle",
                "Clear alerts for late, missed, or repeated openings",
                "Weekly notes ready for the next clinic visit",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#53d1af] text-[#173c35]">
                    <Check aria-hidden="true" size={12} strokeWidth={3} />
                  </span>
                  <p className="text-sm font-semibold leading-6 text-white/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fffdfa] py-20 sm:py-24">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-[720px]">
            <p className="text-xs font-bold uppercase text-[#b04a3c]">One simple loop</p>
            <h2 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
              From reminder to reassurance.
            </h2>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
            {[
              {
                number: "01",
                icon: BellRing,
                title: "The pillbox reminds",
                copy: "A soft light and chime point to the right compartment at the scheduled time.",
              },
              {
                number: "02",
                icon: Pill,
                title: "A lid is opened",
                copy: "Smart Pillbox AI records the compartment and time automatically, with no extra step.",
              },
              {
                number: "03",
                icon: MessageCircle,
                title: "The family knows",
                copy: "The app stays quiet when all is well and brings the right moment to your attention.",
              },
            ].map((step, index) => (
              <article
                key={step.number}
                className={`border-t border-[#d8d0c4] pt-6 md:min-h-[280px] md:px-8 ${
                  index === 0 ? "md:pl-0" : "md:border-l"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#9a9388]">{step.number}</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0d8d4] bg-[#fff8f5] text-[#ff5a5f] shadow-[0_8px_18px_-12px_rgba(83,45,36,0.55)]">
                    <step.icon aria-hidden="true" size={20} />
                  </span>
                </div>
                <h3 className="mt-10 text-xl font-bold">{step.title}</h3>
                <p className="mt-3 max-w-[330px] text-sm leading-6 text-[#6e675c]">
                  {step.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="simulator"
        className="border-y border-[#d7ded9] bg-[#f4f3ef] py-20 sm:py-24"
      >
        <div className="mx-auto grid w-full max-w-[1320px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-12">
          <div className="max-w-[500px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c9d8d1] bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#176a4c]">
              <MonitorPlay aria-hidden="true" size={13} />
              Digital hardware twin
            </span>
            <h2 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              Tap the pillbox. Watch care respond.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#5f6d65]">
              Explore the team&apos;s latest simulator through the same event flow
              as the physical prototype. Open a compartment, start a reminder,
              test wrong-slot and wrong-time warnings, then see the caregiver
              timeline update live.
            </p>
            <Link
              href="/hardware-simulator"
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-[#173c35] px-5 text-sm font-bold text-white shadow-[0_16px_28px_-18px_rgba(23,60,53,0.8)] transition hover:-translate-y-0.5 hover:bg-[#245047]"
            >
              View simulator demo <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>

          <Link
            href="/hardware-simulator"
            aria-label="Open the interactive Smart Pillbox hardware simulator"
            className="group block overflow-hidden rounded-[28px] border border-[#d8dcd8] bg-[#fbfaf7] p-3 shadow-[0_32px_75px_-48px_rgba(28,42,36,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_38px_85px_-46px_rgba(28,42,36,0.68)] sm:p-5"
          >
            <div className="flex items-center justify-between px-1 pb-4 sm:px-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#2a7d67] sm:text-[10px]">
                  Smart Pillbox AI
                </p>
                <p className="mt-1 text-base font-bold sm:text-lg">Hardware Showcase</p>
              </div>
              <span className="flex items-center gap-2 rounded-lg border border-[#dfe3df] bg-white px-3 py-2 text-[10px] font-bold text-[#356d5e] shadow-sm sm:text-xs">
                <Wifi aria-hidden="true" size={14} /> Linked
              </span>
            </div>

            <div className="rounded-[25px] border border-white bg-[#f7f8f5] p-3 shadow-[inset_0_0_30px_rgba(87,115,101,0.08),0_18px_45px_-32px_rgba(26,55,44,0.6)] sm:p-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#31816d] sm:text-[10px]">
                    Digital hardware twin
                  </p>
                  <p className="mt-1 text-xs font-bold sm:text-sm">Click one to open the lid</p>
                </div>
                <ArrowRight
                  aria-hidden="true"
                  size={18}
                  className="text-[#31816d] transition group-hover:translate-x-1"
                />
              </div>

              <div className="rounded-[22px] border border-[#e4e7e3] bg-white/90 p-2.5 shadow-[0_16px_30px_-26px_rgba(18,46,37,0.65)] sm:p-3.5">
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                  {Array.from({ length: 8 }, (_, index) => {
                    const pillTones = [
                      "bg-white border-[#e9e4de]",
                      "bg-[#f2c64f] border-[#e2ad24]",
                      "bg-[#e66661] border-[#cf4b47]",
                    ];

                    return (
                      <div key={index} className="min-w-0">
                        <div className="relative aspect-[0.9] overflow-hidden rounded-[10px] border border-[#d9ddda] bg-[#fbfbfa] shadow-[inset_0_3px_8px_rgba(28,48,39,0.08),0_4px_8px_-7px_rgba(20,45,36,0.5)] sm:rounded-[14px]">
                          <span className="absolute left-1/2 top-1 h-1 w-5 -translate-x-1/2 rounded-full bg-[#70caf3] sm:w-7" />
                          <span className="absolute left-1/2 top-[23%] -translate-x-1/2 text-xs font-black text-[#2c3934] sm:text-base">
                            {index + 1}
                          </span>
                          {index < 3 && (
                            <span className="absolute inset-x-2 bottom-[18%] flex flex-wrap justify-center gap-0.5 opacity-90">
                              {Array.from({ length: 6 }, (_, pillIndex) => (
                                <span
                                  key={pillIndex}
                                  className={`h-1.5 w-2.5 rounded-full border sm:h-2 sm:w-3.5 ${pillTones[index]}`}
                                />
                              ))}
                            </span>
                          )}
                          <span className="absolute bottom-0 left-1/2 h-2.5 w-8 -translate-x-1/2 rounded-t-md border border-[#35a995] bg-[#4fc7b5] sm:h-3.5 sm:w-11" />
                        </div>
                        <div className="mt-1 hidden min-w-0 sm:block">
                          <p className="truncate text-[9px] font-bold text-[#2b3531]">
                            {index < 3 ? ["Morning", "Midday", "Evening"][index] : "Empty slot"}
                          </p>
                          <p className="mt-0.5 text-[8px] text-[#89928d]">
                            {index < 3 ? ["08:00", "13:00", "19:00"][index] : "--:--"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 sm:mt-4">
                  <div className="rounded-xl bg-[#173c35] px-3 py-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:px-4 sm:py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BellRing aria-hidden="true" size={14} className="text-[#62d2bd]" />
                        <div>
                          <p className="text-[8px] text-white/55 sm:text-[9px]">Next Reminder</p>
                          <p className="text-sm font-bold leading-none sm:text-lg">08:00</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-white/55 sm:text-[9px]">Battery</p>
                        <p className="text-[10px] font-bold sm:text-xs">100%</p>
                      </div>
                    </div>
                  </div>
                  <span className="hidden rounded-full border border-[#c9e5dd] bg-[#eef8f5] px-3 py-2 text-[9px] font-bold text-[#26705d] sm:inline-flex">
                    Live demo
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="relative min-h-[520px] overflow-hidden bg-[#272824] shadow-[inset_0_24px_50px_-40px_rgba(0,0,0,0.7)]">
        <Image
          src="/landing/smart-pillbox-ai-hands.jpg"
          alt="A reassuring hand held between family members"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/48" />
        <div className="relative z-10 mx-auto flex min-h-[520px] w-full max-w-[1440px] items-center px-5 py-16 sm:px-8 lg:px-12">
          <div className="max-w-[670px] text-white">
            <ShieldCheck aria-hidden="true" size={28} className="text-[#81d8c8]" />
            <p className="mt-6 text-3xl font-bold leading-tight sm:text-5xl">
              Care should feel close, even when you cannot be there in person.
            </p>
            <p className="mt-5 max-w-[520px] text-sm leading-7 text-white/75 sm:text-base">
              Technology belongs in the background. The relationship stays at the centre.
            </p>
          </div>
        </div>
      </section>

      <footer id="team" className="bg-[#fffdfa]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-9 text-xs font-semibold text-[#817a70] sm:px-8 lg:px-12">
          <span>Our team</span>
          <a
            href="https://unsplash.com/@agecymru"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#22201c]"
          >
            Photography: Age Cymru / Unsplash
          </a>
        </div>
      </footer>
    </main>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  CloudDownload,
  FileBadge,
  FileCheck2,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Event Management",
    description:
      "Create and manage multiple events from one centralized dashboard. Keep every event organized and accessible.",
    color: "bg-orange-100 text-orange-700",
  },
  {
    icon: FileBadge,
    title: "Certificate Templates",
    description:
      "Upload your certificate designs and customize participant details to generate professional certificates.",
    color: "bg-amber-100 text-amber-700",
  },
  {
    icon: Users,
    title: "Participant Management",
    description:
      "Manage participant records, registration details and categories with an organized workflow.",
    color: "bg-rose-100 text-rose-700",
  },
  {
    icon: CloudDownload,
    title: "Bulk Certificate Generation",
    description:
      "Generate certificates for multiple participants and download individual certificates or bulk files.",
    color: "bg-orange-100 text-orange-700",
  },
  {
    icon: ShieldCheck,
    title: "Public Certificate Portal",
    description:
      "Give participants a dedicated event page where they can securely find and download their certificates.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    icon: BadgeCheck,
    title: "Certificate Verification",
    description:
      "Make certificate verification simple and accessible with a dedicated verification experience.",
    color: "bg-violet-100 text-violet-700",
  },
];

const steps = [
  {
    number: "01",
    title: "Create Your Event",
    description:
      "Set up your event, configure categories and organize all your certificate requirements.",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "Generate Certificates",
    description:
      "Upload participant information, select your certificate design and generate certificates.",
    icon: FileCheck2,
  },
  {
    number: "03",
    title: "Share & Download",
    description:
      "Publish your event page and let participants access their certificates online.",
    icon: CloudDownload,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf6] text-[#241000]">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#f0e1d5] bg-[#fffaf6]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#c2410c] text-white shadow-lg shadow-orange-200">
              <Award size={23} />
            </div>

            <div>
              <p className="text-base font-black tracking-tight text-[#241000] sm:text-lg">
                Certificate<span className="text-[#ea580c]">Studio</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[2px] text-[#a58c7b]">
                Create. Manage. Celebrate.
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm font-semibold text-[#725c4b] transition hover:text-[#ea580c]"
            >
              Features
            </Link>

            <Link
              href="#workflow"
              className="text-sm font-semibold text-[#725c4b] transition hover:text-[#ea580c]"
            >
              How it works
            </Link>

            <Link
              href="/verify"
              className="text-sm font-semibold text-[#725c4b] transition hover:text-[#ea580c]"
            >
              Verify Certificate
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/admin-login"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#241000] px-4 text-xs font-bold text-white shadow-md transition hover:bg-[#51250d] sm:px-5 sm:text-sm"
            >
              Admin Login
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange-200/35 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[450px] w-[450px] rounded-full bg-amber-100/60 blur-[100px]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
          {/* Hero Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#c64c0b] sm:text-xs">
              <Sparkles size={14} />
              Smart Certificate Management
            </div>

            <h1 className="mt-7 max-w-2xl text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[1.02] tracking-[-0.055em] text-[#241000]">
              Create.
              <br />
              Manage.
              <br />
              <span className="bg-gradient-to-r from-[#f97316] via-[#ea580c] to-[#b93808] bg-clip-text text-transparent">
                Celebrate.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-sm leading-7 text-[#806b5b] sm:text-base sm:leading-8">
              A smarter way to manage events and generate professional
              certificates. Organize participants, customize certificate
              templates and deliver achievements with ease.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin-login"
                className="group inline-flex h-13 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#f97316] to-[#d9480f] px-7 text-sm font-extrabold text-white shadow-xl shadow-orange-200/70 transition hover:-translate-y-1 hover:shadow-orange-300/70"
              >
                Get Started
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link
                href="#features"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-[#ead8ca] bg-white/80 px-7 text-sm font-bold text-[#51331f] transition hover:border-orange-300 hover:bg-orange-50"
              >
                Explore Features
                <ChevronRight size={17} />
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#efdfd2] pt-7">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#806b5b]">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Easy certificate generation
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-[#806b5b]">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Centralized event management
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
            <div className="absolute -inset-5 rounded-[40px] bg-gradient-to-br from-orange-200/50 to-amber-100/30 blur-2xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-white bg-white p-3 shadow-[0_35px_90px_-35px_rgba(102,48,14,0.3)] sm:rounded-[34px] sm:p-5">
              {/* Dashboard Header */}
              <div className="flex items-center justify-between border-b border-[#f2e8df] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                    <LayoutDashboard size={19} />
                  </div>

                  <div>
                    <p className="text-xs font-extrabold text-[#321707]">
                      Overview Dashboard
                    </p>
                    <p className="text-[9px] text-[#a58c7b]">
                      Certificate Studio
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">
                  Admin Workspace
                </span>
              </div>

              {/* Dashboard Greeting */}
              <div className="py-5">
                <p className="text-[10px] font-semibold text-[#9a8272]">
                  Welcome back!
                </p>

                <h3 className="mt-1 text-xl font-black tracking-tight text-[#321707] sm:text-2xl">
                  Manage your events.
                </h3>

                <p className="mt-1 text-[10px] text-[#9a8272]">
                  Everything you need, in one place.
                </p>
              </div>

              {/* Dashboard Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                    <CalendarDaysIcon />
                  </div>

                  <p className="mt-4 text-[10px] font-semibold text-[#9a8272]">
                    Event Management
                  </p>
                  <p className="mt-1 text-sm font-black text-[#321707]">
                    Organized
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Users size={18} />
                  </div>

                  <p className="mt-4 text-[10px] font-semibold text-[#9a8272]">
                    Participants
                  </p>
                  <p className="mt-1 text-sm font-black text-[#321707]">
                    Centralized
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <FileBadge size={18} />
                  </div>

                  <p className="mt-4 text-[10px] font-semibold text-[#9a8272]">
                    Certificates
                  </p>
                  <p className="mt-1 text-sm font-black text-[#321707]">
                    Ready to Generate
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <QrCode size={18} />
                  </div>

                  <p className="mt-4 text-[10px] font-semibold text-[#9a8272]">
                    Verification
                  </p>
                  <p className="mt-1 text-sm font-black text-[#321707]">
                    Accessible
                  </p>
                </div>
              </div>

              {/* Certificate Preview */}
              <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#ecd6c4] bg-gradient-to-br from-[#fff9f1] via-white to-[#fff0df] p-4 sm:p-5">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full border-[15px] border-orange-100/70" />

                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[8px] font-extrabold uppercase tracking-[2px] text-[#bd571f]">
                      Certificate Preview
                    </p>
                    <h4 className="mt-2 font-serif text-xl font-bold text-[#51250d] sm:text-2xl">
                      Certificate
                    </h4>
                    <p className="mt-1 text-[9px] text-[#a58c7b]">
                      OF ACHIEVEMENT
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-orange-200 bg-white text-orange-600 shadow-sm">
                    <Award size={23} />
                  </div>
                </div>

                <div className="relative mt-5 border-t border-[#e9d3c0] pt-3">
                  <p className="text-[9px] text-[#a58c7b]">
                    This certificate is proudly presented to
                  </p>
                  <p className="mt-1 font-serif text-lg font-bold text-[#51250d]">
                    Participant Name
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[8px] text-[#a58c7b]">
                      Certificate Management System
                    </span>
                    <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-700">
                      <BadgeCheck size={12} />
                      Verified Design
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Feature Badge */}
              <div className="absolute -right-2 top-[42%] hidden items-center gap-2 rounded-2xl border border-white bg-white px-4 py-3 shadow-xl sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Zap size={19} />
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-[#321707]">
                    Simple workflow
                  </p>
                  <p className="text-[9px] text-[#9a8272]">
                    From event to certificate
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 hidden h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white text-orange-600 shadow-xl sm:flex">
              <Award size={30} />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="relative bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#c64c0b]">
              <Sparkles size={13} />
              Powerful Features
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight text-[#241000] sm:text-4xl lg:text-5xl">
              Everything you need.
              <br />
              <span className="text-[#ea580c]">All in one platform.</span>
            </h2>

            <p className="mt-5 text-sm leading-7 text-[#806b5b] sm:text-base">
              From creating an event to delivering certificates, manage your
              entire certificate workflow with a single platform.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-[#f0e4da] bg-[#fffdfa] p-6 transition duration-300 hover:-translate-y-1.5 hover:border-orange-200 hover:bg-white hover:shadow-[0_20px_50px_-30px_rgba(140,65,18,0.3)]"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.color} transition duration-300 group-hover:scale-110`}
                  >
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-5 text-base font-extrabold text-[#321707]">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-xs leading-6 text-[#8c7768] sm:text-sm">
                    {feature.description}
                  </p>

                  <div className="mt-5 flex items-center gap-1 text-xs font-bold text-[#dc5711] opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100">
                    Explore feature
                    <ArrowRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section
        id="workflow"
        className="relative overflow-hidden bg-[#241000] py-20 text-white sm:py-24"
      >
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-orange-600/15 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-600/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-400/10 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[1.5px] text-orange-200">
              <Zap size={13} />
              Simple Process
            </span>

            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Three steps.
              <span className="text-[#fb923c]"> Endless possibilities.</span>
            </h2>

            <p className="mt-5 text-sm leading-7 text-orange-100/60 sm:text-base">
              A straightforward workflow that helps you manage events and
              deliver certificates without unnecessary complexity.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="relative rounded-2xl border border-orange-100/10 bg-white/[0.045] p-6 transition duration-300 hover:border-orange-300/30 hover:bg-white/[0.075] sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl font-black text-orange-400/60">
                      {step.number}
                    </span>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-400/10 text-orange-300">
                      <Icon size={23} />
                    </div>
                  </div>

                  <h3 className="mt-7 text-lg font-extrabold text-white">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-xs leading-6 text-orange-100/60 sm:text-sm">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Public Portal Section */}
      <section className="bg-[#fff8f1] py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[1.5px] text-[#c64c0b]">
              <ShieldCheck size={14} />
              Participant Experience
            </span>

            <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-[#241000] sm:text-4xl lg:text-5xl">
              Certificates,
              <br />
              <span className="text-[#ea580c]">just a few clicks away.</span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-[#806b5b] sm:text-base">
              Give participants a simple way to access their achievements. Each
              published event can have its own public certificate portal where
              participants can find and download their generated certificates.
            </p>

            <div className="mt-7 space-y-4">
              {[
                "Dedicated public event pages",
                "Email-based certificate lookup",
                "Individual PDF certificate downloads",
                "Easy access on mobile devices",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm font-semibold text-[#614b3a]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={15} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Public Portal Preview */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[35px] bg-orange-200/35 blur-3xl" />

            <div className="relative overflow-hidden rounded-[28px] border border-orange-100 bg-white p-3 shadow-[0_30px_70px_-30px_rgba(102,48,14,0.3)] sm:p-5">
              <div className="rounded-2xl bg-gradient-to-br from-[#321707] to-[#9b3b0c] p-5 text-white sm:p-7">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-orange-100">
                  <Sparkles size={11} />
                  Official Event Portal
                </span>

                <h3 className="mt-5 font-serif text-3xl font-bold sm:text-4xl">
                  Your Event
                </h3>

                <p className="mt-2 text-xs leading-5 text-orange-100/75">
                  Access your certificates through the official event portal.
                </p>

                <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.08] p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-300/15 text-orange-200">
                    <MailIcon />
                  </div>

                  <div>
                    <p className="text-[9px] text-orange-100/60">
                      Registered email
                    </p>
                    <p className="mt-0.5 text-xs font-semibold">
                      participant@example.com
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-xs font-extrabold shadow-lg">
                  <SearchIcon />
                  Find My Certificates
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <FileCheck2 size={18} />
                  </div>

                  <div>
                    <p className="text-[10px] font-extrabold text-[#321707]">
                      Certificate ready
                    </p>
                    <p className="text-[9px] text-[#9a8272]">PDF document</p>
                  </div>
                </div>

                <span className="rounded-lg bg-orange-50 px-3 py-2 text-[9px] font-bold text-orange-700">
                  Download PDF
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-gradient-to-r from-[#b93d0b] via-[#e65b12] to-[#f47b25] px-6 py-12 text-center shadow-2xl shadow-orange-200/50 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full border-[35px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full border-[35px] border-white/10" />

          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white backdrop-blur">
              <Award size={28} />
            </div>

            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              Ready to simplify your certificate management?
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-orange-50/85 sm:text-base">
              Bring your events, participants and certificates together with
              Certificate Studio.
            </p>

            <Link
              href="/admin-login"
              className="group mt-8 inline-flex h-12 items-center justify-center gap-3 rounded-xl bg-white px-7 text-sm font-extrabold text-[#b93d0b] shadow-xl transition hover:-translate-y-1 hover:bg-orange-50"
            >
              Access Admin Dashboard
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#eee0d4] bg-[#fffaf6]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#f97316] to-[#c2410c] text-white">
              <Award size={20} />
            </div>

            <div>
              <p className="text-sm font-black text-[#241000]">
                Certificate<span className="text-[#ea580c]">Studio</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#a58c7b]">
                Create. Manage. Celebrate.
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-[#806b5b]">
            <Link
              href="/admin-login"
              className="transition hover:text-orange-600"
            >
              Admin Login
            </Link>
            <Link href="/verify" className="transition hover:text-orange-600">
              Verify Certificate
            </Link>
            <Link
              href="/certificates"
              className="transition hover:text-orange-600"
            >
              Certificates
            </Link>
          </div>

          <p className="text-[10px] text-[#a58c7b]">
            © {new Date().getFullYear()} Certificate Studio. All rights
            reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

function CalendarDaysIcon() {
  return <Award size={18} />;
}

function MailIcon() {
  return <LockKeyhole size={17} />;
}

function SearchIcon() {
  return <ArrowRight size={15} />;
}

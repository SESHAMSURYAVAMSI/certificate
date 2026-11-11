"use client";

import { type FormEvent, useState } from "react";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Download,
  FileBadge,
  Loader2,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type PublicEvent = {
  name: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  organizer: string;
};

type CertificateResult = {
  id: string;
  certificateId: string;
  fileName: string;
  generatedAt: string;
  categoryId: string;
};

type SearchResult = {
  success: boolean;
  message?: string;
  participantName?: string;
  certificates?: CertificateResult[];
};

export default function PublicEventPage({ event }: { event: PublicEvent }) {
  const [email, setEmail] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [certificates, setCertificates] = useState<CertificateResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  async function handleSearch(eventObject: FormEvent<HTMLFormElement>) {
    eventObject.preventDefault();
    setSearching(true);
    setError("");
    setNotice("");
    setCertificates([]);
    setParticipantName("");

    try {
      const response = await fetch(
        `/api/public/events/${encodeURIComponent(event.slug)}/certificates/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        },
      );

      const result = (await response.json()) as SearchResult;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to find your certificates.");
      }

      setParticipantName(result.participantName || "");
      setCertificates(result.certificates || []);

      if (!result.certificates?.length) {
        setNotice(
          result.message || "No generated certificates are available yet.",
        );
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleDownload(certificate: CertificateResult) {
    setDownloadingId(certificate.id);
    setError("");

    try {
      const response = await fetch(
        `/api/public/events/${encodeURIComponent(event.slug)}/certificates/download`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            generatedCertificateId: certificate.id,
          }),
        },
      );

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        throw new Error(
          result?.message || "Unable to download the certificate.",
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("The certificate PDF is empty.");
      }

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = certificate.fileName || "certificate.pdf";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the certificate.",
      );
    } finally {
      setDownloadingId("");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff8f2] text-[#281306]">
      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#b0784a] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff9b52] to-[#e9570b] shadow-lg shadow-orange-950/30">
              <Award size={22} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight sm:text-base">
                Certificate Studio
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[1.8px] text-orange-200 sm:text-[10px]">
                Public certificate portal
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100 sm:px-3 sm:text-xs">
            <ShieldCheck size={13} />
            Secure portal
          </span>
        </div>
      </header>

      {/* Compact Event Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#321707] via-[#57240b] to-[#9b3b0c] text-white">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#ff9a4b]/20 blur-3xl sm:h-96 sm:w-96" />
        <div className="pointer-events-none absolute -bottom-36 -left-20 h-72 w-72 rounded-full bg-[#f05a16]/25 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-8 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200/25 bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[1.3px] text-orange-100 backdrop-blur sm:text-[10px]">
              <Sparkles size={12} />
              Official event certificate portal
            </span>

            <h1 className="mt-3 text-[clamp(1.8rem,7vw,3.5rem)] font-black leading-[1.08] tracking-tight text-white">
              {event.name}
            </h1>

            {event.description && (
              <p className="mt-2 max-w-2xl text-xs leading-5 text-orange-50/80 sm:mt-3 sm:text-sm sm:leading-6">
                {event.description}
              </p>
            )}
          </div>

          {/* Reduced-height Event Details */}
          <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-white/15 bg-white/[0.09] p-2 shadow-xl shadow-[#1b0b02]/10 backdrop-blur-md sm:mt-5 sm:grid-cols-3 sm:gap-2 sm:p-2.5">
            {/* Event Dates */}
            <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-black/10 px-2.5 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-300/15 text-orange-200">
                <CalendarDays size={16} />
              </span>

              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[1.2px] text-orange-100/65">
                  Event dates
                </p>
                <p className="mt-0.5 text-[11px] font-semibold leading-4 text-white sm:text-xs">
                  {formatDate(event.startDate)} – {formatDate(event.endDate)}
                </p>
              </div>
            </div>

            {/* Venue */}
            <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-black/10 px-2.5 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-300/15 text-orange-200">
                <MapPin size={16} />
              </span>

              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[1.2px] text-orange-100/65">
                  Venue
                </p>
                <p className="mt-0.5 break-words text-[11px] font-semibold leading-4 text-white sm:text-xs">
                  {[event.venue, event.city].filter(Boolean).join(", ") ||
                    "Venue details unavailable"}
                </p>
              </div>
            </div>

            {/* Organizer */}
            <div className="flex min-w-0 items-center gap-2.5 rounded-lg bg-black/10 px-2.5 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-300/15 text-orange-200">
                <Award size={16} />
              </span>

              <div className="min-w-0">
                <p className="text-[8px] font-bold uppercase tracking-[1.2px] text-orange-100/65">
                  Organized by
                </p>
                <p className="mt-0.5 break-words text-[11px] font-semibold leading-4 text-white sm:text-xs">
                  {event.organizer || "Event organizer"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Certificate Access */}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-9 lg:grid-cols-[0.88fr_1.12fr] lg:gap-7 lg:px-8 lg:py-12">
        <div className="min-w-0">
          <div className="mb-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[1.8px] text-[#d94f0b]">
              Certificate access
            </p>

            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-[#281306] sm:text-3xl">
              Your achievement,
              <span className="text-[#e65a12]"> ready to download.</span>
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-6 text-[#806b5d] sm:text-sm">
              Enter the email address you used during registration. We’ll find
              the certificates available for this event.
            </p>
          </div>

          <div className="rounded-2xl border border-[#f2d5c1] bg-white p-4 shadow-[0_12px_35px_-22px_rgba(111,48,12,0.35)] sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#fff0e4] to-[#ffdcc3] text-[#d94f0b]">
                <Mail size={19} />
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-[#321707]">
                  Verify your email
                </h3>
                <p className="text-[11px] text-[#9a8272]">
                  Use your registered email address
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="space-y-3.5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-bold text-[#49372c]"
                >
                  Registered email address
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b18b73]"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-xl border border-[#ead8ca] bg-[#fffaf6] pl-11 pr-3 text-sm text-[#321707] outline-none transition placeholder:text-[#b9a596] focus:border-[#e76522] focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={searching || !email.trim()}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f16a1b] to-[#d84908] px-5 text-sm font-extrabold text-white shadow-lg shadow-orange-200/80 transition hover:-translate-y-0.5 hover:shadow-orange-300/70 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {searching ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Search size={17} />
                )}

                {searching
                  ? "Checking certificates..."
                  : "Find my certificates"}
              </button>
            </form>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/80 p-3 text-[10px] leading-5 text-emerald-900/75 sm:text-[11px]">
              <ShieldCheck
                size={15}
                className="mt-0.5 shrink-0 text-emerald-700"
              />
              Your email is used to verify certificate access and is not
              displayed publicly.
            </div>
          </div>
        </div>

        {/* Certificate Results */}
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-[#f0d9c8] bg-white shadow-[0_12px_35px_-22px_rgba(111,48,12,0.35)] sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#fff0e4] via-[#fff8f2] to-white px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f36e22] to-[#d94b09] text-white shadow-md shadow-orange-200">
                  <Award size={20} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-[#321707]">
                    Your certificates
                  </h3>
                  <p className="mt-0.5 text-[10px] text-[#987d6b] sm:text-xs">
                    Your verified event documents
                  </p>
                </div>
              </div>

              {certificates.length > 0 && (
                <span className="shrink-0 rounded-full bg-[#fce5d5] px-2.5 py-1 text-[10px] font-extrabold text-[#a83b08]">
                  {certificates.length} found
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs leading-5 text-red-700"
                >
                  {error}
                </div>
              )}

              {notice && !error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-800">
                  {notice}
                </div>
              )}

              {certificates.length > 0 ? (
                <div>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      {participantName && (
                        <p className="truncate text-sm font-extrabold text-[#321707]">
                          Hello, {participantName}
                        </p>
                      )}

                      <p className="mt-0.5 text-[11px] text-[#987d6b]">
                        {certificates.length} certificate
                        {certificates.length === 1 ? "" : "s"} available to
                        download
                      </p>
                    </div>

                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 size={12} />
                      Verified
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {certificates.map((certificate) => (
                      <div
                        key={certificate.id}
                        className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#f0e1d6] bg-[#fffdfb] p-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e5] text-[#d94f0b]">
                            <FileBadge size={19} />
                          </div>

                          <div className="min-w-0">
                            <p className="break-all text-xs font-extrabold text-[#321707] sm:text-sm">
                              {certificate.fileName}
                            </p>
                            <p className="mt-1 break-all text-[10px] text-[#9a8272]">
                              Certificate ID: {certificate.certificateId}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleDownload(certificate)}
                          disabled={Boolean(downloadingId)}
                          className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#321707] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#54250d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {downloadingId === certificate.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Download size={15} />
                          )}

                          {downloadingId === certificate.id
                            ? "Preparing..."
                            : "Download PDF"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !error && !notice ? (
                <div className="flex flex-col items-center justify-center py-9 text-center sm:py-12">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff0e5] to-[#ffdfc7] text-[#df5913]">
                    <FileBadge size={26} />
                  </div>

                  <h4 className="mt-4 text-sm font-extrabold text-[#49372c]">
                    Your certificates will appear here
                  </h4>

                  <p className="mt-1.5 max-w-xs text-[11px] leading-5 text-[#9a8272]">
                    Enter your registered email address to check whether your
                    certificates are ready.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-2 border-t border-[#f0dfd2] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-center text-[10px] text-[#9a8272] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-8">
          <span>
            © {new Date().getFullYear()} {event.name}. All rights reserved.
          </span>

          <span className="inline-flex items-center justify-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-600" />
            Powered by Certificate Studio
          </span>
        </div>
      </footer>
    </main>
  );
}

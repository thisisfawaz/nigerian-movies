export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Terms of use</h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          YouFlix is a discovery catalogue that links to publicly available
          Nigerian movie channels on YouTube. It does not host, download, re-upload, or
          extract audio or video content.
        </p>
        <p>
          All movie content belongs to its respective creators. YouFlix is
          not affiliated with or endorsed by YouTube.
        </p>
        <p>
          Listings may be corrected or removed in response to valid requests
          from rights holders or channel owners.
        </p>
      </div>
    </main>
  );
}

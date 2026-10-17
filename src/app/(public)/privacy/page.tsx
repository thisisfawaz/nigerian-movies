export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Privacy policy</h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          YouFlix stores catalogue metadata about publicly available Nigerian
          movie channels on YouTube. It does not collect visitor accounts and does not
          require visitors to log in.
        </p>
        <p>
          Pages may embed YouTube players. When a player loads, YouTube may set
          cookies and process data under its own policies. We do not control
          that processing.
        </p>
        <p>
          If AI categorization is enabled by the administrator, only information
          supplied by the administrator (such as a channel name or description)
          is sent to the AI provider.
        </p>
        <p>
          To raise a concern about a listing, please use the contact details
          published on this site. We will respond to valid requests.
        </p>
      </div>
    </main>
  );
}

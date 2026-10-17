export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold">About YouFlix</h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          YouFlix brings Nigerian movie channels on YouTube together in one
          organized catalogue, making it easier to discover Nollywood and other
          Nigerian cinema.
        </p>
        <p>
          A curator discovers and adds channels; AI may assist with
          categorization. YouFlix does not host, download, or re-upload any
          content. Playback uses YouTube’s supported embedded player, and we
          link back to the original channels.
        </p>
        <p>
          Channels keep 100% of their ad revenue. YouFlix does not take a cut
          of any advertising earned by the channels listed here.
        </p>
        <p>
          YouFlix is not affiliated with or endorsed by YouTube. All movie
          content belongs to its respective creators.
        </p>
      </div>
    </main>
  );
}

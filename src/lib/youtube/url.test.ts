import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildEmbedUrl,
  parseYoutubeUrl,
  slugify,
  uploadsPlaylistFromChannelId
} from "./url";

test("parses a /channel/UC... URL and derives the uploads playlist", () => {
  const parsed = parseYoutubeUrl(
    "https://www.youtube.com/channel/UCBR8-60-B28hp2BmDPdntcQ"
  );
  assert.ok(parsed);
  assert.equal(parsed?.type, "channel");
  assert.equal(parsed?.channelId, "UCBR8-60-B28hp2BmDPdntcQ");
  assert.equal(parsed?.playlistId, "UUBR8-60-B28hp2BmDPdntcQ");
});

test("parses a @handle URL", () => {
  const parsed = parseYoutubeUrl("https://youtube.com/@somepodcast");
  assert.ok(parsed);
  assert.equal(parsed?.type, "channel");
  assert.equal(parsed?.handle, "@somepodcast");
  assert.equal(parsed?.channelId, undefined);
});

test("parses a playlist URL", () => {
  const parsed = parseYoutubeUrl(
    "https://www.youtube.com/playlist?list=PL0123456789abcdef"
  );
  assert.ok(parsed);
  assert.equal(parsed?.type, "playlist");
  assert.equal(parsed?.playlistId, "PL0123456789abcdef");
});

test("parses a watch URL and youtu.be short link", () => {
  const watch = parseYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(watch?.type, "video");
  assert.equal(watch?.videoId, "dQw4w9WgXcQ");

  const short = parseYoutubeUrl("https://youtu.be/dQw4w9WgXcQ");
  assert.equal(short?.videoId, "dQw4w9WgXcQ");
});

test("rejects non-YouTube hosts", () => {
  assert.equal(parseYoutubeUrl("https://evil.example.com/channel/UCBR8-60-B28hp2BmDPdntcQ"), null);
  assert.equal(parseYoutubeUrl("https://notyoutube.com/watch?v=dQw4w9WgXcQ"), null);
});

test("rejects javascript: and data: protocols", () => {
  assert.equal(parseYoutubeUrl("javascript:alert(1)"), null);
  assert.equal(parseYoutubeUrl("data:text/html,<script>alert(1)</script>"), null);
});

test("rejects malformed ids", () => {
  assert.equal(parseYoutubeUrl("https://www.youtube.com/channel/notachannel"), null);
  assert.equal(parseYoutubeUrl("https://www.youtube.com/watch?v=short"), null);
});

test("uploadsPlaylistFromChannelId maps UC->UU only for valid ids", () => {
  assert.equal(
    uploadsPlaylistFromChannelId("UCBR8-60-B28hp2BmDPdntcQ"),
    "UUBR8-60-B28hp2BmDPdntcQ"
  );
  assert.equal(uploadsPlaylistFromChannelId("nope"), null);
});

test("buildEmbedUrl only uses trusted templates", () => {
  assert.equal(
    buildEmbedUrl({ type: "video", videoId: "dQw4w9WgXcQ" }),
    "https://www.youtube.com/embed/dQw4w9WgXcQ"
  );
  assert.equal(
    buildEmbedUrl({ type: "playlist", playlistId: "PL0123456789abcdef" }),
    "https://www.youtube.com/embed/videoseries?list=PL0123456789abcdef"
  );
  assert.equal(
    buildEmbedUrl({ type: "channel", channelId: "UCBR8-60-B28hp2BmDPdntcQ" }),
    "https://www.youtube.com/embed/videoseries?list=UUBR8-60-B28hp2BmDPdntcQ"
  );
  assert.equal(buildEmbedUrl({ type: "channel" }), null);
});

test("slugify produces url-safe slugs", () => {
  assert.equal(slugify("The Diary of a CEO!"), "the-diary-of-a-ceo");
  assert.equal(slugify("  Spaced   Out  "), "spaced-out");
  assert.equal(slugify("Café & Crème"), "cafe-creme");
});

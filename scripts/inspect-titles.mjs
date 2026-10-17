import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (key) => {
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : null;
};
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY") || get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const client = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await client
  .from("channel_videos")
  .select("title, is_short")
  .eq("is_short", false)
  .limit(30);
if (error) { console.error(error.message); process.exit(1); }
for (const v of data) console.log(JSON.stringify(v.title));

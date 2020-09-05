import got from "got/dist/source";
import { env } from "./env";

type LingqCreateLessonRequestBase = {
  title: string;
  text: string;
  status: "private" | "shared";
  collection?: number;
  original_url?: string;
  external_image?: string;
};

type LingqCreateLessonRequestWithAudio = LingqCreateLessonRequestBase & {
  external_audio: string;
  // Needs to be integer, because LingQ API returns 400 for `duration` with fractions.
  duration: number;
};

type LingqCreateLessonRequest =
  | LingqCreateLessonRequestBase
  | LingqCreateLessonRequestWithAudio;

export async function lingq(
  path: "/sv/lessons/",
  postJson: LingqCreateLessonRequest,
) {
  if (path === "/sv/lessons/" && postJson) {
    console.log(`Importing to LingQ: ${postJson.title}`);
  }

  if ("duration" in postJson) {
    postJson.duration = Math.ceil(postJson.duration);
  }

  const { body } = await got(`https://www.lingq.com/api/v2${path}`, {
    headers: { Authorization: `Token ${env.LINGQ_API_KEY}` },
    responseType: "json",
    method: postJson ? "POST" : "GET",
    json: postJson,
  });

  return body;
}

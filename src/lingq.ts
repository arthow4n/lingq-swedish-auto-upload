import got from "got/dist/source";
import { env } from "./env";
import { ImportedUrl } from "./entity/ImportedUrl";

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

export const importToLingq = async (postJson: LingqCreateLessonRequest) => {
  console.log(`Importing to LingQ: ${postJson.title}`);

  if ("duration" in postJson) {
    postJson.duration = Math.ceil(postJson.duration);
  }

  await got(`https://www.lingq.com/api/v2/sv/lessons/`, {
    headers: { Authorization: `Token ${env.LINGQ_API_KEY}` },
    responseType: "json",
    method: postJson ? "POST" : "GET",
    json: postJson,
  });

  await ImportedUrl.add(postJson.original_url);
};

import got from "got/dist/source";
import { env } from "./env";
import { markAsImported, withoutImported } from "./db/importedUrl";

export type LingqCreateLessonRequestLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type LingqCreateLessonRequestBase = {
  title: string;
  text: string;
  collection: number;
  original_url: string;
} & (
  | {
      status: "private";
      external_image?: string;
    }
  | {
      status: "shared";
      level: LingqCreateLessonRequestLevel;
      external_image: string;
    }
);

export type LingqCreateLessonRequestWithAudio = LingqCreateLessonRequestBase & {
  external_audio: string;
  // Needs to be integer, because LingQ API returns 400 for `duration` with fractions.
  duration: number;
};

export type LingqCreateLessonRequest =
  | LingqCreateLessonRequestBase
  | LingqCreateLessonRequestWithAudio;

export const importToLingq = async (payloads: LingqCreateLessonRequest[]) => {
  const unimportedUrls = await withoutImported(
    payloads.map((x) => x.original_url),
  );

  const unimportedPayloads = payloads.filter((x) =>
    unimportedUrls.includes(x.original_url),
  );

  if (!unimportedPayloads.length) {
    console.log("Nothing to import");
    return;
  }

  for (let i = 0; i < unimportedPayloads.length; i++) {
    const payload = unimportedPayloads[i];

    console.log(
      `Importing to LingQ ${i + 1}/${unimportedPayloads.length}: ${
        payload.title
      }`,
    );

    if ("duration" in payload) {
      payload.duration = Math.ceil(payload.duration);
    }

    await got(`https://www.lingq.com/api/v2/sv/lessons/`, {
      headers: { Authorization: `Token ${env.LINGQ_API_KEY}` },
      responseType: "json",
      method: payload ? "POST" : "GET",
      json: payload,
      hooks: {
        beforeError: [
          (error) => {
            console.error(`
===
Error when calling: ${error.request?.requestUrl}
---
${JSON.stringify(error.response?.body, null, 2)}
===
`);
            return error;
          },
        ],
      },
    });
    await markAsImported(payload.original_url);
  }

  console.log("Done importing");
};

import cheerio from "cheerio";
// @ts-ignore
import mp3Duration from "mp3-duration";
import { env } from "../env";
import { importToLingq, LingqCreateLessonRequest } from "../lingq";
import { withoutImported } from "../db/importedUrl";
import { gotEx } from "../httpClient";
import { compact } from "lodash";

/**
 * Searching previous days than just today to catch some failed import caused by unknown reason
 * @returns articleUrlWithDate[]
 */
const createUrlsWithDate = (): string[] => {
  const dates = [-3, -2, -1, 0].map((days) =>
    new Date(Date.now() + 86400000 * days).toISOString().slice(0, 10),
  );
  return dates.map((date) => `https://8sidor.se/kategori/lyssna/?date=${date}`);
};

const articleUrlsToLesson = async (
  articleUrlWithDate: string,
): Promise<LingqCreateLessonRequest | null> => {
  console.log(`Parsing 8 Sidor Lyssna: ${articleUrlWithDate}`);
  const { body } = await gotEx(articleUrlWithDate);
  const $ = cheerio.load(body);

  const audioUrl = $("audio source").attr("src");
  if (
    // Might be empty if there's no content for that day, e.g. weekend or late upload
    !audioUrl
  ) {
    return null;
  }

  const duration = await mp3Duration(await gotEx(audioUrl).buffer());
  const image = $("article img").first().attr("src");
  const title = new URL(articleUrlWithDate).searchParams.get("date") ?? "";
  const text = $(".blog-main article")
    .toArray()
    .map((article) => {
      return $(article)
        .find("h2, p:not(.bottom-links)")
        .toArray()
        .map((textNode) => $(textNode).text().trim())
        .join("\n\n");
    })
    .join("\n\n======\n\n");

  const lesson: LingqCreateLessonRequest = {
    collection: parseInt(env.COURSE_PK_8SLYSS, 10),
    status: "shared",
    level: 2,
    title,
    text,
    original_url: articleUrlWithDate.toString(),
    external_image:
      image ??
      "https://8sidor.se/wp-content/themes/8sidor/images/apple-icon-144x144.png",
    external_audio: audioUrl,
    duration,
  };

  return lesson;
};

export const import8Sidor = async () => {
  const urls = await withoutImported(createUrlsWithDate());

  const lessons: (LingqCreateLessonRequest | null)[] = [];
  for (const articleUrlWithDate of urls) {
    lessons.push(await articleUrlsToLesson(articleUrlWithDate));
  }

  await importToLingq(compact(lessons));
};

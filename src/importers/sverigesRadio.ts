import got from "got/dist/source";
import cheerio from "cheerio";
import { env } from "../env";
import { importToLingq, LingqCreateLessonRequest } from "../lingq";
import { withoutImported } from "../db/importedUrl";

const toLingqLesson = async (
  url: string,
): Promise<LingqCreateLessonRequest> => {
  console.log(`Parsing: ${url}`);
  const { body } = await got(url);
  const $ = cheerio.load(body);

  const title = $("main .audio-heading__title h1").first().text();
  const image = $("main figure img").first().attr("src");
  const audioId = (new URL(url).pathname.match(/\/artikel\/(\d+)/) ?? [])[1];
  if (!audioId) throw new Error();

  const audioMetadataResponse = await got(
    `https://sverigesradio.se/playerajax/audio?id=${audioId}&type=publication&quality=hi`,
  ).json();

  const { audioUrl, duration } = audioMetadataResponse as {
    audioUrl: string;
    duration: number;
  };

  const text = `
${$(".audio-heading__title .heading").text().trim()}

${$(".publication-metadata__item").text().trim()}

${$(".publication-preamble p, .publication-text p:not(.byline)")
  .toArray()
  .map((x) => $(x).text().trim())
  .join("\n\n")}
`;

  const result: LingqCreateLessonRequest = {
    collection: parseInt(env.COURSE_PK_SRLATT, 10),
    status: "private",
    title,
    text,
    original_url: url,
    external_image: image,
    external_audio: audioUrl,
    duration,
  };

  return result;
};

export const importSrEasySwedishArticles = async () => {
  console.log("Checking articles list: Radio Sweden på lätt svenska");
  const { body } = await got(
    "https://sverigesradio.se/radioswedenpalattsvenska",
  );
  const $ = cheerio.load(body);

  const articlePaths = $('div[role="main"] header a')
    .toArray()
    .map((el) => $(el).attr("href") || "")
    // For importing the oldest article first
    .reverse();

  if (articlePaths.some((x) => !x)) {
    throw new Error();
  }

  const articleFullPaths = articlePaths.map(
    (path) => `https://sverigesradio.se${path}`,
  );

  const toImport = await withoutImported(articleFullPaths);
  const lessons = [];

  // To slow down crawling
  for (let i = 0; i < toImport.length; i++) {
    lessons.push(await toLingqLesson(toImport[i]));
  }

  await importToLingq(lessons);
};

import got from "got/dist/source";
import cheerio from "cheerio";
import { env } from "../env";
import { importToLingq, LingqCreateLessonRequest } from "../lingq";
import { withoutImported } from "../db/importedUrl";

const toLingqLesson = async (
  url: string,
  envCoursePk: string,
): Promise<LingqCreateLessonRequest> => {
  if (!url.startsWith("https://sverigesradio.se/artikel/")) {
    throw new Error(`Not an article url: ${url}`);
  }

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

  const ldJson = $('script[type="application/ld+json"]').html();
  if (!ldJson) {
    throw new Error("Missing ld+json");
  }

  const dateTime = (JSON.parse(ldJson) as {
    datePublished: string;
  }).datePublished
    .slice(0, 19)
    .replace("T", " ");

  const text = `
${$(".audio-heading__title .heading").text().trim()}

${dateTime}

${$(".publication-preamble p, .publication-text p:not(.byline)")
  .toArray()
  .map((x) => $(x).text().trim())
  .join("\n\n")}
`;

  const result: LingqCreateLessonRequest = {
    collection: parseInt(envCoursePk, 10),
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

const articleUrlsToLesson = async (urls: string[], envCoursePk: string) => {
  const toImport = await withoutImported(urls);
  const lessons = [];

  // To slow down crawling
  for (let i = 0; i < toImport.length; i++) {
    lessons.push(await toLingqLesson(toImport[i], envCoursePk));
  }

  return lessons;
};

const parseArticleUrls = ($: CheerioStatic, selector: string) => {
  const articlePaths = $(selector)
    .toArray()
    .map((el) => $(el).attr("href") || "")
    // For importing the oldest article first
    .reverse();

  if (articlePaths.some((x) => !x)) {
    throw new Error();
  }

  return articlePaths.map((path) => `https://sverigesradio.se${path}`);
};

export const importSrEasySwedishArticles = async () => {
  console.log("Checking articles list: Radio Sweden på lätt svenska");
  const { body } = await got(
    "https://sverigesradio.se/radioswedenpalattsvenska",
  );
  const $ = cheerio.load(body);

  const articleUrls = parseArticleUrls(
    $,
    'div[role="main"] header a[href^="/artikel"]',
  );

  await importToLingq(
    await articleUrlsToLesson(articleUrls, env.COURSE_PK_SRLATT),
  );
};

export const importSrEkot = async () => {
  console.log("Checking articles list: Sveriges Radio Ekot Textarkiv");
  const { body } = await got("https://sverigesradio.se/ekot/textarkiv");
  const $ = cheerio.load(body);

  const articleUrls = parseArticleUrls(
    $,
    'h2.heading-link a[href^="/artikel"]',
  );
  await importToLingq(
    await articleUrlsToLesson(articleUrls, env.COURSE_PK_SREKOT),
  );
};

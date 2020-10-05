import got from "got/dist/source";
import cheerio from "cheerio";
import { env } from "../env";
import {
  importToLingq,
  LingqCreateLessonRequest,
  LingqCreateLessonRequestBase,
  LingqCreateLessonRequestWithAudio,
  LingqCreateLessonRequestLevel,
} from "../lingq";
import { withoutImported } from "../db/importedUrl";

const toLingqLesson = async (
  url: string,
  envCoursePk: string,
  level: LingqCreateLessonRequestLevel,
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

  const { audioUrl, duration } = await (async () => {
    const metaDataResponse = await got(
      `https://sverigesradio.se/playerajax/audio?id=${audioId}&type=publication&quality=hi`,
      {
        throwHttpErrors: false,
      },
    );

    // Some articles doesn't have audio
    if (metaDataResponse.statusCode === 404) {
      return { audioUrl: undefined, duration: undefined };
    }

    return JSON.parse(metaDataResponse.body) as {
      audioUrl: string;
      duration: number;
    };
  })();

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

  const result: LingqCreateLessonRequestBase = {
    collection: parseInt(envCoursePk, 10),
    status: "shared",
    level: 3,
    title,
    text,
    original_url: url,
    external_image: image,
  };

  const resultWithAudio: LingqCreateLessonRequestWithAudio = {
    ...result,
    external_audio: audioUrl ?? "",
    duration: duration ?? 0,
  };

  return audioUrl && duration ? resultWithAudio : result;
};

const articleUrlsToLesson = async (
  urls: string[],
  envCoursePk: string,
  level: LingqCreateLessonRequestLevel,
) => {
  const toImport = await withoutImported(urls);
  const lessons = [];

  // To slow down crawling
  for (let i = 0; i < toImport.length; i++) {
    lessons.push(await toLingqLesson(toImport[i], envCoursePk, level));
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
    await articleUrlsToLesson(articleUrls, env.COURSE_PK_SRLATT, 2),
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
    await articleUrlsToLesson(articleUrls, env.COURSE_PK_SREKOT, 3),
  );
};

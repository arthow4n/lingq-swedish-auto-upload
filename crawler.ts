import http from "http";
import got from "got";
import cheerio from "cheerio";
import { config as dotenv } from "dotenv";
//@ts-ignore
import mp3Duration from "mp3-duration";

dotenv();

const env = { ...process.env } as {
  LINGQ_API_KEY: string;
  COURSE_PK_SRLATT: string;
  COURSE_PK_8SLYSS: string;
};

type SrNewsEpisode = {
  title: string;
  url: string;
  imageurl: string;
  downloadpodfile: {
    url: string;
    duration: number;
  };
};

type LingqCreateLessonRequest = {
  title: string;
  text: string;
  status: "private" | "shared";
  collection?: number;
  original_url?: string;
  external_image?: string;
  external_audio?: string;
  duration?: number;
};

async function lingq(path: "/sv/lessons/", postJson: LingqCreateLessonRequest) {
  const { body } = await got(`https://www.lingq.com/api/v2${path}`, {
    headers: { Authorization: `Token ${env.LINGQ_API_KEY}` },
    responseType: "json",
    method: postJson ? "POST" : "GET",
    json: postJson,
  });
  return body;
}

const srEasySwedishEpisodes = async () => {
  const res = await got(
    "https://api.sr.se/api/v2/episodes/index?programid=4916&format=json",
  ).json();

  return (res as { episodes: SrNewsEpisode[] })["episodes"] as SrNewsEpisode[];
};

const importSrArticle = async (url: string) => {
  console.log(`Parsing: ${url}`);
  const { body } = await got(url);
  const $ = cheerio.load(body);

  const title = $("main .audio-heading__title h1")
    .first()
    .text();
  const image = $("main figure img")
    .first()
    .attr("src");
  const audioId = new URL(url).searchParams.get("artikel");
  if (!audioId) throw new Error();

  const audioMetadataResponse = await got(
    `https://sverigesradio.se/playerajax/audio?id=${audioId}&type=publication&quality=hi`,
  ).json();

  const { audioUrl, duration } = audioMetadataResponse as {
    audioUrl: string;
    duration: number;
  };

  const text = $(".publication-preamble p, .publication-text p:not(.byline)")
    .toArray()
    .map((x) => $(x).text())
    .join("\n\n");

  const createLessonRequest: LingqCreateLessonRequest = {
    collection: parseInt(env.COURSE_PK_SRLATT),
    status: "private",
    title,
    text,
    original_url: url,
    external_image: image,
    external_audio: audioUrl,
    duration,
  };

  console.log(`Importing to LingQ: ${createLessonRequest.title}`);
  await lingq("/sv/lessons/", createLessonRequest);
};

const importRelatedNews = async (ep: SrNewsEpisode) => {
  const { body } = await got(ep.url);
  const $ = cheerio.load(body);

  const relatedNewsInfoJson = $(
    '[data-vue-component="publication-relations"]',
  ).attr("data-json");

  if (!relatedNewsInfoJson) {
    throw new Error();
  }

  const relatedNewsUrls = (JSON.parse(relatedNewsInfoJson)["items"] as {
    url: string;
  }[]).map((x) => `https://sverigesradio.se/${x.url}`);

  for (const url of relatedNewsUrls) {
    await importSrArticle(url);
  }
};

const import8Sidor = async () => {
  console.log("Parsing 8 Sidor Lyssna");
  const { body } = await got("https://8sidor.se/kategori/lyssna/");
  const $ = cheerio.load(body);

  const audioUrl = $("audio source").attr("src");
  if (!audioUrl) throw new Error();

  // Ceiling is needed because LingQ API returns 400 for `duration` with fractions
  const duration = Math.ceil(await mp3Duration(await got(audioUrl).buffer()));
  const image = $("article img")
    .first()
    .attr("src");

  const title = $(".blog-main article .date")
    .first()
    .text();
  const text = $(".blog-main article")
    .toArray()
    .map((article) => {
      return $(article)
        .find("h2, p:not(.bottom-links)")
        .toArray()
        .map((textNode) => $(textNode).text())
        .join("\n\n");
    })
    .join("\n\n======\n\n");

  const createLessonRequest: LingqCreateLessonRequest = {
    collection: parseInt(env.COURSE_PK_8SLYSS),
    status: "private",
    title,
    text,
    original_url: audioUrl,
    external_image: image,
    external_audio: audioUrl,
    duration,
  };

  console.log(`Importing to LingQ: ${createLessonRequest.title}`);
  await lingq("/sv/lessons/", createLessonRequest);
};

export const crawl = async () => {
  await import8Sidor();
  await importRelatedNews((await srEasySwedishEpisodes())[0]);
};

if (require.main === module) {
  crawl();
}

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

async function lingq(path: "/sv/lessons/", postJson: LingqCreateLessonRequest) {
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

const importSrArticle = async (url: string) => {
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

const importSrEasySwedishArticles = async () => {
  console.log("Checking articles list: Radio Sweden på lätt svenska");
  const { body } = await got(
    "https://sverigesradio.se/radioswedenpalattsvenska",
  );
  const $ = cheerio.load(body);

  const articlePaths = $('div[role="main"] header a')
    .toArray()
    .map((el) => $(el).attr("href") || "");

  if (articlePaths.some((x) => !x)) {
    throw new Error();
  }

  // For importing the oldest article first
  articlePaths.reverse();

  for (let i = 0; i < articlePaths.length; i++) {
    console.log(`Importing: ${i + 1}/${articlePaths.length}`);
    const path = articlePaths[i];
    await importSrArticle(`https://sverigesradio.se${path}`);
  }
};

const import8Sidor = async () => {
  console.log("Parsing 8 Sidor Lyssna");
  const { body } = await got("https://8sidor.se/kategori/lyssna/");
  const $ = cheerio.load(body);

  const audioUrl = $("audio source").attr("src");
  // This is empty during weekend
  if (!audioUrl) {
    console.log("No content today");
    return;
  }

  const duration = await mp3Duration(await got(audioUrl).buffer());
  const image = $("article img").first().attr("src");
  const title = $(".blog-main article .date").first().text().trim();
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
  await importSrEasySwedishArticles();
};

if (require.main === module) {
  crawl();
}

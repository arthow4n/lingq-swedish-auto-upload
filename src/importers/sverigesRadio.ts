import got from "got/dist/source";
import cheerio from "cheerio";
import { lingq } from "../lingq";
import { env } from "../env";

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

  await lingq("/sv/lessons/", {
    collection: parseInt(env.COURSE_PK_SRLATT),
    status: "private",
    title,
    text,
    original_url: url,
    external_image: image,
    external_audio: audioUrl,
    duration,
  });
};

export const importSrEasySwedishArticles = async () => {
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

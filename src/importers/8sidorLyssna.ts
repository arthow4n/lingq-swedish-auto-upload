import got from "got";
import cheerio from "cheerio";
// @ts-ignore
import mp3Duration from "mp3-duration";
import { env } from "../env";
import { importToLingq } from "../lingq";
import { checkIsAlreadyImported } from "../db/importedUrl";

export const import8Sidor = async () => {
  console.log("Parsing 8 Sidor Lyssna");
  const { body } = await got("https://8sidor.se/kategori/lyssna/");
  const $ = cheerio.load(body);

  const audioUrl = $("audio source").attr("src");
  if (
    // This is empty during weekend
    !audioUrl ||
    (await checkIsAlreadyImported(audioUrl))
  ) {
    console.log("No new content today");
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

  await importToLingq([
    {
      collection: parseInt(env.COURSE_PK_8SLYSS, 10),
      status: "shared",
      level: 2,
      title,
      text,
      original_url: audioUrl,
      external_image: image,
      external_audio: audioUrl,
      duration,
    },
  ]);
};

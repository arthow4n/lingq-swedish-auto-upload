import { importSrEasySwedishArticles } from "./importers/sverigesRadio";
import { import8Sidor } from "./importers/8sidorLyssna";
import { dbInit } from "./db";

export const crawl = async () => {
  try {
    await dbInit();
    await import8Sidor();
    await importSrEasySwedishArticles();
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

if (require.main === module) {
  // tslint:disable-next-line
  crawl();
}

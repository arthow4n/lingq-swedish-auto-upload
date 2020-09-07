import { importSrEasySwedishArticles } from "./importers/sverigesRadio";
import { import8Sidor } from "./importers/8sidorLyssna";

export const crawl = async () => {
  try {
    await import8Sidor();
    await importSrEasySwedishArticles();
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

if (require.main === module) {
  crawl().then((success) => process.exit(success ? 0 : 1));
}

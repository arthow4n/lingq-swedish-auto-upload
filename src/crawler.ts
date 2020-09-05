import { importSrEasySwedishArticles } from "./importers/sverigesRadio";
import { import8Sidor } from "./importers/8sidorLyssna";

export const crawl = async () => {
  await import8Sidor();
  await importSrEasySwedishArticles();
};

if (require.main === module) {
  crawl();
}

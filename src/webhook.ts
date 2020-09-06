import http from "http";
import { crawl } from "./crawler";

const port = parseInt(process.env.PORT || "3000", 10);

http
  .createServer(async (req, res) => {
    const shouldRunCrawler = req.url === "/";
    let success = true;

    if (shouldRunCrawler) {
      success = await crawl();
    }

    res.writeHead(success ? 200 : 500, { "Content-Type": "text/html" });
    res.write(
      `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>lingq-swedish-auto-upload</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="https://placehold.co/512x512/000000/FFFFFF/png?text=sAu">
  </head>
  <body>
    <p>${success ? "200 Hopefully it's okay" : "500 Oh shit"}</p>
    <p>shouldRunMain: ${shouldRunCrawler}</p>
  </body>
</html>
`,
    );
    res.end();
  })
  .listen(port);

console.log(`Webhook listening on ${port}`);

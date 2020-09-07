import { PrismaClient } from "@prisma/client";
import { without } from "lodash";

const prisma = new PrismaClient();

export const markAsImported = async (url: string) => {
  const count = await prisma.importedUrls.count();

  // Heroku free plan only offer 10000 rows of storage
  // https://elements.heroku.com/addons/heroku-postgresql
  if (count > 9000) {
    await prisma.importedUrls.deleteMany({
      where: {
        date: {
          lt: new Date(+new Date() - 5184000000),
        },
      },
    });
  }

  await prisma.importedUrls.create({
    data: {
      date: new Date(),
      url,
    },
  });
};

export const withoutImported = async (urls: string[]) => {
  const existing = (
    await prisma.importedUrls.findMany({
      where: {
        url: {
          in: urls,
        },
      },
      select: {
        url: true,
      },
    })
  ).map((x) => x.url);

  const result = without(urls, ...existing);

  return result;
};

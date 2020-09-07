import { PrismaClient } from "@prisma/client";
import { without } from "lodash";

const prisma = new PrismaClient();

export const markAsImported = async (url: string) => {
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

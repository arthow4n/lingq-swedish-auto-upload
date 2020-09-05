import { config as dotenv } from "dotenv";

dotenv();

export const env = { ...process.env } as {
  LINGQ_API_KEY: string;
  COURSE_PK_SRLATT: string;
  COURSE_PK_8SLYSS: string;
};

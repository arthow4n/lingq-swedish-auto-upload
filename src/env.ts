import { config } from "dotenv";

config();

export const env = { ...process.env } as {
  LINGQ_API_KEY: string;
  COURSE_PK_SRLATT: string;
  COURSE_PK_SREKOT: string;
  COURSE_PK_8SLYSS: string;
  DATABASE_URL: string;
};

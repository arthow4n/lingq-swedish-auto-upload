import got from "got/dist/source";

export const gotEx = got.extend({
  hooks: {
    beforeError: [
      (error) => {
        console.error(`
===
Error when calling: ${error.request?.requestUrl}
---
${JSON.stringify(error.response?.body, null, 2)}
===
`);
        return error;
      },
    ],
  },
});

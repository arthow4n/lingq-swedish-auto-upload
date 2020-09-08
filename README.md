# lingq-swedish-auto-upload

Imports some Swedish resources with audio to the [LingQ](https://www.lingq.com/en/) course you specified.

## Deploying to Heroku

```
# Run heroku config:set for each env value mentioned in `.env.example`

heroku login
heroku create
heroku addons:create heroku-postgresql:hobby-dev
git push heroku master
heroku run npm run migrate
```

You can run `npm run crawl` with [Heroku Scheduler](https://devcenter.heroku.com/articles/scheduler).

## Developing

- Don't forget that you can actually run against the database on heroku
  - https://www.prisma.io/docs/guides/deployment/deploying-to-heroku

## `ts-node` in production!?

Yeah, I'm just too lazy to setup all the hassle for a hobby web hook.

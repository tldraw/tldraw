# Project overview

This project is a Next.js application which contains the **tldraw free** as well as the **tldraw pro** applications. We are currently using the Next.js 13 option of having both `pages` (tldraw free) and `app` (tldraw pro) directory inside the same app. We did this since the free offering is the continuation of a Next.js version 12 app and it allowed us to combine it with the new App router option from Next.js 13 for tldraw pro without having to do a full migration to App router.

We also split the supabase into two projects:

- `tldraw-v2` for tldraw free where we mainly store the snapshots data
- `tldraw-pro` for tldraw pro which holds all the relational data that the pro version requires

On top of that we also use R2 for storing the documents data.

# How to run the project

## Tldraw pro

The development of tldraw pro happens against a local supabase instance. To set that up, you'll
first need to [install & start docker](https://www.docker.com/products/docker-desktop/).

Once docker is started & you've run `yarn` to install tldraw's dependencies, the rest should be
handled automatically. Running `yarn dev-app` will:

1. Start a local instance of supabase
2. Run any database migrations
3. Update your .env.local file with credentials for your local supabase instance
4. Start tldraw

The [supabase local development docs](https://supabase.com/docs/guides/cli/local-development) are a
good reference. When working on tldraw, the `supabase` command is available by running `yarn
supabase` in the `apps/app` directory e.g. `yarn supabase status`.

When you're finished, we don't stop supabase because it takes a while each time we start and stop
it. Run `yarn supabase stop` to stop it manually.

If you write any new database migrations, you can apply those with `yarn supabase migration up`.

## Some helpers

1. You can see your db schema at the `Studio URL` printed out in the step 2.
2. If you ever need to reset your local supabase instance you can run `supabase db reset` in the root of `apps/app` project.
3. The production version of Supabase sends out emails for certain events (email confirmation link, password reset link, etc). In local development you can find these emails at the `Inbucket URL` printed out in the step 2.

## Tldraw free

The development of tldraw free happens against the production supabase instance. We only store snapshots data to one of the three tables, depending on the environment. The tables are:

- `snapshots` - for production
- `snapshots_staging` - for staging
- `snapshots_dev` - for development

For local development you need to add the following env variables to `.env.local`:

- `SUPABASE_URL` - use the production supabase url
- `SUPABASE_KEY` - use the production supabase anon key

Once you have the environment variables set up you can run `yarn dev-app` from the root folder of our repo to start developing.

## Running database tests

You need to have a psql client [installed](https://www.timescale.com/blog/how-to-install-psql-on-mac-ubuntu-debian-windows/). You can then run `yarn test-supabase` to run [db tests](https://supabase.com/docs/guides/database/extensions/pgtap).

## Sending emails

We are using [Resend](https://resend.com/) for sending emails. It allows us to write emails as React components. Emails live in a separate app `apps/tl-emails`.

Right now we are only using Resend via Supabase, but in the future we will probably also include Resend in our application and send emails directly.

The development workflow is as follows:

### 1. Creating / updating an email template

To start the development server for email run `yarn dev-email` from the root folder of our repo. You can then open [http://localhost:3333](http://localhost:3333) to see the result. This allows for quick local development of email templates.

Any images you want to use in the email should be uploaded to supabase to the `email` bucket.

Supabase provides some custom params (like the magic link url) that we can insert into our email, [check their website](https://supabase.com/dashboard/project/faafybhoymfftncjttyq/auth/templates) for more info.

### 2. Generating the `html` version of the email

Once you are happy with the email template you can run `yarn build-email` from the root folder of our repo. This will generate the `html` version of the email and place it in `apps/tl-emails/out` folder.

### 3. Updating the template in Supabase

Once you have the `html` version of the email you can copy it into the Supabase template editor. You can find the templates [here](https://supabase.com/dashboard/project/faafybhoymfftncjttyq/auth/templates).

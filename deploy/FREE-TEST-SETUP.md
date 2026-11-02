# Free online test (₹0): Vercel + Neon

For **testing and demos only**. Vercel's free plan is not allowed for business use, so move to the
server setup in [SERVER-SETUP.md](SERVER-SETUP.md) when the restaurant starts using it for real.

You get a link like `https://restro-app-xxxx.vercel.app` that works on any phone (Wi-Fi or 4G).
No credit card is needed for either service.

## 1. Database: Neon (5 minutes)

1. Go to **neon.tech** → *Sign up* → *Continue with GitHub*.
2. Create a project: name `dfc`, Postgres version 16, region **AWS Asia Pacific (Singapore)** (closest to India).
3. On the project dashboard click **Connect**.
   - With **Connection pooling ON**, copy the connection string → this is `DATABASE_URL`.
     Add `&pgbouncer=true&connect_timeout=15` to the end of it.
   - With **Connection pooling OFF**, copy the connection string → this is `DIRECT_URL`.

They look like:
```
DATABASE_URL = postgresql://user:password@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15
DIRECT_URL   = postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

## 2. A secret for logins

Any long random text works. On Windows, paste this in PowerShell and copy the result:
```
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | ForEach-Object {[char]$_})
```
This is `SESSION_SECRET`.

## 3. App: Vercel (5 minutes)

1. Go to **vercel.com** → *Sign up* → *Hobby* → *Continue with GitHub*.
2. *Add New…* → *Project* → **Import** `restro-app`.
   (If it's not listed: *Adjust GitHub App Permissions* and allow the repository.)
3. Leave the build settings as they are (Next.js is detected). Open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | pooled Neon string from step 1 |
   | `DIRECT_URL` | direct Neon string from step 1 |
   | `SESSION_SECRET` | the secret from step 2 |

4. Click **Deploy**. The first build takes about 3 minutes. It also creates the tables and the dummy data
   (outlets, 12 tables, menu with recipes, stock, test logins).
5. Click **Visit**. The website is at `/`, the staff app at `/staff`.

Every `git push` to `main` updates the test site automatically. Data is kept between updates.

## 4. Right after the first deploy: change the PINs

The repository is public and the test PINs (1234, 1111, …) are written in the README, so anyone who finds the link
could log in. Log in as **Owner** (PIN 1234) → **Manage → Staff** → give every login a new PIN, Owner first.

**Forgot the owner PIN later?** On your laptop (project folder), put the Neon **direct** connection string as `DATABASE_URL`
in `.env` for a moment, run `npm run set-pin -- "Owner" 5678`, then put your local value back.

## Good to know

- The first visit after a quiet period can take a few seconds: the free database sleeps when nobody uses it.
- The free plans have monthly limits. A few phones testing for a few hours a day stay well inside them.
  Free plans never charge: if a limit is reached, the site pauses until the next month.
- Table QR codes printed from the test site point to the test address. Print the real ones only after going live.
- To start the test data again from zero: in Neon, *Branches → Reset* (or delete and recreate the project),
  then in Vercel *Deployments → … → Redeploy*.

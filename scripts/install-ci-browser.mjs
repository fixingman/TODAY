// Use the immutable Chrome build supported by the locked Puppeteer dependency.
import { install, Browser } from '@puppeteer/browsers';
import { PUPPETEER_REVISIONS } from 'puppeteer-core';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
const browser = await install({browser:Browser.CHROME,buildId:PUPPETEER_REVISIONS.chrome,
  cacheDir:resolve('.context/ci-browser')});
if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV,`CHROME_PATH=${browser.executablePath}\n`);
console.log(browser.executablePath);

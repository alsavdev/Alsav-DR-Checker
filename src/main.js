const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");
const userAgents = require("user-agents");
puppeteer.use(stealthPlugin());

async function delay(seconds) {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

let stops = false;

const proccess = async (log, proggress, logToTable, data) => {
  const { puppeteerRealBrowser } = await import("puppeteer-real-browser");
  const { page, browser } = await puppeteerRealBrowser({
    headless: false,
  });

  await page.setUserAgent(new userAgents().random().toString());

  try {
    await page.goto("https://ahrefs.com/website-authority-checker", {
      waitUntil: ["domcontentloaded", "networkidle2"],
      timeout: 120000,
    });

    const files = fs.readFileSync(data.files, "utf-8");
    const lines = files.split("\n").filter((line) => line !== "");
    for (let i = 0; i < lines.length; i++) {
      if (stops) {
        log("[INFO] STOP PROCCESS");
        break;
      }

      await core(page, lines[i], log, logToTable);

      const countProgress = parseInt(((i + 1) / lines.length) * 100);
      proggress(countProgress);

      if (stops) {
        log("[INFO] STOP PROCCESS");
        break;
      }
    }

    await browser.close();
  } catch (error) {
    console.error(error);
  }
};

const core = async (page, url, log, logToTable) => {
  try {
    const input = await page.waitForSelector(
      'input[placeholder="Enter domain"]',
      {
        waitUntil: ["networkidle2", "domcontentloaded"],
        timeout: 120000,
      }
    );
    await input.type(url);

    const submit = await page.$$('button[type="submit"]');
    await submit[1].click();
    await delay(5)

    var stat = await checkStat({
      page: page,
    });
    while (stat.code !== 0) {
      await sleep(500);
      stat = await checkStat({
        page: page,
      });
    }
    
    let elDomain;

    try {
      elDomain = await page.waitForSelector(
        "body > div.ReactModalPortal > div > div > div.css-1ksodfu-modalWrapper.css-qf13ee-modalWrapperWithFooter > div > div.css-15bix8f-statsSection > div.css-9vtym0-domainRatingDonut > div > div:nth-child(2) > div > div.css-xj5st1 > div > div > div > span",
        {
          waitUntil: ["networkidle2", "domcontentloaded"],
          timeout: 10000,
        }
      );
    } catch (error) {
      await input.evaluate((e) => (e.value = ""))
      await core(page,url,log,logToTable)
    }

    const elBacklink = await page.waitForSelector(
      "body > div.ReactModalPortal > div > div > div.css-1ksodfu-modalWrapper.css-qf13ee-modalWrapperWithFooter > div > div.css-15bix8f-statsSection > div.css-aa83t0-linkingWebsites > div > div > div.css-1gq2z3w > div > div > div > span",
      {
        waitUntil: ["networkidle2", "domcontentloaded"],
        timeout: 120000,
      }
    );
    const elLink = await page.waitForSelector(
      "body > div.ReactModalPortal > div > div > div.css-1ksodfu-modalWrapper.css-qf13ee-modalWrapperWithFooter > div > div.css-15bix8f-statsSection > div.css-aa83t0-linkingWebsites > div > div > div.css-1gq2z3w > div > div > div > span",
      {
        waitUntil: ["networkidle2", "domcontentloaded"],
        timeout: 120000,
      }
    );

    log(`[INFO] GET DATA OF URL : ${url}`);

    const data = {
      domainRating: await page.evaluate((e) => e.innerText, elDomain),
      backLink: await page.evaluate((e) => e.innerText, elBacklink),
      link: await page.evaluate((e) => e.innerText, elLink),
    };

    logToTable(url, data);

    const close = await page.$$("button");
    await close[close.length - 1].click();

    await input.evaluate((e) => (e.value = ""));
    await delay(3);
  } catch (error) {
    throw error;
  }
};

const sleep = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
};

const checkStat = ({ page }) => {
  return new Promise(async (resolve, reject) => {
    var st = setTimeout(() => {
      resolve({
        code: 1,
      });
    }, 2000);
    try {
      var checkStat = await page.evaluate(() => {
        var stat = -1;
        if (document.querySelector("html")) {
          var html = document.querySelector("html").innerHTML;
          html = String(html).toLowerCase();
          if (html.indexOf("challenges.cloudflare.com/turnstile") > -1) {
            stat = 1;
          }
        } else {
          stat = 2;
        }

        return stat;
      });

      if (checkStat !== -1) {
        try {
          var frame = page.frames()[0];
          await page.click("iframe");
          frame = frame.childFrames()[0];
          if (frame) {
            await frame.hover('[type="checkbox"]').catch((err) => {});
            await frame.click('[type="checkbox"]').catch((err) => {});
          }
        } catch (err) {}
      }

      var checkCloudflare = await page.evaluate(() => {
        return document?.querySelector("html")?.innerHTML;
      });
      const checkIsBypassed = !String(checkCloudflare)?.includes(
        "<title>Just a moment...</title>"
      );

      if (checkIsBypassed) {
        clearInterval(st);
        resolve({
          code: 0,
        });
      }
    } catch (err) {
      clearInterval(st);
      resolve({
        code: 1,
      });
    }
  });
};

const stopProccess = () => (stops = true);

module.exports = {
  proccess,
  stopProccess,
};

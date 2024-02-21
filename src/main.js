const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const stealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(stealthPlugin());

async function delay(seconds) {
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

let stops = false
let stopFlag = false;

const proccess = async (log, proggress, logToTable, data) => {
  const { puppeteerRealBrowser } = await import("puppeteer-real-browser");
  const { page, browser } = await puppeteerRealBrowser({
    headless: false,
  });

  try {
    await page.goto("https://ahrefs.com/website-authority-checker", {
      waitUntil: ["domcontentloaded", "networkidle2"],
      timeout: 120000,
    });

    const files = fs.readFileSync(data.files, 'utf-8')
    const lines = files.split('\n').filter(line => line !== "")
    for (let i = 0; i < lines.length; i++) {
      if (stops) {
        log('[INFO] STOP PROCCESS')
        break;
      }

      await core(page, lines[i], log, logToTable)

      const countProgress = parseInt(((i + 1) / lines.length) * 100);
      proggress(countProgress);

      if (stops) {
        log('[INFO] STOP PROCCESS')
        break;
      }
    }
    
    await browser.close()
  } catch (error) {
    console.error(error);
  }
};

const core = async (page, url, log, logToTable) => {
  try {
    const input = await page.waitForSelector(
      'input[placeholder="Enter domain"]', {
        waitUntil: ['networkidle2', 'domcontentloaded'],
        timeout: 120000
      }
    );
    await input.type(url);

    const submit = await page.$$('button[type="submit"]');
    await submit[1].click();
    await delay(3)

    // const iframe = await page.$('iframe[title="Widget containing a Cloudflare security challenge"]')
    // if (iframe) {
    //     const frame = await iframe.contentFrame()
    //     if (frame) {
    //         const body = await frame.$('body')
    //         if (body) {
    //             const cloudFlare = await body.$('input[type="checkbox"]')
    //             if (cloudFlare) {
    //               console.log('nemu');
    //                 await cloudFlare.click()
    //             }
    //         }   
    //     }
    // }

    console.log('lewat');
    const elDomain = await page.waitForSelector('body > div.ReactModalPortal > div > div > div.css-1ksodfu-modalWrapper.css-qf13ee-modalWrapperWithFooter > div > div.css-15bix8f-statsSection > div.css-9vtym0-domainRatingDonut > div > div:nth-child(2) > div > div.css-xj5st1 > div > div > div > span', {
      waitUntil: ['networkidle2', 'domcontentloaded'],
      timeout: 120000
    })
    const elBacklink = await page.waitForSelector('body > div.ReactModalPortal > div > div > div.css-1ksodfu-modalWrapper.css-qf13ee-modalWrapperWithFooter > div > div.css-15bix8f-statsSection > div.css-aa83t0-linkingWebsites > div > div > div.css-1gq2z3w > div > div > div > span', {
      waitUntil: ['networkidle2', 'domcontentloaded'],
      timeout: 120000
    })
    const elLink = await page.waitForSelector('body > div.ReactModalPortal > div > div > div.css-1ksodfu-modalWrapper.css-qf13ee-modalWrapperWithFooter > div > div.css-15bix8f-statsSection > div.css-aa83t0-linkingWebsites > div > div > div.css-1gq2z3w > div > div > div > span', {
      waitUntil: ['networkidle2', 'domcontentloaded'],
      timeout: 120000
    })
    
    log(`[INFO] GET DATA OF URL : ${url}`)
    
    const data = {
      domainRating: await page.evaluate(e => e.innerText, elDomain),
      backLink: await page.evaluate(e => e.innerText, elBacklink),
      link: await page.evaluate(e => e.innerText, elLink)
    }

    logToTable(url, data);

    const close = await page.$$('button')
    await close[close.length - 1].click()

    await input.evaluate(e => e.value = "")
    await delay(3)
  } catch (error) {
    throw error;
  }
}


const stopProccess = () => stops = true;

module.exports = {
  proccess,
  stopProccess
}


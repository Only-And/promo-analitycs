const puppeteer = require('puppeteer-core')
const chrome =  require('chrome-aws-lambda');

export default async function (request, response) {

    const isDev = !process.env.AWS_REGION

    const preparePageForTests = async (page) => {
        const userAgent = 'Mozilla/5.0 (X11; Linux x86_64)' +           
          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36';
        await page.setUserAgent(userAgent);
      }   

    async function getOptions() {
        const chromeExecPaths = {
            win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            linux: '/usr/bin/google-chrome',
            darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          }
          
         const exePath = chromeExecPaths[process.platform]
        let options = {}
        if(isDev) {
            options = {
                headless: true,
                args: [
                    '--disable-web-security'
                ],
                executablePath: exePath
            }
        } else {
            options = {
                args: chrome.args,
                ignoreDefaultArgs: ['--disable-extensions'],
                executablePath: await chrome.executablePath,
                headless: chrome.headless
              }
        }

        return options
    }
    const options = await getOptions()
    const browser = await chrome.puppeteer.launch(options)

    const page = await browser.newPage();
    await preparePageForTests(page);
    const formatedPrices = []
    const productDesc = []



    await page.goto('https://www.drogasil.com.br/search?w='+ request.query.produto + '&p=' + request.query.p)
    await page.waitForTimeout(3000)

    const verifyPage = await page.$$eval('h1', Page => Page.map(pg => pg.innerText))
    if (verifyPage[0] !== undefined && verifyPage[0] !== null) {
        return response.json({
            name: 'Nenhum produto foi encontrado',
            price: 'Indefinido'
        })
    }
    await page.waitForSelector('span.price-number')

    const names = await page.$$eval('div.rd-col-8 > div > h2.product-card-name', names => names.map(name => name.innerText));
    names.forEach((item) => {
        productDesc.push(item)
    })
    let priceBox = await page.$$eval('.price-box', priceBoxes => priceBoxes.map(pB => pB.innerText))

    for(let i=0; i < priceBox.length; i++){
        if(priceBox[i].split('\n')[1] === undefined) {
            if(priceBox[i] === "") {
                formatedPrices.push('Sem pre??o / Fora de estoque')
            } else {
                formatedPrices.push(priceBox[i])
            }

        } else {
            formatedPrices.push(priceBox[i].split('\n')[1])
        }
    }

    const dados = {
        name: productDesc,
        price: formatedPrices
    }

    browser.close()

    response.setHeader('Cache-Control', 's-max-age=86400', 'stale-while-revalidate=86400')

    response.send(dados)
}

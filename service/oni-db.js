const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'https://oni-db.com/';

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      // devtools: true,
      args: [
        '--proxy-server=http://127.0.0.1:1080'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    })
    const page = await browser.newPage()
    await page.goto(BASE_URL)
    await page.waitForSelector('.jss197')
    const btnsHandler = await page.$$('button.jss190')
    const menus = []
    for (const handler of btnsHandler) {
      await handler.click()
      const title = await handler.$eval('.jss196', node => node.textContent)
      console.log(title)
      const items = await page.$$eval('.EntrySection .EntryCard .EntryActionArea', els => {
        function getKey (link) {
          return link.split('/').slice(-1)[0]
        }
        return els.map(el => {
          const key = getKey(el.href)
          const image = el.querySelector('.ImageElem').src
          const title = el.querySelector('.jss365').textContent
          return { key, image, title }
        })
      })
      menus.push({
        title,
        items
      })
    }
    const fileMenuPath = path.join(__dirname, '../db/menus.json')
    fs.writeFileSync(fileMenuPath, JSON.stringify({ menus }, null, 2))

    let items = {}
    const keys = menus.reduce((pre, menu) => pre.concat(menu.items.map(({ key }) => key)), [])
    const getInfo = async selector => {
      return await page.$$eval(selector, els => {
        return els.map(el => {
          const image = el.querySelector('th img').src
          const label = el.querySelector('th').textContent
          const value = el.querySelector('td').textContent
          return { image, label, value }
        })
      })
    }
    for (const key of keys) {
      const link = `${BASE_URL}details/${key}`
      await page.goto(link)
      await page.waitForSelector('.jss31')
      const shortInfo = await page.$$eval('.jss31', els => els.map(el => el.textContent))
      const tags = await page.$$eval('.jss1032', els => els.map(el => el.textContent))
      const baseInfo = getInfo('.jss1147 .jss1122')
      const additionalInfo = getInfo('.jss1120 .jss1122')
      const mainClasses = await page.$$eval('.jss977', els => {
        function getContentItem (ele) {
          if (ele.nodeName === 'DIV') {
            const link = c.querySelector('.EntryActionArea').href
            const value = link.split('/').slice(-1)[0]
            return { type: 'item', value }
          }
          return { type: 'separator' }
        }
        els.map(el => {
          const mainTitle = el.querySelector('.jss978').textContent
          let subEls = el.querySelectorAll('.jss979')
          let subClasses = []
          let content = []
          if (subEls && subEls.length) {
            subEls = Array.from(subEls)
            const siblings = Array.from(el.children)
            const subIndex = subEls.map(subEl => siblings.indexOf(subEl)).concat(siblings.length)
            let t = -1
            for (let index = 0; index < siblings.length; index++) {
              const ele = siblings[index]
              if (subIndex.includes(index)) {
                t += 1
                subClasses[t] = {
                  title: ele.textContent,
                  content: []
                }
              }
              if (t >= 0 && index > subIndex[t] && index < subIndex[t + 1]) {
                if (ele.className === 'jss1073') {
                  const content = Array.from(ele.children).map(getContentItem)
                  subClasses[t].content.push(content)
                }
              }
            }
          } else {
            content = Array.from(el.querySelector('.jss1161')).map(getContentItem)
          }
          return {
            mainTitle,
            content,
            subClasses
          }
        })
      })
      items[key] = {
        shortInfo,
        tags,
        baseInfo,
        additionalInfo,
        mainClasses
      }
      console.log(key)
    }
    const fileItemsPath = path.join(__dirname, '../db/items.json')
    fs.writeFileSync(fileItemsPath, JSON.stringify({ items }, null, 2))
  } catch (error) {
    console.log(error)
  }
  await browser.close()
})()
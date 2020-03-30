const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'https://oni-db.com/';

(async () => {
  const browser = await puppeteer.launch({
    // headless: false,
    // devtools: true,
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  })
  try {
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
    for (const key of [keys[0]]) {
      const link = `${BASE_URL}details/${key}`
      await page.goto(link)
      await page.waitForSelector('.jss389')
      const wrapper = '#root main+div hr+div>div'
      const shortInfo = await page.$$eval(`${wrapper} p`, els => els.map(el => el.textContent))
      const tags = await page.$$eval(`${wrapper} p`, els => els.map(el => el.textContent))
      const baseInfo = await getInfo('.jss396>.jss428 table tr.jss430')
      const additionalInfo = await getInfo('.jss396>.jss455 table tr.jss430')
      const mainClasses = await page.$$eval('.jss367', els => {
        function getContentItem (ele) {
          if (ele.nodeName === 'DIV') {
            const link = ele.querySelector('.EntryActionArea').href
            const value = link.split('/').slice(-1)[0]
            return { type: 'item', value }
          }
          return { type: 'separator' }
        }
        return els.map(el => {
          const mainTitle = el.querySelector('.jss470').textContent
          let subEls = el.querySelectorAll('.jss471')
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
              if (t >= 0 && ele.className === 'jss482' && index > subIndex[t] && index < subIndex[t + 1]) {
                const content = Array.from(ele.children).map(getContentItem)
                subClasses[t].content.push(content)
              }
            }
          } else {
            content = Array.from(el.querySelectorAll('.jss472,.jss482')).map(getContentItem)
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
  // await browser.close()
})()
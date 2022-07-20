module.exports = (app, utils) => {
  const config = require('../config')
  const path = require('path')

  app.all('*', (req, res, next) => {
    let themeOverride = req.query.theme
    if(themeOverride) {
      themeOverride = themeOverride.toLowerCase()
      req.cookies.theme = themeOverride
      res.cookie('theme', themeOverride, { maxAge: 31536000, httpOnly: true })
    } else if(!req.cookies.theme && req.cookies.theme !== '') {
      req.cookies.theme = config.theme
    }

    let langOverride = req.query.default_lang
    if(langOverride) {
      langOverride = langOverride.toLowerCase()
      req.cookies.default_lang = langOverride
      res.cookie('default_lang', langOverride, { maxAge: 31536000, httpOnly: true })
    } else if(!req.cookies.default_lang) {
      req.cookies.default_lang = config.default_lang
    }

    return next()
  })

  app.get('*', async (req, res, next) => {
    if(req.url.startsWith('/w/load.php')) {
      return res.sendStatus(404)
    }

    if(req.url.startsWith('/media')) {
      let media
      let mime = ''

      if(req.url.startsWith('/media/maps_wikimedia_org/')) {
        media = await proxyMedia(req, 'maps.wikimedia.org')
      } else if(req.url.startsWith('/media/api/rest_v1/media')) {
        media = await proxyMedia(req, 'wikimedia.org/api/rest_v1/media')
        if(req.url.includes('render/svg/')) {
          mime = 'image/svg+xml'
        }
      } else {
        media = await proxyMedia(req)
      }

      if(media.success === true) {
        if(mime != '') {
          res.setHeader('Content-Type', mime)
        }

        return res.sendFile(media.path)
      }
      return res.sendStatus(404)
    }

    if(req.url.startsWith('/static/images/project-logos/') || req.url === '/static/images/mobile/copyright/wikipedia.png') {
      return res.sendFile(wikilessLogo())
    }

    if(req.url.startsWith('/static/favicon/wikipedia.ico')) {
      return res.sendFile(wikilessFavicon())
    }

    // custom wikipedia logos for different languages
    if(req.url.startsWith('/static/images/mobile/copyright/')) { 
      if(customLogos(req.url)) {
        return res.sendFile(custom_logo)
      }
    }

    return next()
  })

  app.get('/wiki/:page?/:sub_page?', (req, res, next) => {
    return handleWikiPage(req, res, '/wiki/')
  })

  // This route handles wiki-pages starting with forward slash (issue #21))
  app.get('/wiki//:page?/:sub_page?', (req, res, next) => {
    const page = req.params.page
    if(page) {
      // issue #25
      req.params.page = `/${req.params.page}`
    }
    return handleWikiPage(req, res, '/wiki/')
  })

  app.get('/w/:file', (req, res, next) => {
    return handleWikiPage(req, res, '/w/')
  })

  app.get('/wiki/Special:Map/*', (req, res, next) => {
    return handleWikiPage(req, res, '/wiki/Map')
  })

  app.get('/api/rest_v1/page/pdf/:page', async (req, res, next) => {
    if(!req.params.page) {
      return res.redirect('/')
    }

    const media = await proxyMedia(req, '/api/rest_v1/page/pdf')

    if(media.success === true) {
      let filename = `${req.params.page}.pdf`
      return res.download(media.path, filename)
    }
    return res.sendStatus(404)
  })

  // handle chinese variants
  app.get('/zh*', (req, res, next) => {
    const pathSplit = req.path.split('/')
    const lang = pathSplit[1]
    const page = pathSplit[2]
    return res.redirect(`/wiki/${page}?lang=${lang}`)
  })

  app.get('/', (req, res, next) => {
    return handleWikiPage(req, res, '/')
  })

  app.get('/about', (req, res, next) => {
    return res.sendFile(path.join(__dirname, '../static/about.html'))
  })

  app.get('/preferences', (req, res, next) => {
    return res.send(preferencesPage(req, res))
  })

  app.post('/preferences', (req, res, next) => {
    const theme = req.body.theme
    const default_lang = req.body.default_lang
    let back = req.url.split('?back=')[1]

    res.cookie('theme', theme, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    res.cookie('default_lang', default_lang, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })

    if(back === 'undefined' || !back.startsWith('/')) {
      back = '/'
    }

    return res.redirect(back)
  })

  app.post(/DownloadAsPdf/, (req, res, next) => {
    if(!req.body.page) {
      return res.redirect('/')
    }

    const lang = req.body.lang || req.cookies.default_lang || config.default_lang

    return res.redirect(`/w/index.php?title=Special%3ADownloadAsPdf&page=${req.body.page}&action=redirect-to-electron&lang=${lang}`)
  })
}

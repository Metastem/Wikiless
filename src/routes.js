module.exports = (app, utils) => {
  const config = require('../config')
  const path = require('path')
  const { URL } = require('url')
  const rateLimit = require('express-rate-limit')
  const crypto = require('crypto')

  // Rate limiter for PDF download route: max 100 requests per 15 minutes per IP
  const pdfRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 60 minutes
    max: 20, // limit each IP to 100 requests per windowMs
  });

  // Rate limiter for general GET route: max 100 requests per 15 minutes per IP
  const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 400, // limit each IP to 400 requests per windowMs
  });

  app.all(/.*/, (req, res, next) => {
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

  function md5HashParts(fileName) {
    const normalized = fileName.replace(/ /g, '_');
    const h = crypto.createHash('md5').update(normalized, 'utf8').digest('hex');
    return [h[0], h.slice(0,2)];
  }

  app.get(/.*/, generalRateLimiter, async (req, res, next) => {
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

    if(req.url.startsWith('/static/images/project-logos/') || req.url === '/static/images/mobile/copyright/wikipedia.png' || req.url === '/static/apple-touch/wikipedia.png') {
      return res.sendFile(wikilessLogo())
    }

    if(req.url.startsWith('/static/favicon/wikipedia.ico')) {
      return res.sendFile(wikilessFavicon())
    }

    // custom wikipedia logos for different languages
    if(req.url.startsWith('/static/images/mobile/copyright/')) { 
      let custom_lang = ''
      if(req.url.includes('-fr.svg')) {
        custom_lang = 'fr'
      }
      if(req.url.includes('-ko.svg')) {
        custom_lang = 'ko'
      }
      if(req.url.includes('-vi.svg')) {
        custom_lang = 'vi'
      }

      const custom_logo = customLogos(req.url, custom_lang)
      if(custom_logo) {
        return res.sendFile(custom_logo)
      }
    }

    return next()
  })

  app.get('/wiki/:page/:sub_page', (req, res, next) => {
    const pageName = req.params.page;
    if (pageName && pageName.startsWith('File:')) {
        const rawName = pageName.split(':')[1]
        const encodedFileName = encodeURIComponent(rawName)
        const [h1, h2] = md5HashParts(rawName)
        const mediaPath = `/media/wikipedia/commons/${h1}/${h2}/${encodedFileName}`
        return res.redirect(mediaPath)
    }
    return handleWikiPage(req, res, '/wiki/')
  })

  app.get('/wiki/:page', (req, res, next) => {
    const pageName = req.params.page;
    if (pageName && pageName.startsWith('File:')) {
        const rawName = pageName.split(':')[1]
        const encodedFileName = encodeURIComponent(rawName)
        const [h1, h2] = md5HashParts(rawName)
        const mediaPath = `/media/wikipedia/commons/${h1}/${h2}/${encodedFileName}`
        return res.redirect(mediaPath)
    }
    return handleWikiPage(req, res, '/wiki/')
  })

  // Handle the search request and redirect to the correct wiki page
  app.get('/w/index.php', (req, res, next) => {
    const searchQuery = req.query.search
    if (searchQuery) {
      // Construct the URL to redirect to the proper wiki page
      const lang = req.query.lang || req.cookies.default_lang || config.default_lang
      const redirectUrl = `/wiki/${encodeURIComponent(searchQuery)}?lang=${lang}`
      return res.redirect(redirectUrl)
    }
    return next()
  })

  app.get('/w/:file', (req, res, next) => {
    return handleWikiPage(req, res, '/w/')
  })

  app.get(/^\/wiki\/Special:Map\/.*$/, (req, res, next) => {
    return handleWikiPage(req, res, '/wiki/Map')
  })

  app.get('/api/rest_v1/page/pdf/:page', pdfRateLimiter, async (req, res, next) => {
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
  app.get(/^\/zh.*$/, (req, res, next) => {
    const pathSplit = req.path.split('/')
    const lang = pathSplit[1]
    const page = pathSplit[2]
    return res.redirect(`/wiki/${page}?lang=${lang}`)
  })

  app.get('/', (req, res, next) => {
    return handleWikiPage(req, res, '/')
  })

  // Rate limiter for /about route: max 100 requests per 15 minutes per IP
  const aboutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  app.get('/about', aboutLimiter, (req, res, next) => {
    return res.sendFile(path.join(__dirname, '../static/about.html'))
  })

  app.get('/preferences', (req, res, next) => {
    // Pass CSRF token to preferences page
    return res.send(preferencesPage(req, res, req.csrfToken()))
})


  // Helper to validate safe redirect paths
  function isSafeRedirectPath(path) {
    // Must start with a single slash, not double slash, not contain backslash, not contain protocol
    return (
      typeof path === 'string' &&
      path.startsWith('/') &&
      !path.startsWith('//') &&
      !path.includes('\\') &&
      !/^\/(http|https):/.test(path)
    );
  }

  app.post('/preferences', (req, res, next) => {
    const theme = req.body.theme
    const default_lang = req.body.default_lang
    // Use URLSearchParams to robustly extract 'back' from the query string
    let back = '/'
    try {
      const urlObj = new URL(req.originalUrl, `http://${req.headers.host}`);
      back = urlObj.searchParams.get('back') || '/';
    } catch (e) {
      back = '/';
    }

    res.cookie('theme', theme, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })
    res.cookie('default_lang', default_lang, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true })

    if (!isSafeRedirectPath(back)) {
      back = '/'
    }

    return res.redirect(back)
  })

  app.post(/DownloadAsPdf/, (req, res, next) => {
    if(!req.body.page) {
      return res.redirect('/')
    }

    const lang = req.body.lang || req.cookies.default_lang || config.default_lang

    return res.redirect(`/w/index.php?title=Special%3ADownloadAsPdf&page=${req.body.page}&action=redirect-to-electron&lang=${lang}`)
  })
}

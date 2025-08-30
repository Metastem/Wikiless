const config = require('../wikiless.config')
const compression = require('compression')
const path = require('path')
const express = require('express')
const cookieParser = require('cookie-parser')
const fs = require('fs')
const lusca = require('lusca')
const session = require('express-session')
const { RedisStore } = require('connect-redis')
const app = express()
const r = require('redis')
const bodyParser = require('body-parser')

const redis = (() => {
  const redisOptions = {
    url: config.redis_url,
    password: config.redis_password
  }

  const client = r.createClient(redisOptions)
  client.on('error', (error) => {
    if(error) {
      console.error(`Redis error: ${error}`)
    }
  })
  // Handle connection explicitly
 client.on('connect', () => console.log('Redis connected'))
 client.on('reconnecting', () => console.log('Redis reconnecting...'))
  return client
})()

const utils = require('./utils.js')(redis)

let https = null
if(config.https_enabled) {
  const privateKey = fs.readFileSync(`${config.cert_dir}/privkey.pem`, 'utf8')
  const certificate = fs.readFileSync(`${config.cert_dir}/cert.pem`, 'utf8')
  const ca = fs.readFileSync(`${config.cert_dir}/fullchain.pem`, 'utf8')
  const credentials = {
	  key: privateKey,
	  cert: certificate,
	  ca
  }
  https = require('https').Server(credentials, app)
  global.protocol = 'https://'
} else {
  global.protocol = 'http://'
}

const http = require('http').Server(app)

app.use((req, res, next) => {
  // set CSP rules and other headers to every request
  res.set({
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; font-src 'self' data:; img-src 'self' data:; object-src 'none'; script-src 'none'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; media-src 'self'; form-action 'self'; frame-ancestors 'none'; " + (config.https_enabled ? 'upgrade-insecure-requests;' : '') + " block-all-mixed-content;",
    'Referrer-Policy': 'no-referrer',
    ...(config.https_enabled ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
    'X-Content-Type-Options': 'nosniff',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Frame-Options': 'DENY',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-XSS-Protection': '1; mode=block'
  })
  next()
})

if(!config.https_enabled && config.redirect_http_to_https) {
  console.error(`Cannot redirect HTTP=>HTTPS while "https_enabled" is false.`)
}

if(config.redirect_http_to_https) {
  app.use((req, res, next) => {
    if(req.secure) {
      next()
    } else {
      res.redirect(`https://${req.headers.host}${req.url}`)
    }
  })
}

app.use(compression())
app.use(cookieParser())

app.use(compression())
app.use(cookieParser())
 
app.use(session({
   store: new RedisStore({ 
     client: redis,
     prefix: 'sess:' // Prevents key collisions
   }),
   secret: config.session_secret || 'your_strong_secret_here', // MUST SET IN CONFIG
   resave: false,
   saveUninitialized: false,
   cookie: {
     maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
     httpOnly: true,
     secure: config.https_enabled,
     sameSite: 'lax'
   }
 }))

app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))
app.use(lusca.csrf())
app.use(express.static(path.join(__dirname, '../static')))
app.use(express.static(path.join(__dirname, '../media')))


if(config.trust_proxy) {
  app.set('trust proxy', config.trust_proxy_address)
}

require('./routes')(app, utils)

const cacheControl = require('./cache_control.js')
cacheControl.removeCacheFiles()

;(async () => {
  try {
    await redis.connect()
    console.log('Redis connection established - starting server')

    if(config.https_enabled) {
      https.listen(config.ssl_port, config.http_addr, () => 
        console.log(`Wikiless ${config.domain} running on https://${config.http_addr}:${config.ssl_port}`))
    }

    http.listen(config.nonssl_port, config.http_addr, () => 
      console.log(`Wikiless ${config.domain} running on http://${config.http_addr}:${config.nonssl_port}`))
  } catch (err) {
    console.error('FATAL: Could not connect to Redis', err)
    process.exit(1)
  }
})()

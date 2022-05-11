const express = require('express');
const redis = require('redis')

const app = express();
const port = process.env.PORT || 8000;

const redisHost = process.env.REDIS_HOST
const redisPort = process.env.REDIS_PORT || 6379

const redisClient = redis.createClient(redisHost, redisPort)

const rateLimitMaxRequests = 5
const rateLimitWindowMs = 60000

async function rateLimit(req, res, next) {
  const ip = req.ip
  // const tokenBucket = await getUserTokenBucket(ip)

  let tokenBucket = await redisClient.hGetAll(ip)
  console.log("== tokenBucket:", tokenBucket)
  tokenBucket = {
    tokens: parseFloat(tokenBucket.tokens) || rateLimitMaxRequests,
    last: parseInt(tokenBucket.last) || Date.now()
  }
  console.log("== tokenBucket:", tokenBucket)

  const now = Date.now()
  const ellapsedMs = now - tokenBucket.last
  tokenBucket.tokens += ellapsedMs * (rateLimitMaxRequests / rateLimitWindowMs)
  tokenBucket.tokens = Math.min(rateLimitMaxRequests, tokenBucket.tokens)
  tokenBucket.last = now

  if (tokenBucket.tokens >= 1) {
    tokenBucket.tokens -= 1
    await redisClient.hSet(ip, [['tokens', tokenBucket.tokens], ['last', tokenBucket.last]])
    // await redisClient.hSet(ip)
    next()
  } else {
    await redisClient.hSet(ip, [['tokens', tokenBucket.tokens], ['last', tokenBucket.last]])
    // await redisClient.hSet(ip)
    res.status(429).send({
      err: "Too many requests per minute"
    })
  }
}

// function getUserTokenBucket(ip) {
//   return new Promise(function (reject, resolve) {
//     redisClient.hgetall(ip, function (err, tokenBucket) {
//       if (err) {
//         reject(err)
//       } else {
//         resolve(tokenBucket)
//       }
//     })
//   })
// }

app.use(rateLimit)

app.get('/', (req, res) => {
  res.status(200).json({
    timestamp: new Date().toString()
  });
});

app.use('*', (req, res, next) => {
  res.status(404).json({
    err: "Path " + req.originalUrl + " does not exist"
  });
});

redisClient.connect().then(function () {
  app.listen(port, () => {
    console.log("== Server is running on port", port);
  });
})

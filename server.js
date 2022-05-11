const express = require('express');

const app = express();
const port = process.env.PORT || 8000;

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

app.listen(port, () => {
  console.log("== Server is running on port", port);
});

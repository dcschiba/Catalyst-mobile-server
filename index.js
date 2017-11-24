const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const Datastore = require('nedb');
const serviceAccount = require('./serviceAccountKey.json');

// initialize FCM
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// initialize db
const db = {};
db.devices = new Datastore();

// initialize express
const app = express();
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const port = 3000;
app.listen(port, () => {
  console.log(`Listening on port ${port} ...`);
});

app.get('/notification/devices', (req, res) => {
  db.devices.find({}, (err, devices) => {
    if (err) {
      res.header('Content-Type', 'application/json; charset=utf-8');
      res.status(500);
      return res.json({ result: 'error', message: err });
    }
    res.header('Content-Type', 'application/json; charset=utf-8');
    res.status(200);
    return res.json({ devices });
  });
});

app.post('/notification/regist', (req, res) => {
  const { token, uuid, platform } = req.body;
  const device = {
    token,
    uuid,
    platform,
  };
  db.devices.insert(device, (err) => {
    if (err) {
      res.header('Content-Type', 'application/json; charset=utf-8');
      res.status(500);
      return res.json({ result: 'error', message: err });
    }
    res.header('Content-Type', 'application/json; charset=utf-8');
    res.status(200);
    return res.json({ result: 'success' });
  });
});

app.post('/notification/send', (req, res) => {
  const { uuid } = req.body;
  db.devices.findOne({ uuid }, (err, device) => {
    if (err) {
      res.header('Content-Type', 'application/json; charset=utf-8');
      res.status(500);
      return res.json({ result: 'error', message: err });
    } else if (device === null) {
      res.header('Content-Type', 'application/json; charset=utf-8');
      res.status(500);
      return res.json({ result: 'error', message: 'not found target device' });
    }

    const { token, platform } = device;
    const { title, message } = req.body;
    let payload;
    if (platform === 'Android') {
      payload = {
        data: {
          title,
          message,
        },
      };
    } else if (platform === 'iOS') {
      payload = {
        notification: {
          title,
          body: message,
        },
      };
    }

    admin.messaging().sendToDevice(token, payload)
      .then(() => {
        res.header('Content-Type', 'application/json; charset=utf-8');
        res.status(200);
        return res.json({ result: 'success' });
      })
      .catch((error) => {
        res.header('Content-Type', 'application/json; charset=utf-8');
        res.status(500);
        return res.json({ result: 'error', message: error });
      });
  });
});

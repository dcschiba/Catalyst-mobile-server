const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const Datastore = require('nedb');
const log4js = require('log4js');
const serviceAccount = require('./serviceAccountKey.json');

// Logger
const logger = log4js.getLogger();
logger.level = 'info';

// Error Catch
process.on('uncaughtException', (err) => {
  logger.error('unhandled exception has occured');
  logger.error(err);
});

// initialize FCM
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// initialize db
const db = {};
db.devices = new Datastore();

// initialize express
const app = express();
app.use('/notification', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Content-Type', 'application/json; charset=utf-8');
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/client', express.static('client'));

const port = 3000;
app.listen(port, () => {
  logger.info(`listening on port ${port} ...`);
});

// get device list
app.get('/notification/devices', (req, res) => {
  db.devices.find({}, (err, devices) => {
    if (err) {
      res.status(500);
      const response = {
        error: {
          message: err,
        },
      };
      logger.error(err);
      return res.json(response);
    }
    res.status(200);
    logger.info('getting device list succeeded', devices);
    return res.json({ devices });
  });
});

// regist device
app.post('/notification/regist', (req, res) => {
  const { token, uuid, platform } = req.body;
  const device = {
    token,
    uuid,
    platform,
  };

  if (!token || !uuid || !platform) {
    res.status(500);
    const response = {
      error: {
        message: 'registration data is missing',
      },
    };
    logger.error(response.error.message, device);
    return res.json(response);
  }

  const options = {
    upsert: true,
  };

  db.devices.update({ uuid }, device, options, (err) => {
    if (err) {
      res.status(500);
      const response = {
        error: {
          message: err,
        },
      };
      logger.error(response.error.message);
      return res.json(response);
    }
    res.status(200);
    logger.info('registration succeeded', device);
    return res.json({ result: 'success' });
  });
});

// send push
app.post('/notification/send', (req, res) => {
  const { uuid } = req.body;
  if (!uuid) {
    res.status(500);
    const response = {
      error: {
        message: 'uuid is missing',
      },
    };
    logger.error(response.error.message, uuid);
    return res.json(response);
  }


  db.devices.findOne({ uuid }, (err, device) => {
    if (err) {
      res.status(500);
      const response = {
        error: {
          message: err,
        },
      };
      logger.error(response.error.message);
      return res.json(response);
    } else if (device === null) {
      res.status(500);
      const response = {
        error: {
          message: 'target device was not found',
        },
      };
      logger.error(response.error.message, device);
      return res.json(response);
    }

    const {
      token,
      platform,
    } = device;
    const {
      title,
      message,
      path = '',
    } = req.body;

    let payload;
    if (platform === 'Android') {
      payload = {
        data: {
          title,
          message,
          path,
        },
      };
    } else if (platform === 'iOS') {
      payload = {
        notification: {
          title,
          body: message,
        },
        data: {
          path,
        },
      };
    } else {
      res.status(500);
      const response = {
        error: {
          message: `${platform} is not supported`,
        },
      };
      logger.error(response.error.message, device);
      return res.json(response);
    }

    admin.messaging().sendToDevice(token, payload).then(() => {
      res.status(200);
      logger.info('notification succeeded', payload);
      return res.json({ result: 'success' });
    }).catch((e) => {
      res.status(500);
      const response = {
        error: {
          message: e,
        },
      };
      logger.error(response.error.message);
      return res.json(response);
    });
  });
});

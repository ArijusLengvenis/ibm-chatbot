"use strict";

const express = require("express");
const path = require("path");
const app = express();

app.use(require("morgan")("combined"));
app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  require("express-session")({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);

const AssistantV2 = require("ibm-watson/assistant/v2");
const { IamAuthenticator } = require("ibm-watson/auth");

const AssistantId = "5b1b16e6-2b64-4e35-952a-bc7eb3380250"
const assistant = new AssistantV2({
  version: "2021-06-14",
  authenticator: new IamAuthenticator({
    apikey: "6xqQREuVQe0i7hsktiYzqvPZsdkv_j3RV_H8GUHH7u9R",
  }),
  serviceUrl:
    "https://api.eu-gb.assistant.watson.cloud.ibm.com/instances/8d74b58f-52d4-4fed-971f-15abc4c09151",
});

app.use("/src", express.static(path.join(__dirname, "src")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/createsession", (req, res) => {
  assistant
    .createSession({
      assistantId: AssistantId,
    })
    .then((response) => {
      let sessionId = response.result.session_id;
      res.status(200).json({
        session_id: sessionId,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.post("/deletesession", (req, res) => {
  let sessionId = req.body.sessionId;
  if (sessionId == null) {
    res.status(500).send("Session ID is missing");
  }

  assistant
    .deleteSession({
      assistantId: AssistantId,
      sessionId: sessionId,
    })
    .then((response) => {
      res.sendStatus(200);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.post("/send", (req, res) => {
  let sessionId = req.body.sessionId;
  if (sessionId == null) {
    res.status(500).send("Session Id is missing");
    return;
  }

  let message = req.body.message;
  if (message == null) {
    res.status(500).send("Message is missing");
    return;
  }

  assistant
    .message({
      assistantId: AssistantId,
      sessionId: sessionId,
      input: {
        message_type: "text",
        text: message,
      },
    })
    .then((response) => {
      let answers = response.result.output.generic ?? [];
      let parsed = extractAnswers(answers);

      res.status(200).json(parsed);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

function extractAnswers(answers) {
  let parsed = [];
  for (let answer of answers) {
    switch (answer.response_type) {
      case "search":
        var ans = parseSearchAnswer(answer);
        if (ans != null) {
          parsed.push(ans);
        }
        break;
      case "text":
        var ans = parseTextAnswer(answer);
        if (ans != null) {
          parsed.push(ans);
        }
        break;
      default:
        break;
    }
  }

  return parsed;
}

function parseTextAnswer(answer) {
  return {
    text: answer.text,
  };
}

function parseSearchAnswer(answer) {
  let results = [];
  for (let primaryResult of answer.primary_results) {
    results.push({
      title: primaryResult.title,
      body: primaryResult.body,
      score: primaryResult.result_metadata.confidence,
    });
  }

  results.sort((a, b) => {
    return b.score - a.score;
  });

  if (results.length == 0) {
    return null;
  } else {
    return {
      text: results[0].body,
    };
  }
}

module.exports = app;

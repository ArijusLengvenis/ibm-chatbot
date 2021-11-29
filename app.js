"use strict";

const express = require("express");
const path = require("path");
const app = express();
const whiteList = [{ username: 'admin', password: 'admin' }];

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

// FORMAT OUR API RESPONDS WITH
class APIResponse {
    header;
    text;
    confidence = 1;

    json() {
        return {
            header: this.header,
            text: this.text,
            confidence: this.confidence
        }
    }
}

app.on('listening', () => {
  /*
    On server startup - check current commit hashes on github;
    If hashes match, initialize a 24 hour timer to repeat the action and do nothing;
    If they do not match:
      * Run updateDiscoveryRepo() - returns the current commit hash as output;
        Inside the function:
          * clone current repository locally;
          * take specific file(s) out of repo for extraction (denoted by the "extraction" feature in the obj);
          * use the new files to update Discovery using the API (deleting the old file in the process);
      * Replace the commit hash with the new one;
      * Wait 24 hours to repeat the check.
  */
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
  const sessionId = req.body.sessionId;
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
  const sessionId = req.body.sessionId;
  if (sessionId == null) {
    res.status(500).send("Session Id is missing");
    return;
  }

  const message = req.body.message;
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
      const answers = response.result.output.generic ?? [];
      const parsed = extractAnswers(answers);

      res.status(200).json(parsed);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send(err);
    });
});

app.post("/authenticate", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  /*
    IMPLEMENT LATER:

    Send username and password to WA through an encrypted channel;
    If positive authentication token received, then reroute,
    else throw error.

    Eliminate whitelist from server.
  */
  if (username && password) {
    if (whiteList.some(member => member.username === username && member.password === password)) {
        res.status(200).redirect('https://eu-gb.discovery.watson.cloud.ibm.com/regions/eu-gb/services/crn%3Av1%3Abluemix%3Apublic%3Adiscovery%3Aeu-gb%3Aa%2Fe249219992a043ae9bbf3a2d3997ce9d%3A0827ccfe-7eb7-4648-b371-a836867b4ba5%3A%3A')
    }
    else {
        res.status(500).json("Wrong credentials")
    }
  }
})


function extractAnswers(answers) {
  let parsed = [];
  for (let answer of answers) {
    switch (answer.response_type) {
      case "search":
        var ans = parseSearchAnswer(answer);
        if (ans != null) {
          parsed = [...parsed, ...ans]
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
    let apiResponse = new APIResponse()
    apiResponse.text = answer.text
    return apiResponse.json()
}

function parseSearchAnswer(answer) {
  let results = [];

  if (answer.primary_results.length == 0) {
    let apiResponse = new APIResponse()
    apiResponse.text = answer.header
    return [apiResponse.json()]
  }

  for (let result of [...answer.primary_results, ...answer.additional_results]) {
    let apiResponse = new APIResponse()
    apiResponse.header = result.title
    apiResponse.text = result.body
    apiResponse.confidence = result.result_metadata.confidence
    results.push(apiResponse.json());
  }
  
  results.sort((a, b) => {
    return b.confidence - a.confidence;
  });

  const MAX_RESULTS = 5
  if (results.length == 0) {
    return null;
  } else if (results.length > MAX_RESULTS) {
    return results.slice(0, MAX_RESULTS)
  } else {
      return results
  }
}

module.exports = app;

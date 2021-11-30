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
const DiscoveryV2 = require("ibm-watson/discovery/v1");
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

const DiscoveryEnvironmentId = "2ab12c80-05d8-4232-9a93-a2a85d6c642e"
const DiscoveryCollectionId = "592bc518-0f0d-4a76-9ba9-d5a1f5536b6a"
const discovery = new DiscoveryV2({
  version: "2020-08-30",
  authenticator: new IamAuthenticator({
    apikey: "CdIbNZTEHeoctQJZs8NgfDkM1dTfwkZ4AsHGpTpQXfrv",
  }),
  serviceUrl:
    "https://api.eu-gb.discovery.watson.cloud.ibm.com/instances/0827ccfe-7eb7-4648-b371-a836867b4ba5",
})

// Class used to send data back to frontend
class APIResponse {
  documentId;
  header;
  text;
  confidence = 1;

  json() {
    return {
      id: this.documentId,
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

app.post("/createsession", async (req, res) => {

  try {
    let response = await assistant.createSession({
      assistantId: AssistantId,
    })
    let sessionId = response.result.session_id;
    res.status(200).json({
      session_id: sessionId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.post("/deletesession", async (req, res) => {
  const sessionId = req.body.sessionId;
  if (sessionId == null) {
    res.status(500).send("Session ID is missing");
  }

  try {
    await assistant.deleteSession({
      assistantId: AssistantId,
      sessionId: sessionId,
    })
    res.sendStatus(200);
  } catch(err) {
    console.error(err);
    res.status(500).send(err);
  }
});

app.post("/send", async (req, res) => {
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

  try {
    const answers = await getAnswersToQuery(sessionId, message)
    res.status(200).json(answers)
  } catch(err) {
    console.error(err)
    res.status(500).send(err)
  }
});

app.post("/rate", async (req, res) => {
  let query = req.body.query
  if (query == null) {
    res.status(500).send("Query is missing");
    return;
  }
  query = query.toLowerCase().trim()

  const documentId = req.body.documentId
  if (documentId == null) {
    res.status(500).send("Document Id is missing");
    return;
  }

  const isRelevant = req.body.relevant
  if (isRelevant == null) {
    res.status(500).send("Is Relevant is missing");
    return;
  }

  try {
    const existingQueryId = await getTrainingQueryId(query)
    if (existingQueryId) {
      addExampleToTrainingQuery(existingQueryId, documentId, isRelevant)
    } else {
      addNewTrainingQuery(query, documentId, isRelevant)
    }
    res.sendStatus(200)
  } catch(err) {
    res.status(500).send(err)
  }
})

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

// Convert to relevance scale
function getRelevance(isRelevant) {
  return isRelevant ? 10 : 0
}

// List all training queries
async function getTrainingQueries() {
  try {
    const trainingDataSet = await discovery.listTrainingData({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId
    })
    return trainingDataSet.result.queries ?? []
  } catch (err) {
    throw err
  }
}

// Get query_id of a query (given that it exists)
async function getTrainingQueryId(query) {
  try {
    const trainingQueries = await getTrainingQueries()
    const filteredQueries = trainingQueries.filter(trainingQuery => {
      return trainingQuery.natural_language_query == query.toLowerCase().trim()
    })
    if (filteredQueries.length == 0) {
      return null
    } else {
      return filteredQueries[0].query_id
    }
  } catch (err) {
    throw err
  }
}

// Add new training query
async function addNewTrainingQuery(query, documentId, isRelevant) {
  try {
    const trainingQuery = await discovery.addTrainingData({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId,
      naturalLanguageQuery: query,
      examples: [{
        document_id: documentId,
        relevance: getRelevance(isRelevant)
      }]
    })
    return trainingQuery.result.query_id
  } catch (err) {
    throw err
  }
}

// Add new example to existing training query
async function addExampleToTrainingQuery(queryId, documentId, isRelevant) {
  try {
    await discovery.createTrainingExample({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId,
      queryId: queryId,
      documentId: documentId,
      relevance: getRelevance(isRelevant)
    })
  } catch (err) {
    throw err
  }
}

// Answer a question using Watson Assistant
async function getAnswersToQuery(sessionId, query) {
  try {
    const response = await assistant.message({
      assistantId: AssistantId,
      sessionId: sessionId,
      input: {
        message_type: "text",
        text: query,
      },
    })
    const rawAnswers = response.result.output.generic ?? [];
    const extractedAnswers = extractAnswers(rawAnswers)
    return extractedAnswers
  } catch (err) {
    throw err
  }
}

// Convert answers to APIResponse classes
function extractAnswers(answers) {

  // Convert text answer to APIReponse class
  function parseTextAnswer(answer) {
    let apiResponse = new APIResponse()
    apiResponse.text = answer.text
    return apiResponse.json()
  }

  // Convert search answer to APIReponse class
  function parseSearchAnswer(answer) {
  const results = [];

  if (answer.primary_results.length == 0) {
    let apiResponse = new APIResponse()
    apiResponse.text = answer.header
    return [apiResponse.json()]
  }

  for (let result of [...answer.primary_results, ...answer.additional_results]) {
    let apiResponse = new APIResponse()
    apiResponse.documentId = result.id;
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

module.exports = app;

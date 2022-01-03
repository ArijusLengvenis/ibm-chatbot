const express = require("express");
const path = require("path");
const fs = require("fs/promises")
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

const AssistantId = "7b730136-c29d-4c4c-8ce7-e64bd8c20fb5"
const assistant = new AssistantV2({
  version: "2021-06-14",
  authenticator: new IamAuthenticator({
    apikey: "z359XU0gNHHMa1mm6A233NRUpuOSr8DR26DO4omZ3HHl",
  }),
  serviceUrl:
    "https://api.eu-gb.assistant.watson.cloud.ibm.com/instances/79dfff8b-2db7-4e46-8941-e1cb58df7511",
});

const DiscoveryEnvironmentId = "8417abb8-ac0e-4576-b24b-a4c42be9010c"
const DiscoveryCollectionId = "cfc05e8d-9526-4d0f-bff0-36a41b5bdfc1"
const discovery = new DiscoveryV2({
  version: "2020-08-30",
  authenticator: new IamAuthenticator({
    apikey: "mX_B5TCqyDo99vl3YUuB-rC5qfLodj6fNt4wqLsNFgH7",
  }),
  serviceUrl:
    "https://api.eu-gb.discovery.watson.cloud.ibm.com/instances/ed97e2db-2a2a-4965-afd7-119eaaa5f34d",
})

function adminDeleteDocument(documentId) {
  discovery.deleteDocument({
    environmentId: DiscoveryEnvironmentId,
    collectionId: DiscoveryCollectionId,
    documentId: documentId
  }).catch(err => {
    console.error(err)
  })
}

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

app.use("/css", express.static(path.join(__dirname, "src", "css")));
app.use("/js", express.static(path.join(__dirname, "src", "js")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/createsession", async (req, res) => {
  try {
    let response = await assistant.createSession({
      assistantId: AssistantId,
    })
    let sessionId = response.result.session_id;
    res.status(201).json({
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
    res.sendStatus(204);
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
    const updatedRatings = await getUpdatedRating(existingQueryId, documentId, getRelevance(isRelevant))
    const newRelevance = Math.round(updatedRatings.updatedRating) * 10
    if (existingQueryId) {
      await addExampleToTrainingQuery(existingQueryId, documentId, newRelevance, updatedRatings.existingDocument)
    } else {
      const queryId = await addNewTrainingQuery(query, documentId, newRelevance)
      await getUpdatedRating(queryId, documentId, getRelevance(isRelevant))
    }
    res.sendStatus(201)
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

// Add new rating to JSON file and return new average rating for the document
async function getUpdatedRating(queryId, documentId, newRating) {

  if (!queryId) {
    return {
      existingDocument: false,
      updatedRating: newRating
    }
  }

  async function getExisitingRatings() {
    try {
      const ratingsJsonString = await fs.readFile("src/json/Ratings.json");
      const ratingsJson = JSON.parse(ratingsJsonString)
      return ratingsJson
    } catch (err) {
      return null
    }
  }

  async function updateExistingRatings(ratingsJson) {
    try {
      console.log(JSON.stringify(ratingsJson))
      await fs.writeFile("src/json/Ratings.json", JSON.stringify(ratingsJson))
    } catch (err) {
      console.error(err)
    }
  }

  try {
    let ratingsJson = await getExisitingRatings();
    if (ratingsJson) {
      if (queryId in ratingsJson) {
        // Query ID has already been rated
        let ratedDocuments = ratingsJson[queryId]
        if (documentId in ratedDocuments) {
          // Document has already been given a rating
          const documentRating = ratedDocuments[documentId]
          const sumOfRatings = documentRating.avgRating * documentRating.ratingCount
          const newAverageRating = (sumOfRatings + newRating) / (documentRating.ratingCount + 1)
          const newDocumentRating = {
            avgRating: newAverageRating,
            ratingCount: documentRating.ratingCount + 1
          }
          ratedDocuments[documentId] = newDocumentRating
          updateExistingRatings(ratingsJson)
          return {
            existingDocument: true,
            updatedRating: newAverageRating
          }
        } else {
          // Document has not been given a rating yet
          const newDocumentRating = {
            avgRating: newRating,
            ratingCount: 1
          }
          ratedDocuments[documentId] = newDocumentRating
          updateExistingRatings(ratingsJson)
          return {
            existingDocument: false,
            updatedRating: newRating
          }
        }
      } else {
        // Query ID hasn't been given a rating yet
        const newDocumentRating = {
          avgRating: newRating,
          ratingCount: 1
        }
        const newQueryRating = {
          [documentId]: newDocumentRating
        }
        ratingsJson[queryId] = newQueryRating
        updateExistingRatings(ratingsJson)
        return {
          existingDocument: false,
          updatedRating: newRating
        }
      }
    }
  } catch (err) {
    throw err;
  }
}

// Convert to relevance scale
function getRelevance(isRelevant) {
  return isRelevant ? 1 : 0
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
async function addNewTrainingQuery(query, documentId, relevance) {
  try {
    const trainingQuery = await discovery.addTrainingData({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId,
      naturalLanguageQuery: query,
      examples: [{
        document_id: documentId,
        relevance: relevance
      }]
    })
    return trainingQuery.result.query_id
  } catch (err) {
    throw err
  }
}

// Add new example to existing training query
async function addExampleToTrainingQuery(queryId, documentId, relevance, isDocumentAlreadyRated) {

  async function addNewTrainingExample(newRelevance) {
    try {
      await discovery.createTrainingExample({
        environmentId: DiscoveryEnvironmentId,
        collectionId: DiscoveryCollectionId,
        queryId: queryId,
        documentId: documentId,
        relevance: newRelevance
      })
    } catch (err) {
      throw err
    }
  }

  async function updateExistingTrainingExample(newRelevance) {
    try {
      await discovery.updateTrainingExample({
        environmentId: DiscoveryEnvironmentId,
        collectionId: DiscoveryCollectionId,
        queryId: queryId,
        exampleId: documentId,
        relevance: newRelevance
      })
    } catch (err) {
      throw err
    }
  }

  try {
    if (isDocumentAlreadyRated) {
      await updateExistingTrainingExample(relevance)
    } else {
      await addNewTrainingExample(relevance)
    }
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
    console.log(JSON.stringify(response, null, 2))
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

/** @module app */

const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const { Readable } = require("stream")
const StreamZip = require("node-stream-zip")
const XmlReader = require("xml-reader")
const XmlQuery = require("xml-query");
const app = express();
const AssistantV2 = require("ibm-watson/assistant/v2");
const DiscoveryV2 = require("ibm-watson/discovery/v1");
const { IamAuthenticator } = require("ibm-watson/auth");

// Initialize middleware
app.use(require("morgan")("combined"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(
  require("express-session")({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);
app.use("/css", express.static(path.join(__dirname, "src", "css")));
app.use("/js", express.static(path.join(__dirname, "src", "js")));

// Initialize Assistant
const AssistantId = "7b730136-c29d-4c4c-8ce7-e64bd8c20fb5"
const assistant = new AssistantV2({
  version: "2021-06-14",
  authenticator: new IamAuthenticator({
    apikey: "z359XU0gNHHMa1mm6A233NRUpuOSr8DR26DO4omZ3HHl",
  }),
  serviceUrl:
    "https://api.eu-gb.assistant.watson.cloud.ibm.com/instances/79dfff8b-2db7-4e46-8941-e1cb58df7511",
});

// Initialize Discovery
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

// Initialize API endpoints

/**
 * Get main page html file
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/**
 * 
 */
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
  // Ensure sessionId isn't missing
  const sessionId = req.body.sessionId;
  if (sessionId == null) {
    res.status(500).send("Session Id is missing");
    return;
  }

  // Ensure message isn't missing
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

  // Ensure query isn't missing
  let query = req.body.query
  if (query == null) {
    res.status(500).send("Query is missing");
    return;
  }
  query = query.toLowerCase().trim()

  // Ensure documentId isn't missing
  const documentId = req.body.documentId
  if (documentId == null) {
    res.status(500).send("Document Id is missing");
    return;
  }

  // Parse relevances
  const newRelevance = boolToInt(req.body.relevant)
  const oldRelevance = boolToInt(req.body.oldRelevant)

  try {
    // Get the query id (if it exists) for the given query
    const existingQueryId = await getTrainingQueryId(query)

    // Update the local json file and get the document's new average relevance
    const updatedRatings = await updateRating(existingQueryId, documentId, newRelevance, oldRelevance)

    if (updatedRatings != null) {
      // Update existing training query
      const newRelevanceScore = getRelevanceScore(updatedRatings.newRelevance)
      if (!updatedRatings.existingDocument) {
        await createTrainingQueryDocument(existingQueryId, documentId, newRelevanceScore)
      } else {
        await updateTrainingQueryDocument(existingQueryId, documentId, newRelevanceScore)
      }
    } else {
      if (existingQueryId) {
        // Delete document for query as all ratings for the document has been removed 
        await deleteTrainingQueryExample(existingQueryId, documentId)
      } else {
        // Create new training query with document
        const newRelevanceScore = getRelevanceScore(newRelevance)
        const queryId = await createTrainingQuery(query, documentId, newRelevanceScore)

        // Update the local json file
        await updateRating(queryId, documentId, newRelevance, null)
      }
    }
    res.sendStatus(204)
  } catch(err) {
    res.status(500).send(err)
  }
})


// Define server functions

/**
 * @typedef {object} RatingUpdateResult
 * @instance
 * @property {boolean} existingDocument Has the document previously been given a rating
 * @property {number} newRelevance The new average relevance given to the document
 */

/** 
 * Class representing a response from Watson Assistant
 * @static
*/
class APIResponse {

  /**
   * The id of the document that the answer comes from
   * @type {?string}
   */
  documentId;

  /**
   * The answer's header
   * @type {?string}
   */
  header;

  /**
   * The answer's body
   * @type {string}
   */
  text;

  /**
   * The answer's confidence. Ranges from 0 to 1.
   * @type {number}
   * @default 1
   */
  confidence = 1;

  /**
   * Convert to JSON format
   * @returns {any}
   */
  json() {
    return {
      id: this.documentId,
      header: this.header,
      text: this.text,
      confidence: this.confidence
    }
  }
}

/**
 * Update the ratings stored in the local json file. A return value of `null` signifies that the query doesn't exist or the document no longer has a rating.
 * @instance
 * @param {string} queryId 
 * @param {string} documentId 
 * @param {number} newRating 
 * @param {number} oldRating 
 * @returns {Promise<?RatingUpdateResult>} 
 */
async function updateRating(queryId, documentId, newRating, oldRating) {

  // Return without updating json if query id doesn't exist
  if (!queryId) {
    return null;
  }

  /**
   * Get the existing ratings stored in the local json file
   * @inner
   * @returns {Promise<any?>} Existing ratings
   */
  async function getExisitingRatings() {
    try {
      const ratingsJsonString = await fs.readFile("src/json/Ratings.json", {
        encoding: "utf-8"
      });
      const ratingsJson = JSON.parse(ratingsJsonString)
      return ratingsJson
    } catch (err) {
      return null
    }
  }

  /**
   * Update contents of local ratings json file
   * @inner
   * @param {any} ratingsJson Updated ratings json
   */
  async function updateExistingRatings(ratingsJson) {
    try {
      await fs.writeFile("src/json/Ratings.json", JSON.stringify(ratingsJson))
    } catch (err) {
      console.error(err)
    }
  }

  try {
    let ratingsJson = await getExisitingRatings();
    if (ratingsJson) {

      // Check if query id has already been rated
      if (queryId in ratingsJson) {

        // Check if document has already been given a rating
        let ratedDocuments = ratingsJson[queryId]
        if (documentId in ratedDocuments) {

          // Get new values for the json file
          const documentRating = ratedDocuments[documentId]
          const sumOfRatings = documentRating.avgRating * documentRating.ratingCount
          const newRatingCount = documentRating.ratingCount + (newRating == null ? 0 : 1) - (oldRating == null ? 0 : 1)
          
          if (newRatingCount == 0) {
            // Remove the document rating
            delete ratedDocuments[documentId]
            updateExistingRatings(ratingsJson)
            return null;
          }
          
          // Update the document rating
          const newAverageRating = (sumOfRatings + (newRating == null ? 0 : newRating) - (oldRating == null ? 0 : oldRating)) / newRatingCount
          const newDocumentRating = {
            avgRating: newAverageRating,
            ratingCount: newRatingCount
          }
          ratedDocuments[documentId] = newDocumentRating
          updateExistingRatings(ratingsJson)

          return {
            existingDocument: true,
            newRelevance: newAverageRating
          }
        } else if (newRating != null) {
          // Add a new document rating
          const newDocumentRating = {
            avgRating: newRating,
            ratingCount: 1
          }
          ratedDocuments[documentId] = newDocumentRating
          updateExistingRatings(ratingsJson)

          return {
            existingDocument: false,
            newRelevance: newRating
          }
        } else {
          throw new Error("Can't remove rating from a non-existing document")
        }
      } else if (newRating != null) {
        // Add a new document rating to the new query id
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
          newRelevance: newRating
        }
      } else {
        throw new Error("Document has no rating to remove")
      }
    } else {
      throw new Error("Unable to read ratings json file")
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Converts a boolean to an integer
 * @instance
 * @param {boolean} value Boolean value
 * @returns {number} Integer value
 */
function boolToInt(value) {
  if (value == null) {
    return null;
  }

  return value ? 1 : 0
}

/**
 * Converts the average relevance into the Discovery relevance score
 * @instance
 * @param {number} avgRelevance Average relevance. Must be between 0 (not relevant) & 1 (relevant).
 * @returns {number} Relevance score
 */
function getRelevanceScore(avgRelevance) {
  return Math.round(avgRelevance) * 10
}

/**
 * Get all training queries from Discovery
 * @instance
 * @returns {Promise<DiscoveryV2.TrainingQuery[]>}
 */
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

/**
 * Retrieves the queryId for a given plain english query. Returns null if no relevancy training has been applied to the query before.
 * @instance
 * @param {string} query The plain english query
 * @returns {Promise<?string>} The query id
 */
async function getTrainingQueryId(query) {
  try {
    // Get all training queries
    const trainingQueries = await getTrainingQueries()

    // Filter out training queries that match the user-inputted query
    const filteredQueries = trainingQueries.filter(trainingQuery => {
      return trainingQuery.natural_language_query == query.toLowerCase().trim()
    })

    // Return the query id
    if (filteredQueries.length == 0) {
      return null
    } else {
      return filteredQueries[0].query_id
    }
  } catch (err) {
    throw err
  }
}

/**
 * Create a new training query
 * @instance
 * @param {string} query Plain text english query
 * @param {string} documentId Document id
 * @param {number} relevance Relevance score of the {@link documentId document} for the {@link query}
 * @returns {Promise<string>} Newly created query id corresponding to the {@link query}
 */
async function createTrainingQuery(query, documentId, relevance) {
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

/**
 * Add a document rating to an existing training query
 * @instance
 * @param {string} queryId Query id
 * @param {string} documentId Document id
 * @param {number} relevance Relevance score of the {@link documentId document} for the {@link queryId query}
 */
async function createTrainingQueryDocument(queryId, documentId, relevance) {
  try {
    await discovery.createTrainingExample({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId,
      queryId: queryId,
      documentId: documentId,
      relevance: relevance
    })
  } catch (err) {
    throw err
  }
}

/**
 * Update a document rating to an existing training query
 * @instance
 * @param {string} queryId Query id
 * @param {string} documentId Document id
 * @param {number} relevance Relevance score of the {@link documentId document} for the {@link queryId query}
 */
async function updateTrainingQueryDocument(queryId, documentId, relevance) {
  try {
    await discovery.updateTrainingExample({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId,
      queryId: queryId,
      exampleId: documentId,
      relevance: relevance
    })
  } catch (err) {
    throw err
  }
}

/**
 * Delete a document from a training query
 * @instance
 * @param {string} queryId The query id
 * @param {string} documentId The document id
 */
async function deleteTrainingQueryExample(queryId, documentId) {
  try {
    await discovery.deleteTrainingExample({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId,
      queryId: queryId,
      exampleId: documentId
    })
  } catch (err) {
    throw err
  }
}

/**
 * Retrieve answers to a plain text query using Assistant
 * @instance
 * @param {string} sessionId Chatbot session id
 * @param {string} query Plain text english query
 * @returns {Promise<APIResponse[]>} List of answers
 */
async function getAnswersToQuery(sessionId, query) {
  try {
    // Get result from Assistant
    const response = await assistant.message({
      assistantId: AssistantId,
      sessionId: sessionId,
      input: {
        message_type: "text",
        text: query,
      },
    })

    // Convert raw answers to APIResponse
    const rawAnswers = response.result.output.generic ?? [];
    const extractedAnswers = extractAnswers(rawAnswers)

    return extractedAnswers
  } catch (err) {
    throw err
  }
}

/**
 * Convert raw answers from Assistant to the {@link APIResponse} class
 * @instance
 * @param {AssistantV2.RuntimeResponseGeneric[]} answers Raw answers
 * @returns {APIResponse[]} Formatted answers
 */
function extractAnswers(answers) {

  /**
   * Convert raw text answers from Assistant to the {@link APIResponse} class
   * @inner
   * @param {AssistantV2.RuntimeResponseGenericRuntimeResponseTypeText} answer Raw text answer
   * @returns {APIResponse[]} Formatted answers
   */
  function parseTextAnswer(answer) {
    let apiResponse = new APIResponse()
    apiResponse.text = answer.text
    return [apiResponse.json()]
  }

  /**
   * Convert raw search answers from Assistant to the {@link APIResponse} class
   * @inner
   * @param {AssistantV2.RuntimeResponseGenericRuntimeResponseTypeSearch} answer Raw text answer
   * @returns {APIResponse[]} Formatted answers
   */
  function parseSearchAnswer(answer) {
    const results = [];

    // Check if no answer was found
    if (answer.primary_results.length == 0) {
      let apiResponse = new APIResponse()
      apiResponse.text = answer.header
      return [apiResponse.json()]
    }

    // Convert all primary and additional answers
    for (let result of [...answer.primary_results, ...answer.additional_results]) {
      let apiResponse = new APIResponse()
      apiResponse.documentId = result.id;
      apiResponse.header = result.title
      apiResponse.text = result.body
      apiResponse.confidence = result.result_metadata.confidence
      results.push(apiResponse.json());
    }

    // Sort answers by their confidence score
    results.sort((a, b) => {
      return b.confidence - a.confidence;
    });

    // Retrieve the top n results
    const MAX_RESULTS = 5
    if (results.length == 0) {
      return [];
    } else if (results.length > MAX_RESULTS) {
      return results.slice(0, MAX_RESULTS)
    } else {
      return results
    }
  }

  // Collect all APIResponses
  let parsed = [];
  for (let answer of answers) {
    switch (answer.response_type) {
      case "search":
        var ans = parseSearchAnswer(answer);
        parsed = [...parsed, ...ans]
        break;
      case "text":
        var ans = parseTextAnswer(answer);
        parsed.push(...ans);
        break;
      default:
        break;
    }
  }

  return parsed;
}

/**
 * Uploads the glossary to Discovery
 * @instance
 * @param {string} filepath File path pointing to the DOCX file containing the glossary
*/
async function uploadGlossary(filepath) {

  /**
   * Extracts the XML document from the DOCX file found at the given {@link filepath file path}
   * @inner
   * @returns {Promise<string>} XML document
  */
  function extractXML() {
    return new Promise((resolve, reject) => {
      const zip = new StreamZip({
        file: filepath,
        storeEntries: true
      })
      zip.on("ready", () => {
        let chunks = []
        zip.stream("word/document.xml", (err, stream) => {
          if (err) {
            reject(err)
          } else {
            stream.on("data", (chunk) => {
              chunks.push(chunk)
            })
            stream.on("end", () => {
              let content = Buffer.concat(chunks)
              zip.close()
              resolve(content.toString())
            })
          }
        })
      })
    })
  }

  /**
   * Formatter for glossary entries
   * @inner
   * @param {string} text Glossary entry
   * @returns {string} Formatted text
   */
  function formatGlossaryText(text) {
    // Remove trailing whitespace
    text = text.trim()

    // Remove duplicate spaces
    text = text.replace(/\s+/g, " ")

    // Replace HTML amp entity with actual character
    text = text.replace(/&amp;/g, "&")

    // Make sure full stops have a space after them
    text = text.replace(/\.(?=[A-Z])/g, ". ")

    return text
  }

  try {
    const xml = await extractXML()

    const parsedXml = XmlReader.parseSync(xml)
    const query = XmlQuery(parsedXml)

    // Get FAQ Table from the XML
    const faqTable = query.find("w:tbl").last()

    const GlossaryDocumentId = "ba1f5494-0884-42ad-8368-bd4dc86794a8"
    const GlossaryPath = "src/json/Glossary.json"

    // Get Current Glossary Document Count
    const currentGlossary = await fs.readFile(GlossaryPath, {
      encoding: "utf-8"
    })
    const glossaryJSON = JSON.parse(currentGlossary)
    const documentCount = Object.keys(glossaryJSON).length;

    let glossaries = {}

    // Upload glossary entries 
    let i = 0
    faqTable.find("w:tr").each(row => {
      row = XmlQuery(row)
      const columns = row.find("w:tc")
      const term = formatGlossaryText(columns.first().text())
      const ignoredTerms = ["Term", ""]
      if (!ignoredTerms.includes(term)) {
        const definition = formatGlossaryText(columns.last().text())
        const document = {
          question: [term],
          answer: [definition]
        }
        const glossaryEntryDocumentId = GlossaryDocumentId + "_" + i.toString()
        glossaries[glossaryEntryDocumentId] = document

        uploadDocument(glossaryEntryDocumentId, "Glossary.json", Readable.from(JSON.stringify(document)), "application/json")
        i += 1
      }
    })
    
    // Delete documents that no longer exist in the glossary
    while (i < documentCount) {
      const glossaryEntryDocumentId = GlossaryDocumentId + "_" + i.toString()
      deleteDocument(glossaryEntryDocumentId)
      i += 1
    }

    // Record new documents in json file
    await fs.writeFile(GlossaryPath, JSON.stringify(glossaries))
  } catch (err) {
    console.error(err)
  }

}

/**
 * Upload a file or document to Discovery
 * @instance
 * @param  {string} documentId The id of the document
 * @param  {string} name The name of the document
 * @param  {(NodeJS.ReadableStream|Buffer)} buffer The content of the document
 * @param  {string} mime The content type of the uploaded document
 * @returns {Promise<boolean>} Document successfully uploaded
 */
async function uploadDocument(documentId, name, buffer, mime) {
  try {
    await discovery.updateDocument({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId,
      documentId: documentId,
      file: buffer,
      filename: name,
      fileContentType: mime
    })
    return true
  } catch (err) {
    return false
  }
}

/**
 * Delete a document from Discovery
 * @instance
 * @param {string} documentId The id of the document to delete
 */
 async function deleteDocument(documentId) {
   try {
    discovery.deleteDocument({
      environmentId: DiscoveryEnvironmentId,
      collectionId: DiscoveryCollectionId,
      documentId: documentId
    })
   } catch (err) {
     console.error(err)
   }
}

// Upload Glossary on Server Start
uploadGlossary(path.join(__dirname, "src", "data", "Cloud for FS FAQ & Field Guide.docx"))

module.exports = app;

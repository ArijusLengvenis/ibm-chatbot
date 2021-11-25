"use strict";

const express = require("express");
const path = require("path");
const app = express();

app.use(require("morgan")("combined"));
app.use(require("body-parser").urlencoded({ extended: true }));
app.use(
  require("express-session")({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  })
);

const AssistantV2 = require("ibm-watson/assistant/v2");
const { IamAuthenticator } = require("ibm-watson/auth");

const assistant = new AssistantV2({
  version: "2021-06-14",
  authenticator: new IamAuthenticator({
    apikey: "6xqQREuVQe0i7hsktiYzqvPZsdkv_j3RV_H8GUHH7u9R",
  }),
  serviceUrl:
    "https://api.eu-gb.assistant.watson.cloud.ibm.com/instances/8d74b58f-52d4-4fed-971f-15abc4c09151",
});

const messages = [];

app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/send", (req, res) => {
  assistant
    .message({
      assistantId: "9955da3f-87d4-4b4f-bed8-6760883dc224",
      sessionId: "8d74b58f-52d4-4fed-971f-15abc4c09151",
      input: {
        message_type: "text",
        text: req.body.message,
      },
    })
    .then((res) => {
      console.log(JSON.stringify(res.result, null, 2));
      messages.push(res.result);
    })
    .catch((err) => {
      console.log(err);
    });
});

module.exports = app;

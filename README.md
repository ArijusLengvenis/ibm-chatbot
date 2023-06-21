# IBM Chatbot Project

![Chatbot front page](https://github.com/ArijusLengvenis/ibm-chatbot/blob/main/img/chatbotimg.png?raw=true)

This project was designed to provide assistance to customers at IBM Cloud for Financial Services (C4FS) by utilising the IBM Watson machine learning framework to train a fully-functional, self-learning chatbot which would be able to quickly serve information from the extensive IBM documentation on a moment's notice. The model is pre-trained with the C4FS FAQ information and should work out of the box with the relevant credentials.

## Overview
This project was developed by Arijus Lengvenis, Dev Mukherjee, Guilherme Cunha, and Jeff Gugelmann. The goal of this project is to provide a efficient self-learning chatbot powered by IBM Watson with a simplistic UI which would be user-friendly and natural to interact with.

## Installation
To install and run the chatbot locally, follow these steps:

1. Clone the repository: `git clone https://github.com/your-username/ibm-chatbot-project.git`
2. Install the required dependencies: `npm install`
3. Set up the necessary configuration files:
   - Create a `config.js` file in the root directory and provide the required credentials for IBM Watson Discovery.
   - Configure the `nodemon.json` file according to your preferences.
4. Start the chatbot: `npm start`
5. Access the chatbot in your browser at `http://localhost:3000`

![Chatbot message screen](https://github.com/ArijusLengvenis/ibm-chatbot/blob/main/img/message_screen.png?raw=true)

## Features
- User-friendly interface for inputting queries and receiving responses.
- Integration with IBM Watson Discovery and Assistant for accurate and relevant answers.
- Self-learning aspect through user ratings of chatbot answers.
- Auto-update function to keep the chatbot updated with the latest information from the IBM documentation repository.

## File Structure
The project files are organized as follows:

- `server.js`: Main entry point of the chatbot.
- `updater.js`: Script for periodically checking the IBM documentation repository for updates.
- `uploader.js`: Script for parsing and uploading new information to Watson Discovery.
- `docs/`: Folder containing project documentation.
- `docs/api/`: API documentation.
- `docs/code/`: Documentation and source code for major files.

For a visual representation of the file structure, refer to Figure 3 in the ![user manual](https://github.com/ArijusLengvenis/ibm-chatbot/main/docs/user_manual.pdf).

![Flowchart diagram](https://github.com/ArijusLengvenis/ibm-chatbot/blob/main/img/flowchart.png?raw=true)

## Usage
Please refer to the ![user manual](https://github.com/ArijusLengvenis/ibm-chatbot/main/docs/user_manual.pdf) for detailed instructions on using the chatbot and understanding its functionality. The manual provides step-by-step guidance on interacting with the chatbot, utilizing its features, the API documentation, testing, maintenance details, possible future work and more.

## Testing

After the setup, run tests to verify that everything is fully operational. These tests include:

- Unit tests for basic functions
- System integration tests that examine the entire chatbot

both of which are run when running the command:

`npm test`

Additionally, we recommend running stress tests to evaluate how the chatbot functions under heavy load. 

## Acknowledgements
We would like to express our gratitude to IBM for providing the Watson Discovery service and the necessary resources for this project. Specifically, [John McNamara](https://www.linkedin.com/in/jonmcnamara/) and [Mark O'Kane](https://www.linkedin.com/in/markokane/) for supervising and guiding the project into fruition.
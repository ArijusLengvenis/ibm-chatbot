let sessionId = null;
let id = 0;
let messages = {};

function sendMessage() {
    const message = document.querySelector('#textBox').value;
    if (!message) return;
    document.querySelector('.chatBox').innerHTML += generateHTML(message);
    id++;


    if (!sessionId) {
        alert("Session not initialized yet, please wait")
        return;
    }

    //isPending = true;
    document.querySelector('#textBox').value = "";
    fetch("/send", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, sessionId: sessionId })
        })
    .then(res => res.json())
    .then(data => {
        if (data.length > 0) {
            data.query = message;
            messages[id]=data;
            document.querySelector('.chatBox').innerHTML += insertAnswerMessage(data);
            id++;
        }
        //isPending = false
    })
    .catch(error => {
        console.error(error);
    })
}

function generateHTML(message){
    return `<div id="message${id}" class="messageDiv messageDivRight">
                <div class="messageBox messageBoxRight">
                    <p class="messageText">${message}</p>
                </div>
                <img class="profilePicture" src="https://cdn2.iconfinder.com/data/icons/instagram-ui/48/jee-74-512.png">
            </div>`
}

function insertAnswerMessage(messages) {
    if (messages.some(message => message.text == "I searched my knowledge base, but did not find anything related to your query.")) {
        return `<div id="message${id}" class="messageDiv messageDivLeft">
                    <div class="messageBox messageBoxLeft">
                        <p class="messageText">${messages[0].text}</p>
                    </div>
                    <img class="profilePicture" src="https://cdn2.iconfinder.com/data/icons/instagram-ui/48/jee-74-512.png">
                </div>`
    }
    if (messages.length == 1){
        return `<div id="message${id}" class="messageDiv messageDivLeft">
                    <img class="profilePicture" src="https://media.istockphoto.com/vectors/chat-bot-ai-and-customer-service-support-concept-vector-flat-person-vector-id1221348467?k=20&m=1221348467&s=612x612&w=0&h=hp8h8MuGL7Ay-mxkmIKUsk3RY4O69MuiWjznS_7cCBw=">
                    <div class="messageBox messageBoxLeft">
                        <p class="messageText">Here is what I found:</p>
                        <p class="messageText">${messages[0].text}</p>
                        <button id="p${messages[0].id}" onclick="rateAnswer(${id}, ${0}, ${true})">Thumbs Up</button>
                        <button id="n${messages[0].id}" onclick="rateAnswer(${id}, ${0}, ${false})">Thumbs Down</button>
                    </div>
                </div>`
    }
    else if (messages.length == 2) {
        return `<div id="message${id}" class="messageDiv messageDivLeft">
                    <img class="profilePicture" src="https://media.istockphoto.com/vectors/chat-bot-ai-and-customer-service-support-concept-vector-flat-person-vector-id1221348467?k=20&m=1221348467&s=612x612&w=0&h=hp8h8MuGL7Ay-mxkmIKUsk3RY4O69MuiWjznS_7cCBw=">
                    <div class="messageBox messageBoxLeft">
                        <p class="messageText">Here is what I found:</p>
                        <p class="messageText">${messages[0].text}</p>
                        <button id="p${messages[0].id}" onclick="rateAnswer(${id}, ${0}, ${true})">Thumbs Up</button>
                        <button id="n${messages[0].id}" onclick="rateAnswer(${id}, ${0}, ${false})">Thumbs Down</button>
                        <p class="messageText">This is something similar that I found:</p>
                        <p class="messageText">${messages[1].text}</p>
                        <button id="p${messages[1].id}" onclick="rateAnswer(${id}, ${1}, ${true})">Thumbs Up</button>
                        <button id="n${messages[1].id}" onclick="rateAnswer(${id}, ${1}, ${false})">Thumbs Down</button>
                    </div>
                </div>`
    }
    
    return `<div id="message${id}" class="messageDiv messageDivLeft">
                <img class="profilePicture" src="https://media.istockphoto.com/vectors/chat-bot-ai-and-customer-service-support-concept-vector-flat-person-vector-id1221348467?k=20&m=1221348467&s=612x612&w=0&h=hp8h8MuGL7Ay-mxkmIKUsk3RY4O69MuiWjznS_7cCBw=">
                <div class="messageBox messageBoxLeft">
                    <p class="messageText">Here is what I found:</p>
                    <p class="messageText">${messages[0].text}</p>
                    <button id="p${messages[0].id}" onclick="rateAnswer(${id}, ${0}, ${true})">Thumbs Up</button>
                    <button id="n${messages[0].id}" onclick="rateAnswer(${id}, ${0}, ${false})">Thumbs Down</button>
                    <p class="messageText">This is something similar that I found:</p>
                    <p class="messageText">${messages[1].text}</p>
                    <button id="p${messages[1].id}" onclick="rateAnswer(${id}, ${1}, ${true})">Thumbs Up</button>
                    <button id="n${messages[1].id}" onclick="rateAnswer(${id}, ${1}, ${false})">Thumbs Down</button>
                    <button id="loadMore" onclick="loadMore(${id})">Load More</button>
                </div>
            </div>`
}

function loadMore(messageId) {
    const messagesHere = messages[messageId].slice(2);
    let messageDiv = document.querySelector(`#message${messageId}`).querySelector('.messageBox');
    messageDiv.removeChild(messageDiv.querySelector('#loadMore'));
    document.querySelector(`#message${messageId}`).removeChild(document.querySelector(`#message${messageId}`).querySelector('img'));
    let id = 2;
    messageDiv.innerHTML += '<p class="messageText">Additional answers:</p>'
    messagesHere.forEach(message => {
        messageDiv.innerHTML += `<p class="messageText">${message.text}</p>
                                 <button id="p${message.id}" onclick="rateAnswer(${messageId}, ${id}, ${true})">Thumbs Up</button>
                                 <button id="n${message.id}" onclick="rateAnswer(${messageId}, ${id}, ${false})">Thumbs Down</button>`;
        id++;
    })
    document.querySelector(`#message${messageId}`).innerHTML += `<img class="profilePicture" src="https://cdn2.iconfinder.com/data/icons/instagram-ui/48/jee-74-512.png"></img>`;   
}

function rateAnswer(messageId, answerId, gradient) {
    const message = messages[messageId][answerId];
    fetch("/rate", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: messages[messageId].query,
                documentId: message.id,
                relevant: gradient
            })
        })
        .then(res => res.json())
        .then((data) => {
            console.log('Rated ',data);
            let messageDiv = document.querySelector(`#message${messageId}`).querySelector('.messageBox');
            messageDiv.removeChild(messageDiv.querySelector(`#p${message.id}`));
            let feedback = document.createElement('P');
            let feedbackText = document.createTextNode('Thank you for your answer');
            feedback.appendChild(feedbackText);
            console.log(feedback);
            messageDiv.replaceChild(feedback, messageDiv.querySelector(`#n${message.id}`));
        })
        .catch(error => {
            console.error(error);
        })
}

function initChatbotSession() {
    fetch("/createsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
        sessionId = data.session_id
    })
    .catch(err => {
        console.error(err)
    })
}

const chatbot = document.querySelector('.submitDiv');
chatbot.addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.querySelector('.submitButton').click();
    }
});
initChatbotSession()
let sessionId = null;
let id = 0;
let messages = {};

function sendMessage() {
    const message = document.querySelector('#textBox').value;
    if (!message) return;
    document.querySelector('.chatBox').appendChild(generateUserMessageBlock(message));
    id++;

    if (!sessionId) {
        alert("Session not initialized yet, please wait")
        return;
    }

    let submitButton = document.querySelector('#submit');
    submitButton.setAttribute('disabled', "true");

    let chatBox = document.querySelector('.chatBox');
    chatBox.appendChild(chatbotSays('...'));

    document.querySelector('#textBox').value = "";
    fetch("/send", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, sessionId: sessionId })
        })
    .then(res => res.json())
    .then(data => {
        submitButton.removeAttribute('disabled');
        if (data.length > 0) {
            data = urlProcessing(data);
            data.query = message;
            messages[id]=data;
            if (data[0].id) {
                chatBox.replaceChild(generateChatbotMessageBlock(data), chatBox.querySelector(`#message${id}`));
            } else {
                chatBox.replaceChild(chatbotSays(data[0].text), chatBox.querySelector(`#message${id}`));
            }
            id++;
        }
    })
    .catch(error => {
        submitButton.removeAttribute('disabled');
        console.error(error);
    })
}

// Replace URL strings with anchor elements
// Argument is the data array, containing output data fetched from the back-end
function urlProcessing(data) {
    const URLR = 'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)'
    data.forEach((message, i) => {
        let urlMatches = message.text.match(URLR);
        if (urlMatches !== null){
            urlMatches.forEach(url => {
                data[i].text.replace(url, `<a href="${url}">${url}<a>`);
            })
        }
    })
    return data;
}

// Control expansion size of input area to match user input length
const box = document.getElementById('textBox');
box.addEventListener("input", textResize, false);
function textResize() {
    box.style.height = "5vh";
    box.style.height = (box.scrollHeight) + "px";
}

// Generate message window for Chatbot's response (left side of chat)
function generateChatbotMessageBlock(messages) {

    // Outer message wrapper
    let messageDiv = document.createElement('div');
    messageDiv.setAttribute('id', `message${id}`);
    messageDiv.setAttribute('class', 'messageDiv messageDivLeft');

    // Profile image
    let profileImg = document.createElement('img');
    profileImg.setAttribute('class', 'profilePicture');
    profileImg.setAttribute('src', 'https://media.istockphoto.com/vectors/chat-bot-ai-and-customer-service-support-concept-vector-flat-person-vector-id1221348467?k=20&m=1221348467&s=612x612&w=0&h=hp8h8MuGL7Ay-mxkmIKUsk3RY4O69MuiWjznS_7cCBw=');
    messageDiv.appendChild(profileImg);

    // Container, which contains each answer along with ratings
    let messageBox = document.createElement('div');
    messageBox.setAttribute('class', 'messageBox messageBoxLeft');

    // Extract first 2 messages
    let showMessages = [];
    if (messages.length > 2) {
        showMessages = messages.slice(0,2);
    }
    else {
        showMessages = messages;
    }

    // Cycle through each message
    showMessages.forEach((message, i) => {
        let messageWrapper = document.createElement('div');
        messageWrapper.setAttribute('class', 'messageBackgroundDiv');

        // First message intro
        if (i == 0 && message !== "I searched my knowledge base, but did not find anything related to your query.") {
            let introMessage = document.createElement('p');
            introMessage.setAttribute('class', 'messageText');
            introMessage.innerText = 'Here is what I found:';
            messageBox.appendChild(introMessage);
        }

        // Second message intro
        if (i == 1) {
            let introMessage = document.createElement('p');
            introMessage.setAttribute('class', 'messageText');
            introMessage.innerText = 'Here is something similar that I found:';
            messageBox.appendChild(introMessage);
        }

        // Message text container
        let messageText = document.createElement('p');
        messageText.setAttribute('class', 'messageText');
        messageText.innerHTML = message.text;
        messageWrapper.appendChild(messageText);
        if (message.text !== "I searched my knowledge base, but did not find anything related to your query.") {

            // Ratings container
            let ratingsDiv = document.createElement('div');
            ratingsDiv.setAttribute('id', `ratingId${i}`)
            let thumbsUp = document.createElement('button');
            thumbsUp.setAttribute('class', 'thumb-button fas fa-thumbs-up');
            thumbsUp.setAttribute('id', `p${message.id}`);
            thumbsUp.setAttribute('onClick', `rateAnswer(${id}, ${i}, ${true})`);
            let thumbsDown = document.createElement('button');
            thumbsDown.setAttribute('class', 'thumb-button fas fa-thumbs-down');
            thumbsDown.setAttribute('id', `p${message.id}`);
            thumbsDown.setAttribute('onClick', `rateAnswer(${id}, ${i}, ${false})`);
            ratingsDiv.appendChild(thumbsUp);
            ratingsDiv.appendChild(thumbsDown);
            messageWrapper.appendChild(ratingsDiv);
        }
        messageBox.appendChild(messageWrapper);
    });

    if (showMessages[0].text !== "I searched my knowledge base, but did not find anything related to your query." && messages.length > 2) {

        // "Show More" button
        let showMore = document.createElement('button');
        showMore.setAttribute('class', 'load-more-button');
        showMore.setAttribute('id', 'loadMore');
        showMore.setAttribute('onClick', `loadMore(${id})`);
        showMore.innerText = 'Load More';
        messageBox.appendChild(showMore);
    }
    messageDiv.appendChild(messageBox);
    return messageDiv
}

// Generate message window for user's question (right side of chat)
function generateUserMessageBlock(message){

    // Outer message wrapper
    let messageDiv = document.createElement('div');
    messageDiv.setAttribute('id', `message${id}`);
    messageDiv.setAttribute('class', 'messageDiv messageDivRight');

    // Container, which contains each answer
    let messageBox = document.createElement('div');
    messageBox.setAttribute('class', 'messageBox messageBoxRight');

    // Message text container
    let messageText = document.createElement('p');
    messageText.setAttribute('class', 'messageText');
    messageText.innerHTML = message;
    messageBox.appendChild(messageText);
    messageDiv.appendChild(messageBox);

    // Profile image
    let profileImg = document.createElement('img');
    profileImg.setAttribute('class', 'profilePicture');
    profileImg.setAttribute('src', 'https://cdn2.iconfinder.com/data/icons/instagram-ui/48/jee-74-512.png');
    messageDiv.appendChild(profileImg);
    return messageDiv
}

// Function to load remaining messages (after pressing "Load More")
function loadMore(messageId) {

    // Extract remaining messages
    const messagesHere = messages[messageId].slice(2);
    let messageBox = document.querySelector(`#message${messageId}`).querySelector('.messageBox');
    messageBox.removeChild(messageBox.querySelector('#loadMore'));

    // Cycle through each message
    messagesHere.forEach((message, i) => {

        let messageWrapper = document.createElement('div')
        messageWrapper.setAttribute('class', 'messageBackgroundDiv')
        // Extra message intro
        if (i == 0) {
            let introMessage = document.createElement('p');
            introMessage.setAttribute('class', 'messageText');
            introMessage.innerText = 'Additional answers:';
            messageBox.appendChild(introMessage);
        }

        // Message text container
        let messageText = document.createElement('p');
        messageText.setAttribute('class', 'messageText');
        messageText.innerHTML = message.text;
        messageWrapper.appendChild(messageText);

        // Ratings container
        let ratingsDiv = document.createElement('div');
        ratingsDiv.setAttribute('id', `ratingId${i+2}`)
        let thumbsUp = document.createElement('button');
        thumbsUp.setAttribute('class', 'thumb-button fas fa-thumbs-up');
        thumbsUp.setAttribute('id', `p${message.id}`);
        thumbsUp.setAttribute('onClick', `rateAnswer(${messageId}, ${i+2}, ${true})`);
        let thumbsDown = document.createElement('button');
        thumbsDown.setAttribute('class', 'thumb-button fas fa-thumbs-down');
        thumbsDown.setAttribute('id', `p${message.id}`);
        thumbsDown.setAttribute('onClick', `rateAnswer(${messageId}, ${i+2}, ${false})`);
        ratingsDiv.appendChild(thumbsUp);
        ratingsDiv.appendChild(thumbsDown);
        messageWrapper.appendChild(ratingsDiv);

        messageBox.appendChild(messageWrapper)
    })
}

// Rate answer function (once thumbs up/down is clicked)
function rateAnswer(messageId, answerId, relevant) {

    // Extract specific answer which was rated
    let message = messages[messageId][answerId];
    // console.log(message)

    let messageDiv = document.querySelector(`#message${messageId} #ratingId${answerId}`);
    let thumbsUp = messageDiv.querySelector('.fa-thumbs-up')
    let thumbsDown = messageDiv.querySelector('.fa-thumbs-down')
    if (relevant) {
        // Thumbs up
        // Add class to show activation
        if (thumbsUp.classList.contains('greeniconcolor'))
        {
            thumbsUp.classList.remove('greeniconcolor');
            message.relevant = null;
            relevant = null;
        }
        else
        {
            thumbsUp.classList.add('greeniconcolor');
        }        
        thumbsDown.classList.remove('rediconcolor');

    }
    else {
        // Thumbs down
        // Add class to show activation
        if (thumbsDown.classList.contains('rediconcolor'))
        {
            thumbsDown.classList.remove('rediconcolor');
            message.relevant = null;
            relevant = null;
        }
        else
        {
            thumbsDown.classList.add('rediconcolor');
        }        
        thumbsUp.classList.remove('greeniconcolor');
    }
    if (message.oldRelevant === undefined)
        message.oldRelevant = null;
    console.log(message.oldRelevant, relevant)
    fetch("/rate", {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query: messages[messageId].query,
                documentId: message.id,
                relevant: relevant,
                oldRelevant: message.oldRelevant
            })
        })
        .then(() => {
            messages[messageId][answerId].oldRelevant = relevant;
        })
        .catch(error => {
            console.error(error);
        })
}

function chatbotSays(message) {
    // Outer message wrapper
    let messageDiv = document.createElement('div');
    messageDiv.setAttribute('id', `message${id}`);
    messageDiv.setAttribute('class', 'messageDiv messageDivLeft');

    // Profile image
    let profileImg = document.createElement('img');
    profileImg.setAttribute('class', 'profilePicture');
    profileImg.setAttribute('src', 'https://media.istockphoto.com/vectors/chat-bot-ai-and-customer-service-support-concept-vector-flat-person-vector-id1221348467?k=20&m=1221348467&s=612x612&w=0&h=hp8h8MuGL7Ay-mxkmIKUsk3RY4O69MuiWjznS_7cCBw=');
    messageDiv.appendChild(profileImg);

    // Container, which contains each answer
    let messageBox = document.createElement('div');
    messageBox.setAttribute('class', 'messageBox messageBoxLeft');

    // Message text container
    let messageText = document.createElement('p');
    messageText.setAttribute('class', 'messageText');
    messageText.innerHTML = message;
    messageBox.appendChild(messageText);
    messageDiv.appendChild(messageBox);
    return messageDiv
}

function initChatbotSession() {
    let chatBox = document.querySelector('.chatBox');
    chatBox.appendChild(chatbotSays('...'))

    fetch("/createsession", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
        sessionId = data.session_id
        chatBox.replaceChild(chatbotSays("Hi I'm IBM's Chatbot, here to answer any of your questions about IBM Cloud and Cloud for Finance!"), chatBox.querySelector(`#message${id}`))
        id++;
    })
    .catch(err => {
        console.error(err)
        chatBox.replaceChild(chatbotSays("Sorry, an error occured while connecting to IBM. Try refreshing the page or contacting support!"), chatBox.querySelector(`#message${id}`))
        id++;
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
const url = 'http://localhost:8081/send';
let sessionId = null;

function sendMessage() {
    const message = document.querySelector('#textBox').value;
    if (!message) return;
    document.querySelector('.chatBox').innerHTML += generateHTML(message, 'right');

    if (!sessionId) {
        alert("Session not initialized yet, please wait")
        return;
    }

    //isPending = true;
    console.log(JSON.stringify(message))
    document.querySelector('#textBox').value = "";
    fetch(url, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, sessionId: sessionId })
        })
    .then(res => res.json())
    .then(data => {
        //RETURNED WATSON ASSISTANT ANSWER
        /*
            The answer (data) returned is an array (max size of 5, but could vary) of objects containing
            The header, text, document url and confidence metrics.

            Current plan of implementation:
            * Display top 2 answers with the Bot explaining "Is this what you wanted" or
                "This is something else I found.." along with the heading and answer.
            * Hiding the rest behind a "Reveal more" button. 
                Once pressed the button will reveal the next (up to 3) most confident answers. 
            * If a message is clicked, it takes the user to the full document of the particular answer.
            * While the chatbot was "thinking" it would display a loading signal of some kind
                (isPending stands for the variable which controls this signal)
        */
        if (data.length > 0) {
            document.querySelector('.chatBox').innerHTML += generateHTML(data[0].text, 'left');
        }
        //isPending = false
    })
    .catch(error => {
        console.error('Error: ',error);
    })
}

function generateHTML(message, leftRight){
    if (leftRight === 'left'){
        return `<div class="messageDiv messageDivLeft">
                    <img class="profilePicture" src="https://media.istockphoto.com/vectors/chat-bot-ai-and-customer-service-support-concept-vector-flat-person-vector-id1221348467?k=20&m=1221348467&s=612x612&w=0&h=hp8h8MuGL7Ay-mxkmIKUsk3RY4O69MuiWjznS_7cCBw=">
                    <div class="messageBox messageBoxLeft">
                        <p class="messageText">${message}</p>
                    </div>
                </div>`
    } else if (leftRight === 'right'){
        return `<div class="messageDiv messageDivRight">
                    <div class="messageBox messageBoxRight">
                        <p class="messageText">${message}</p>
                    </div>
                    <img class="profilePicture" src="https://cdn2.iconfinder.com/data/icons/instagram-ui/48/jee-74-512.png">
                </div>`
    }

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
        console.log('click')
    }
});
initChatbotSession()
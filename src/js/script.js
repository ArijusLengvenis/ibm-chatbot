const url = 'http://localhost:8081/send';
let sessionId = null;

function sendMessage() {
    const message = document.querySelector('#textBox').value;
    if (!message) return;
    document.querySelector('.chatBox').innerHTML += `<div class="messageDiv messageDivRight">
        <div class="messageBox">
            <p class="messageText">${message}</p>
        </div>
    </div>`;

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
            document.querySelector('.chatBox').innerHTML += `<div class="messageDiv messageDivLeft">
            <div class="messageBox">
                <p class="messageText">${data[0].text}</p>
            </div>
        </div>`;
        }
        //isPending = false
    })
    .catch(error => {
        console.error('Error: ',error);
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

const chatbot = document.querySelector('.chatBox');
chatbot.addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.querySelector('.submitButton').click();
    }
});
initChatbotSession()
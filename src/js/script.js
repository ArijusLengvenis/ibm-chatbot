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

const chatbot = document.querySelector('.generalBox');
chatbot.addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.querySelector('.submitButton').click();
    }
});
initChatbotSession()
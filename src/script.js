const url = 'http://localhost:8081/send';
function sendMessage() {
    const message = document.querySelector('#textBox').value;
    document.querySelector('.chatBox').innerHTML += `<div class="messageDiv messageDivRight">
    <div class="messageBox">
        <p class="messageText">${message}</p>
    </div>
</div>`;
    if (message) {
        //isPending = true;
        console.log(JSON.stringify(message))
        document.querySelector('#textBox').value = "";
        fetch(url, {
            method: 'POST',
            headers: { "Content-Type": "application/json",
        "Header1": "H1"},
            body: JSON.stringify({ message: message })
          })
        .then(res => res.json())
        .then(data => {
            console.log(data)
            document.querySelector('.chatBox').innerHTML += `<div class="messageDiv messageDivLeft">
            <div class="messageBox">
                <p class="messageText">${data.message}</p>
            </div>
        </div>`;
            //isPending = false
        })
        .catch(error => {
            console.error('Error: ',error);
        })
    }
}

const chatbot = document.querySelector('.generalBox');
chatbot.addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.querySelector('.submitButton').click();
    }
});
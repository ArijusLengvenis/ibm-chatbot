const url = 'http://localhost:8081/send';
function sendMessage() {
    const message = document.querySelector('#sendMessage').value;
    document.querySelector('#textWindow').innerHTML += `<div class="message">${message}</div>`;
    if (message) {
        //isPending = true;
        console.log(JSON.stringify(message))
        document.querySelector('#sendMessage').value = "";
        fetch(url, {
            method: 'POST',
            headers: { "Content-Type": "application/json",
        "Header1": "H1"},
            body: JSON.stringify({ message: message })
          })
        .then(res => res.json())
        .then(data => {
            console.log(data)
            document.querySelector('#textWindow').innerHTML += `<div class="message">${data.message}</div>`;
            //isPending = false
        })
        .catch(error => {
            console.error('Error: ',error);
        })
    }
}

const chatbot = document.querySelector('.chatbot-body');
chatbot.addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.querySelector('#sendMessageButton').click();
    }
});
function sendMessage() {
    let message = document.querySelector('#sendMessage').value;
    if (message) {
        document.querySelector('#textWindow').innerHTML += `<div class="message">${message}</div>`;
        document.querySelector('#sendMessage').value = "";
    }
}

const chatbot = document.querySelector('.chatbot-body');
chatbot.addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.querySelector('#sendMessageButton').click();
    }
});
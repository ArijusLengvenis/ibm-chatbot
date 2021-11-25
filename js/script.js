const url = '/send';
function sendMessage() {
    let message = document.querySelector('#sendMessage').value;
    document.querySelector('#textWindow').innerHTML += `<div class="message">${message}</div>`;
    if (message) {
        //isPending = true;
        document.querySelector('#sendMessage').value = "";
        // fetch(url)
        // .then(res => {
        //     if (!res.ok) {
        //         throw Error('Could not fetch the data for this message')
        //     }
        // })
        // .then(data => {
        //     document.querySelector('#textWindow').innerHTML += `<div class="message">${data}</div>`;
        //     //isPending = false
        // })
    }
}

const chatbot = document.querySelector('.chatbot-body');
chatbot.addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        document.querySelector('#sendMessageButton').click();
    }
});
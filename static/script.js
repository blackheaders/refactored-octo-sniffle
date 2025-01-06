const baseURL = "http://node216405-metaverse.cloudjiffy.net:11068";
let userID = localStorage.getItem("ethinext_user_id");

if (!userID) {
    userID = generateUUID();
    localStorage.setItem("ethinext_user_id", userID);
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function continueChatSession() {
    if (!userID) {
        userID = generateUUID();
        localStorage.setItem("ethinext_user_id", userID);
    }
    showChatInterface();
}

function startNewChat() {
    userID = generateUUID();
    localStorage.setItem("ethinext_user_id", userID);
    showChatInterface();
}

function showChatInterface() {
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'block';
    // Add initial bot message
    addMessage('Hello, My Name is Miss EthiNext. Please feel free to ask me if you have any questions on Ethinext Products!', 'bot');
}

function createMessageElement(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = type === 'bot' ? 'E' : 'U';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message;

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
}

function addMessage(message, type) {
    const chatContainer = document.getElementById('chat-container');
    const messageElement = createMessageElement(message, type);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function askQuestion() {
    const input = document.getElementById('question-input');
    const question = input.value.trim();
    
    if (!question) return;

    // Add user message
    addMessage(question, 'user');
    input.value = '';

    try {
        const response = await fetch(`${baseURL}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userID,
                question: question
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            addMessage(data.data.text, 'bot');
        } else {
            addMessage('Sorry, I encountered an error processing your request.', 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('Sorry, I encountered an error processing your request.', 'bot');
    }
}

// Handle enter key in input
document.getElementById('question-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        askQuestion();
    }
});

// Voice input functionality
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

async function toggleVoiceInput() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await sendAudioToServer(audioBlob);
                audioChunks = [];
            };

            mediaRecorder.start();
            isRecording = true;
            document.querySelector('.voice-btn').style.background = '#ff4444';
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        document.querySelector('.voice-btn').style.background = '#4DC1C1';
    }
}

async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob);

    try {
        const response = await fetch(`${baseURL}/speech_to_text`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('question-input').value = data.text;
        } else {
            console.error('Speech to text error:', data.error);
        }
    } catch (error) {
        console.error('Error sending audio:', error);
    }
}
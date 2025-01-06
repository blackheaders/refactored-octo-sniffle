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

function addMessage(message, type, audioFilename = null) {
    const chatContainer = document.getElementById('chat-container');
    const messageElement = createMessageElement(message, type);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // If there's an audio file, play it
    if (type === 'bot' && audioFilename) {
        const audio = new Audio(`${baseURL}/audio/${audioFilename}`);
        audio.play().catch(error => {
            console.error('Error playing audio:', error);
        });
    }
}

async function askQuestion(question = null) {
    const input = document.getElementById('question-input');
    const userQuestion = question || input.value.trim();

    if (!userQuestion) return;

    // Add user message
    addMessage(userQuestion, 'user');
    if (!question) input.value = '';

    try {
        const response = await fetch(`${baseURL}/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userID,
                question: userQuestion
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            const aiResponse = data.data;
            addMessage(aiResponse.text, 'bot', aiResponse.audio);
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

// Voice input functionality with manual start/stop
let mediaRecorder = null;
let audioChunks = [];
const voiceBtn = document.getElementById('voice-btn');

// Update voice button event listener
voiceBtn.addEventListener('click', toggleVoiceInput);

function toggleVoiceInput() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        // Stop recording
        mediaRecorder.stop();
    } else {
        // Start recording
        startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstart = () => {
            // Update UI to show recording state
            voiceBtn.classList.add('recording');
            // Optionally, change the icon to indicate recording
            voiceBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3" fill="white"/>
                    <path d="M19 10V14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 10V14" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        };

        mediaRecorder.onstop = async () => {
            // Update UI to show not recording
            voiceBtn.classList.remove('recording');
            // Revert the icon back to microphone
            voiceBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1C11.2044 1 10.4413 1.31607 9.87868 1.87868C9.31607 2.44129 9 3.20435 9 4V12C9 12.7956 9.31607 13.5587 9.87868 14.1213C10.4413 14.6839 11.2044 15 12 15C12.7956 15 13.5587 14.6839 14.1213 14.1213C14.6839 13.5587 15 12.7956 15 12V4C15 3.20435 14.6839 2.44129 14.1213 1.87868C13.5587 1.31607 12.7956 1 12 1Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M19 10V12C19 13.8565 18.2625 15.637 16.9497 16.9497C15.637 18.2625 13.8565 19 12 19C10.1435 19 8.36301 18.2625 7.05025 16.9497C5.7375 15.637 5 13.8565 5 12V10" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;

            // Convert audioChunks to a single Blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendAudioToServer(audioBlob);

            // Stop all tracks to release the microphone
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            mediaRecorder = null;
        };

        mediaRecorder.start();
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access your microphone. Please check your browser settings.');
    }
}

async function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');

    try {
        const response = await fetch(`${baseURL}/speech_to_text`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.status === 'success') {
            const recognizedText = data.text;
            addMessage(`You (voice): ${recognizedText}`, 'user');
            await askQuestion(recognizedText);
        } else {
            console.error('Speech to text error:', data.error);
            addMessage('Sorry, I could not understand your speech. Please try again.', 'bot');
        }
    } catch (error) {
        console.error('Error sending audio:', error);
        addMessage('Sorry, I encountered an error processing your speech.', 'bot');
    }
}

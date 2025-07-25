// Lottie animation loader (optional)
function loadLottieAnimation() {
  const container = document.getElementById('character-container');
  if (window.lottie) {
    window.lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: 'lottie/character.json', // Place your Lottie file here
    });
  } else {
    // fallback: simple emoji or static image
    container.innerHTML = '<div style="font-size:100px;">😊</div>';
  }
}

// Chat bubble rendering
function addChatBubble(text, sender = 'bot') {
  const chatContainer = document.getElementById('chat-container');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ' + sender;
  bubble.textContent = text;
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

let inactivityTimer = null;
const inactivityPrompts = [
  "I'm here if you want to talk! Can you tell me something you like?",
  "It's okay to take your time. When you're ready, you can say anything!",
  "Would you like to play a game or see a picture? Just say something!",
  "I'm listening! You can tell me anything you want."
];

let isBotSpeaking = false;

function startInactivityTimer() {
  clearInactivityTimer();
  inactivityTimer = setTimeout(() => {
    if (!isBotSpeaking) {
      const prompt = inactivityPrompts[Math.floor(Math.random() * inactivityPrompts.length)];
      addChatBubble(prompt, 'bot');
      speakText(prompt);
      // Timer will be restarted after bot finishes speaking
    }
  }, 60000); // 1 minute
}

function clearInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

// Update botIntro and botRespond to start inactivity timer after bot speaks
function botIntro() {
  const intro = "Hello! I'm your friendly chat buddy. Let's talk and have fun together!";
  addChatBubble(intro, 'bot');
  speakText(intro);
  startInactivityTimer();
}

// Override speakText to handle isBotSpeaking and timer
function speakText(text) {
  if ('speechSynthesis' in window) {
    isBotSpeaking = true;
    clearInactivityTimer();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.8; // slower pace
    utter.pitch = 1.2;
    utter.lang = 'en-US';
    utter.onend = () => {
      isBotSpeaking = false;
      startInactivityTimer();
    };
    window.speechSynthesis.speak(utter);
  }
}

// --- Voice Input (Speech Recognition) ---
let recognition;
let recognizing = false;

function setupSpeechRecognition() {
  const micIndicator = document.getElementById('mic-indicator');
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    micIndicator.title = 'Speech recognition not supported.';
    micIndicator.style.background = '#ccc';
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    recognizing = true;
    micIndicator.classList.add('listening');
    micIndicator.title = 'Listening...';
  };
  recognition.onend = () => {
    recognizing = false;
    micIndicator.classList.remove('listening');
    micIndicator.title = 'Click to restart listening';
    if (!recognizing) setTimeout(() => recognition.start(), 500);
  };
  recognition.onerror = (event) => {
    micIndicator.classList.remove('listening');
    micIndicator.title = 'Error: ' + event.error;
    if (!recognizing) setTimeout(() => recognition.start(), 1000);
  };
  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        stopBotSpeech();
        const userText = event.results[i][0].transcript.trim();
        addChatBubble(userText, 'user');
        clearInactivityTimer();
        botRespond(userText);
      }
    }
  };
  recognition.start();
}

const NIM_API_ENDPOINT = "http://localhost:3001/api/chat";

async function getAIResponse(userText) {
  const payload = {
    model: "meta/llama-4-maverick-17b-128e-instruct",
    messages: [
      {
        role: "system",
        content: "You are a friendly, slow-paced, encouraging chatbot for autistic children under 7. Use simple language, positive reinforcement, and always encourage the child to speak more."
      },
      {
        role: "user",
        content: userText
      }
    ],
    max_tokens: 512,
    temperature: 1.0,
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    stream: false
  };
  try {
    const response = await fetch(NIM_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + NIM_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data.choices && data.choices[0] && data.choices[0].message.content
      ? data.choices[0].message.content
      : "I'm here to listen! Can you tell me more?";
  } catch (error) {
    console.error("NVIDIA API error:", error);
    return "Sorry, I couldn't understand. Can you say that again?";
  }
}

let gameActive = { type: null, state: null };
const animalList = ['cat', 'dog', 'rabbit', 'elephant', 'lion'];

const imageGameList = [
  { src: 'assets/images/cat.png', answer: 'cat' },
  { src: 'assets/images/apples.jpeg', answer: 'apple' },
  { src: 'assets/images/car.jpg', answer: 'car' },
  { src: 'assets/images/dog.jpg', answer: 'dog' },
  { src: 'assets/images/banana.png', answer: 'banana' }
];

// Add "I Want Game" items
const iWantItems = [
  "apple", "banana", "food", "dog", "cat", "toy", "book", "cookie", "ball"
];

function showGameMenu() {
  addChatBubble("Which game do you want to play? 1. Number Guessing 2. Animal Guessing 3. Image Guessing 4. I Want Game. Say the game name or number!", 'bot');
  speakText("Which game do you want to play? Number guessing, animal guessing, image guessing, or I Want game? Say the game name or number!");
  gameActive = { type: 'menu', state: null };
}

function startNumberGame() {
  gameActive = { type: 'number', state: { answer: Math.floor(Math.random() * 5) + 1 } };
  addChatBubble("Let's play Number Guessing! I'm thinking of a number between 1 and 5. Can you guess what it is?", 'bot');
  speakText("Let's play Number Guessing! I'm thinking of a number between 1 and 5. Can you guess what it is?");
}

function handleNumberGameGuess(userText) {
  const guess = parseInt(userText, 10);
  if (!isNaN(guess) && guess >= 1 && guess <= 5) {
    if (guess === gameActive.state.answer) {
      playYaySound();
      addChatBubble("Wow! You guessed it right! 🎉 Do you want to play again? Say 'play'!", 'bot');
      speakText("Wow! You guessed it right! Do you want to play again? Say play!");
      gameActive = { type: null, state: null };
    } else {
      addChatBubble("Not quite! Try again. Guess a number between 1 and 5.", 'bot');
      speakText("Not quite! Try again. Guess a number between 1 and 5.");
    }
  } else {
    addChatBubble("Please guess a number between 1 and 5.", 'bot');
    speakText("Please guess a number between 1 and 5.");
  }
}

function startAnimalGame() {
  const answer = animalList[Math.floor(Math.random() * animalList.length)];
  gameActive = { type: 'animal', state: { answer, tries: 0 } };
  addChatBubble("Let's play Animal Guessing! I'm thinking of an animal. Can you guess which one? (cat, dog, rabbit, elephant, lion)", 'bot');
  speakText("Let's play Animal Guessing! I'm thinking of an animal. Can you guess which one? Cat, dog, rabbit, elephant, or lion?");
}

function handleAnimalGameGuess(userText) {
  const guess = userText.trim().toLowerCase();
  gameActive.state.tries++;
  if (animalList.includes(guess)) {
    if (guess === gameActive.state.answer) {
      playYaySound();
      addChatBubble(`Amazing! You guessed it right! It was '${gameActive.state.answer}'. 🎉 Do you want to play again? Say 'play'!`, 'bot');
      speakText(`Amazing! You guessed it right! It was ${gameActive.state.answer}. Do you want to play again? Say play!`);
      gameActive = { type: null, state: null };
    } else {
      addChatBubble("Not quite! Try again. Guess an animal: cat, dog, rabbit, elephant, or lion.", 'bot');
      speakText("Not quite! Try again. Guess an animal: cat, dog, rabbit, elephant, or lion.");
    }
  } else {
    addChatBubble("Please guess one of these animals: cat, dog, rabbit, elephant, or lion.", 'bot');
    speakText("Please guess one of these animals: cat, dog, rabbit, elephant, or lion.");
  }
}

function startImageGame() {
  const idx = Math.floor(Math.random() * imageGameList.length);
  const imageObj = imageGameList[idx];
  gameActive = { type: 'image', state: { answer: imageObj.answer, src: imageObj.src } };
  addImageChatBubble(imageObj.src, "What is this a picture of?");
  speakText("What is this a picture of?");
}

function addImageChatBubble(imgSrc, caption) {
  const chatContainer = document.getElementById('chat-container');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble bot';
  bubble.innerHTML = `<img src="${imgSrc}" alt="Guess the image" style="max-width:100px; max-height:100px; display:block; margin-bottom:8px;" /><div>${caption}</div>`;
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleImageGameGuess(userText) {
  const guess = userText.trim().toLowerCase();
  if (guess === gameActive.state.answer) {
    playYaySound();
    addChatBubble(`Great job! You guessed it right! It was a ${gameActive.state.answer}. 🎉 Do you want to play again? Say 'play'!`, 'bot');
    speakText(`Great job! You guessed it right! It was a ${gameActive.state.answer}. Do you want to play again? Say play!`);
    gameActive = { type: null, state: null };
  } else {
    addChatBubble("Not quite! Try again. What is this a picture of?", 'bot');
    speakText("Not quite! Try again. What is this a picture of?");
    // Optionally, show the image again
    addImageChatBubble(gameActive.state.src, "What is this a picture of?");
  }
}

function startIWantGame() {
  const idx = Math.floor(Math.random() * iWantItems.length);
  const item = iWantItems[idx];
  gameActive = { type: 'iwant', state: { item, tries: 0 } };
  addChatBubble(`Let's play the "I Want" game! Can you say: "I want a ${item}."?`, 'bot');
  speakText(`Let's play the I Want game! Can you say: I want a ${item}?`);
}

function handleIWantGameGuess(userText) {
  gameActive.state.tries++;
  const expected = `i want a ${gameActive.state.item}`;
  const expectedAlt = `i want ${gameActive.state.item}`;
  const guess = userText.trim().toLowerCase();
  if (guess.includes(expected) || guess.includes(expectedAlt)) {
    playYaySound();
    addChatBubble(`Great job! You said it! 🎉 Want to play again? Say 'play'!`, 'bot');
    speakText(`Great job! You said it! Want to play again? Say play!`);
    gameActive = { type: null, state: null };
  } else if (guess.startsWith("i want")) {
    addChatBubble(`Almost! Try saying: "I want a ${gameActive.state.item}."`, 'bot');
    speakText(`Almost! Try saying: I want a ${gameActive.state.item}.`);
  } else {
    addChatBubble(`Let's try together! Say: "I want a ${gameActive.state.item}."`, 'bot');
    speakText(`Let's try together! Say: I want a ${gameActive.state.item}.`);
  }
}

// Update botRespond to handle "I Want Game"
async function botRespond(userText) {
  clearInactivityTimer();

  if (/bye\s?bye/i.test(userText)) {
    addChatBubble("Bye bye! See you next time! 👋", 'bot');
    speakText("Bye bye! See you next time!");
    if (recognition && recognizing) recognition.stop();
    return;
  }

  if (gameActive.type === 'number') {
    handleNumberGameGuess(userText);
    return;
  }
  if (gameActive.type === 'animal') {
    handleAnimalGameGuess(userText);
    return;
  }
  if (gameActive.type === 'image') {
    handleImageGameGuess(userText);
    return;
  }
  if (gameActive.type === 'iwant') {
    handleIWantGameGuess(userText);
    return;
  }
  if (gameActive.type === 'menu') {
    if (/\b(1|number)\b/i.test(userText)) {
      startNumberGame();
      return;
    } else if (/\b(2|animal)\b/i.test(userText)) {
      startAnimalGame();
      return;
    } else if (/\b(3|image)\b/i.test(userText)) {
      startImageGame();
      return;
    } else if (/\b(4|iwant|want)\b/i.test(userText)) {
      startIWantGame();
      return;
    } else {
      addChatBubble("Please say 'number', 'animal', 'image', or 'I Want' to choose a game.", 'bot');
      speakText("Please say number, animal, image, or I Want to choose a game.");
      return;
    }
  }
  if (/\bplay|game|games\b/i.test(userText)) {
    showGameMenu();
    return;
  }
  addChatBubble("...", "bot"); // Show thinking bubble
  const chatContainer = document.getElementById('chat-container');
  const thinkingBubble = chatContainer.lastChild;

  const reply = await getAIResponse(userText);

  // Remove thinking bubble and add real reply
  if (thinkingBubble && thinkingBubble.textContent === "...") {
    chatContainer.removeChild(thinkingBubble);
  }
  addChatBubble(reply, 'bot');
  speakText(reply);
  // Timer will be started after bot finishes speaking (handled in speakText)
}

function stopBotSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function playYaySound() {
  const audio = new Audio('assets/sounds/yay.mp3');
  audio.play();
}

// Handle simulated user input
function setupSimInput() {
  const simInput = document.getElementById('sim-input');
  const simSend = document.getElementById('sim-send');
  function sendSimulated() {
    const text = simInput.value.trim();
    if (text) {
      stopBotSpeech();
      addChatBubble(text, 'user');
      clearInactivityTimer();
      botRespond(text);
      simInput.value = '';
    }
  }
  simSend.onclick = sendSimulated;
  simInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendSimulated();
  });
}

// Always display what the child says as a chat bubble (already handled in speech recognition result)
// (No change needed, as addChatBubble(userText, 'user') is already called)

// On page load
window.addEventListener('DOMContentLoaded', () => {
  loadLottieAnimation();
  botIntro();
  setupSpeechRecognition();
  document.getElementById('mic-indicator').onclick = () => {
    if (!recognizing) recognition.start();
  };
  setupSimInput();
});
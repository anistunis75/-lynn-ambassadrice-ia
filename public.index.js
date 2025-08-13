import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const tabLynn = document.getElementById('tab-lynn');
    const tabAdmin = document.getElementById('tab-admin');
    const panelLynn = document.getElementById('panel-lynn');
    const panelAdmin = document.getElementById('panel-admin');
    
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const clearChatButton = document.getElementById('clear-chat-button');
    
    const competitorContentInput = document.getElementById('competitor-content');
    const subjectInput = document.getElementById('subject-input');
    const analysisButton = document.getElementById('analysis-button');
    const analysisOutput = document.getElementById('analysis-output');

    // --- State ---
    const CHAT_HISTORY_KEY = 'lynn_chat_history';
    let chatHistory = [];

    // --- Tab Switching Logic ---
    function setupTabs() {
        function switchTab(activeTab) {
            const isLynnActive = activeTab === 'lynn';
            
            tabLynn.setAttribute('aria-selected', isLynnActive);
            tabAdmin.setAttribute('aria-selected', !isLynnActive);

            panelLynn.classList.toggle('active', isLynnActive);
            panelAdmin.classList.toggle('active', !isLynnActive);
        }

        tabLynn.addEventListener('click', () => switchTab('lynn'));
        tabAdmin.addEventListener('click', () => switchTab('admin'));
    }

    // --- Chat (Lynn) Logic ---
    function appendMessage(role, content, isLoading = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role === 'user' ? 'user-message' : 'model-message');
        
        if (isLoading) {
            messageDiv.innerHTML = `
                <div class="loading-indicator">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            `;
            messageDiv.id = 'loading-indicator';
        } else {
            messageDiv.innerHTML = marked.parse(content);
        }
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageDiv;
    }

    function saveHistory() {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
    }

    async function handleChatSubmit(e) {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        appendMessage('user', userMessage);
        chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
        chatInput.value = '';

        const loadingIndicator = appendMessage('model', '', true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: chatHistory })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Erreur du serveur');
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';
            let responseDiv = loadingIndicator;
            responseDiv.innerHTML = ''; 

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, {stream: true});
                const lines = chunk.split('\n\n');
                
                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.text) {
                                fullResponse += data.text;
                                responseDiv.innerHTML = marked.parse(fullResponse + '…');
                            }
                        } catch(e) {
                           // Ignore parsing errors for incomplete JSON
                        }
                    }
                });
            }
            responseDiv.innerHTML = marked.parse(fullResponse);
            chatHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
            saveHistory();

        } catch (error) {
            console.error('Chat error:', error);
            const errorDiv = loadingIndicator;
            errorDiv.innerHTML = `Désolé, une erreur est survenue: ${error.message}`;
            chatHistory.pop();
        }
    }
    
    function resetChat() {
        chatHistory = [];
        localStorage.removeItem(CHAT_HISTORY_KEY);
        chatContainer.innerHTML = '';
        appendMessage('model', 'Bonjour, je suis Lynn. Comment puis-je vous accompagner aujourd\'hui dans la découverte de la Méthode Neuro-Sexo ?');
    }

    function initializeChat() {
        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            chatContainer.innerHTML = ''; // Clear container before re-rendering
            chatHistory.forEach(msg => appendMessage(msg.role, msg.parts[0].text));
        } else {
             appendMessage('model', 'Bonjour, je suis Lynn. Comment puis-je vous accompagner aujourd\'hui dans la découverte de la Méthode Neuro-Sexo ?');
        }
    }


    // --- Analysis (Admin) Logic ---
    async function handleAnalysis(e) {
        e.preventDefault();
        const competitorContent = competitorContentInput.value;
        const subject = subjectInput.value;

        if (!competitorContent || !subject) {
            analysisOutput.innerHTML = '<p style="color: red;">Veuillez fournir le contenu et le sujet.</p>';
            return;
        }

        analysisOutput.innerHTML = `<div class="loading-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`;
        
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ competitorContent, subject })
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(`Erreur du serveur: ${response.status} - ${errorData.error || 'Erreur inconnue'}`);
            }

            const data = await response.json();
            
            analysisOutput.innerHTML = `
                <h3>Analyse SEO</h3>
                <p><strong>H1:</strong> ${data.seoAnalysis.h1}</p>
                <p><strong>Méta-Titre:</strong> ${data.seoAnalysis.metaTitle}</p>
                <p><strong>Méta-Description:</strong> ${data.seoAnalysis.metaDescription}</p>
                <h3>Angle du Contenu</h3>
                <p>${data.contentAngle}</p>
                <h3>Points Forts</h3>
                <ul>${data.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
                <h3>Points Faibles</h3>
                <ul>${data.weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>
                <h3>Opportunité Stratégique</h3>
                <p>${data.strategicOpportunity}</p>
            `;

        } catch (error) {
            console.error('Analysis error:', error);
            analysisOutput.innerHTML = `<p style="color: red;"><strong>Erreur lors de l'analyse :</strong> ${error.message}</p>`;
        }
    }


    // --- Initialization ---
    try {
        setupTabs();
        initializeChat();
        chatForm.addEventListener('submit', handleChatSubmit);
        clearChatButton.addEventListener('click', resetChat);
        analysisButton.addEventListener('click', handleAnalysis);
    } catch (error) {
        console.error("Erreur critique au démarrage:", error);
        document.body.innerHTML = `<div style="padding:20px;"><h1>Erreur Critique de l'Application</h1><p>L'application n'a pas pu démarrer. Un problème est survenu avec les éléments de la page.</p><pre>${error.stack}</pre></div>`;
    }
});
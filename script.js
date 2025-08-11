// Aguarda o HTML ser totalmente carregado antes de executar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- SELEÇÃO DOS ELEMENTOS DO HTML ---
    const startButton = document.getElementById('start-btn');
    const nextButton = document.getElementById('next-btn');
    const questionContainerElement = document.getElementById('question-container');
    const questionElement = document.getElementById('question');
    const answerButtonsElement = document.getElementById('answer-buttons');
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const body = document.body;

    // Elementos da Janela Modal
    const rankingModal = document.getElementById('ranking-modal');
    const assessmentText = document.getElementById('assessment-text');
    const playerNameInput = document.getElementById('player-name-input');
    const saveScoreBtn = document.getElementById('save-score-btn');

    let shuffledQuestions, currentQuestionIndex, score;

    // --- LÓGICA DO TEMA (sem alterações) ---
    themeToggleButton.addEventListener('click', () => {
        body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark';
        updateThemeIcon();
        localStorage.setItem('theme', body.dataset.theme);
    });

    function updateThemeIcon() {
        const icon = themeToggleButton.querySelector('i');
        if (body.dataset.theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    function applyInitialTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        body.dataset.theme = savedTheme;
        updateThemeIcon();
    }

    applyInitialTheme();

    // --- CONFIGURAÇÃO DO SUPABASE (sem alterações) ---
    const SUPABASE_URL = 'https://awjxbqyowdhoyuwvsxwn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3anhicXlvd2Rob3l1d3ZzeHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTc0ODcsImV4cCI6MjA3MDQ5MzQ4N30.8gzyGmoFyOvB35BdoJQOpUj334HaxwVd5FBV5rrncuQ';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- LÓGICA DO QUIZ ---
    startButton.addEventListener('click', startGame);
    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        setNextQuestion();
    });
    saveScoreBtn.addEventListener('click', saveScore);

    async function fetchQuestions() {
        questionElement.innerText = 'Carregando perguntas...';
        try {
            const { data, error } = await supabaseClient
                .from('perguntas')
                .select('texto_pergunta, respostas (texto_resposta, e_correta)');

            if (error) throw error;

            return data.map(q => ({
                question: q.texto_pergunta,
                answers: q.respostas ? q.respostas.map(r => ({
                    text: r.texto_resposta,
                    correct: r.e_correta
                })) : []
            }));
        } catch (error) {
            console.error('Erro ao buscar perguntas:', error);
            questionElement.innerText = 'Não foi possível carregar as perguntas.';
            return [];
        }
    }

    async function startGame() {
        // Remove qualquer container de avaliação de jogos anteriores
        const oldAssessment = document.querySelector('.assessment-container');
        if (oldAssessment) {
            oldAssessment.remove();
        }

        startButton.classList.add('hide');
        questionContainerElement.classList.remove('hide');

        let allQuestions = await fetchQuestions();
        allQuestions = allQuestions.filter(q => q.answers && q.answers.length > 0);

        if (allQuestions.length === 0) {
            questionElement.innerText = 'Nenhuma pergunta válida foi encontrada. Verifique o Supabase.';
            startButton.innerText = 'Tentar Novamente';
            startButton.classList.remove('hide');
            questionContainerElement.classList.add('hide');
            return;
        }

        score = 0;
        shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
        currentQuestionIndex = 0;
        setNextQuestion();
    }

    function setNextQuestion() {
        resetState();
        showQuestion(shuffledQuestions[currentQuestionIndex]);
    }

    function showQuestion(question) {
        questionElement.innerText = question.question;
        question.answers.forEach(answer => {
            const button = document.createElement('button');
            button.innerText = answer.text;
            button.classList.add('btn');
            if (answer.correct) {
                button.dataset.correct = answer.correct;
            }
            button.addEventListener('click', selectAnswer);
            answerButtonsElement.appendChild(button);
        });
    }

    function resetState() {
        clearStatusClass(document.body);
        nextButton.classList.add('hide');
        while (answerButtonsElement.firstChild) {
            answerButtonsElement.removeChild(answerButtonsElement.firstChild);
        }
    }

    function selectAnswer(e) {
        const selectedButton = e.target;
        const correct = selectedButton.dataset.correct === 'true';

        if (correct) {
            score++;
        }

        setStatusClass(document.body, correct);
        Array.from(answerButtonsElement.children).forEach(button => {
            setStatusClass(button, button.dataset.correct === 'true');
            button.disabled = true;
        });

        if (shuffledQuestions.length > currentQuestionIndex + 1) {
            nextButton.classList.remove('hide');
        } else {
            // Atraso para o usuário ver o feedback da última resposta
            setTimeout(showAssessment, 1000);
        }
    }

    /**
     * FUNÇÃO CORRIGIDA: Agora usa os elementos da modal para exibir o resultado.
     */
    function showAssessment() {
        questionContainerElement.classList.add('hide');

        const totalQuestions = shuffledQuestions.length;
        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
        let feedback = '';

        if (percentage === 100) {
            feedback = 'Parabéns! Você é um verdadeiro craque e acertou tudo!';
        } else if (percentage >= 70) {
            feedback = 'Excelente! Você conhece muito de futebol.';
        } else if (percentage >= 50) {
            feedback = 'Bom trabalho! Você está acima da média.';
        } else {
            feedback = 'Nada mal, mas que tal estudar um pouco mais para o próximo desafio?';
        }

        // Insere o texto de resultado e feedback no parágrafo da modal
        assessmentText.innerText = `Você acertou ${score} de ${totalQuestions} perguntas (${percentage}%).\n\n${feedback}`;

        // Exibe a modal
        rankingModal.classList.remove('hide');
        playerNameInput.focus();
    }

    /**
     * Função para salvar a pontuação, chamada pelo botão da modal.
     */
    async function saveScore() {
        const playerName = playerNameInput.value;

        if (!playerName || playerName.trim() === '') {
            alert('Por favor, digite um nome para salvar no ranking.');
            return;
        }

        saveScoreBtn.innerText = "Salvando...";
        saveScoreBtn.disabled = true;

        try {
            const { error } = await supabaseClient
                .from('ranking')
                .insert([{ nome_usuario: playerName.trim(), pontuacao: score }]);
            if (error) throw error;
            alert('Pontuação salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar no ranking:', error);
            alert('Não foi possível salvar sua pontuação.');
        } finally {
            rankingModal.classList.add('hide');
            saveScoreBtn.innerText = "Salvar Pontuação";
            saveScoreBtn.disabled = false;
            playerNameInput.value = '';
            startButton.innerText = 'Recomeçar';
            startButton.classList.remove('hide');
        }
    }

    function setStatusClass(element, correct) {
        clearStatusClass(element);
        if (correct) {
            element.classList.add('correct');
        } else {
            element.classList.add('wrong');
        }
    }

    function clearStatusClass(element) {
        element.classList.remove('correct');
        element.classList.remove('wrong');
    }
});
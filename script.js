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

    // Elementos da Janela Modal de Avaliação
    const assessmentModal = document.getElementById('assessment-modal');
    const assessmentText = document.getElementById('assessment-text');
    const playerNameInput = document.getElementById('player-name-input');
    const saveScoreBtn = document.getElementById('save-score-btn');

    // Elementos da Janela Modal de Ranking
    const rankingBtn = document.getElementById('ranking-btn');
    const rankingModal = document.getElementById('ranking-modal');
    const rankingList = document.getElementById('ranking-list');
    const closeRankingBtn = document.getElementById('close-ranking-btn');

    // Elementos de Autenticação e Perfil
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileEmail = document.getElementById('profile-email');
    const profileScoresList = document.getElementById('profile-scores-list');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const authContainer = document.getElementById('auth-container');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const userInfo = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const authModal = document.getElementById('auth-modal');
    const authModalContent = document.getElementById('auth-modal-content');
    const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');

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

    // --- LÓGICA DE AUTENTICAÇÃO ---
    loginBtn.addEventListener('click', () => showAuthForm(true));
    signupBtn.addEventListener('click', () => showAuthForm(false));
    logoutBtn.addEventListener('click', handleLogout);
    closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hide'));
    profileBtn.addEventListener('click', showProfile);
    closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hide'));

    // --- LÓGICA DO QUIZ ---
    startButton.addEventListener('click', startGame);
    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        setNextQuestion();
    });
    saveScoreBtn.addEventListener('click', saveScore);
    rankingBtn.addEventListener('click', showRanking);
    closeRankingBtn.addEventListener('click', () => {
        rankingModal.classList.add('hide');
    });

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
        startButton.classList.add('hide');
        rankingBtn.classList.add('hide');
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
        window.shuffledQuestions = shuffledQuestions; // Expose for testing
        currentQuestionIndex = 0;
        setNextQuestion();
    }

    function setNextQuestion() {
        resetState();
        showQuestion(shuffledQuestions[currentQuestionIndex]);
    }

    function showQuestion(question) {
        // Força a re-animação da pergunta
        questionElement.classList.remove('animated');
        void questionElement.offsetWidth; // Truque para forçar o reflow do DOM
        questionElement.classList.add('animated');

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
        clearStatusClass(document.body); // Limpa o fundo verde/vermelho
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
        assessmentModal.classList.remove('hide');
        playerNameInput.focus();
    }

    /**
     * Função para salvar a pontuação, chamada pelo botão da modal.
     */
    async function saveScore() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        let playerName = playerNameInput.value;

        const entry = {
            pontuacao: score,
            // Associa o user_id se o usuário estiver logado
            user_id: user ? user.id : null,
            // Mantém o nome do jogador para usuários não logados
            nome_usuario: user ? user.email : playerName.trim()
        };

        if (!entry.nome_usuario) {
            alert('Por favor, digite um nome para salvar no ranking.');
            return;
        }

        saveScoreBtn.innerText = "Salvando...";
        saveScoreBtn.disabled = true;

        try {
            const { error } = await supabaseClient.from('ranking').insert([entry]);
            if (error) throw error;
            alert('Pontuação salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar no ranking:', error);
            alert('Não foi possível salvar sua pontuação.');
        } finally {
            assessmentModal.classList.add('hide');
            saveScoreBtn.innerText = "Salvar Pontuação";
            saveScoreBtn.disabled = false;
            playerNameInput.value = '';
            startButton.innerText = 'Recomeçar';
            startButton.classList.remove('hide');
            rankingBtn.classList.remove('hide');
        }
    }

    async function showRanking() {
        rankingList.innerHTML = '<li>Carregando ranking...</li>';
        rankingModal.classList.remove('hide');

        try {
            const { data, error } = await supabaseClient
                .from('ranking')
                .select('nome_usuario, pontuacao')
                .order('pontuacao', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (data.length === 0) {
                rankingList.innerHTML = '<li>Nenhuma pontuação registrada ainda. Seja o primeiro!</li>';
                return;
            }

            rankingList.innerHTML = ''; // Limpa a lista
            data.forEach(entry => {
                const li = document.createElement('li');
                li.textContent = `${entry.nome_usuario}: ${entry.pontuacao} pontos`;
                rankingList.appendChild(li);
            });

        } catch (error) {
            console.error('Erro ao buscar o ranking:', error);
            rankingList.innerHTML = '<li>Não foi possível carregar o ranking.</li>';
        }
    }

    function setStatusClass(element, correct) {
        clearStatusClass(element);
        // Aplica a classe de animação correta junto com a de status
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

    // --- FUNÇÕES DE AUTENTICAÇÃO ---

    function showAuthForm(isLogin) {
        const formContent = `
            <h2>${isLogin ? 'Login' : 'Cadastro'}</h2>
            <form id="auth-form">
                <input type="email" id="email-input" placeholder="seu@email.com" required>
                <input type="password" id="password-input" placeholder="Sua senha" required>
                <p id="auth-error-msg"></p>
                <button type="submit" class="btn">${isLogin ? 'Entrar' : 'Cadastrar'}</button>
            </form>
            <a id="toggle-auth-mode">${isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}</a>
        `;
        authModalContent.innerHTML = formContent;
        authModal.classList.remove('hide');

        const authForm = document.getElementById('auth-form');
        const toggleAuthModeLink = document.getElementById('toggle-auth-mode');

        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email-input').value;
            const password = document.getElementById('password-input').value;
            if (isLogin) {
                handleLogin(email, password);
            } else {
                handleSignup(email, password);
            }
        });

        toggleAuthModeLink.addEventListener('click', () => showAuthForm(!isLogin));
    }

    async function handleLogin(email, password) {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            document.getElementById('auth-error-msg').innerText = error.message;
        } else {
            authModal.classList.add('hide');
            // The UI will be updated by the onAuthStateChange listener
        }
    }

    async function handleSignup(email, password) {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            document.getElementById('auth-error-msg').innerText = error.message;
        } else {
            alert('Cadastro realizado com sucesso! Você já pode fazer o login.');
            showAuthForm(true); // Redireciona para o formulário de login
        }
    }

    async function handleLogout() {
        await supabaseClient.auth.signOut();
        // A UI será atualizada pelo listener onAuthStateChange
    }

    async function updateUserUI() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            authContainer.classList.add('hide');
            userInfo.classList.remove('hide');
            userEmailSpan.innerText = user.email;
            playerNameInput.parentElement.style.display = 'none';
        } else {
            authContainer.classList.remove('hide');
            userInfo.classList.add('hide');
            userEmailSpan.innerText = '';
            playerNameInput.parentElement.style.display = 'block';
        }
    }

    async function showProfile() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Você precisa estar logado para ver seu perfil.');
            return;
        }

        profileEmail.innerText = user.email;
        profileScoresList.innerHTML = '<li>Carregando histórico...</li>';
        profileModal.classList.remove('hide');

        try {
            const { data, error } = await supabaseClient
                .from('ranking')
                .select('pontuacao, data_hora')
                .eq('user_id', user.id)
                .order('data_hora', { ascending: false });

            if (error) throw error;

            if (data.length === 0) {
                profileScoresList.innerHTML = '<li>Você ainda não tem pontuações.</li>';
                return;
            }

            profileScoresList.innerHTML = '';
            data.forEach(scoreEntry => {
                const li = document.createElement('li');
                const date = new Date(scoreEntry.data_hora).toLocaleDateString('pt-BR');
                li.textContent = `Pontuação: ${scoreEntry.pontuacao} - Em: ${date}`;
                profileScoresList.appendChild(li);
            });

        } catch (error) {
            console.error('Erro ao buscar histórico de pontuações:', error);
            profileScoresList.innerHTML = '<li>Erro ao carregar histórico.</li>';
        }
    }

    // --- LISTENER DE ESTADO DE AUTENTICAÇÃO ---
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        updateUserUI(user);
    });

    async function updateUserUI(user) {
        if (user) {
            authContainer.classList.add('hide');
            userInfo.classList.remove('hide');
            userEmailSpan.innerText = user.email;
            playerNameInput.parentElement.style.display = 'none';
        } else {
            authContainer.classList.remove('hide');
            userInfo.classList.add('hide');
            userEmailSpan.innerText = '';
            playerNameInput.parentElement.style.display = 'block';
        }
    }

    // Verifica o estado do usuário inicial ao carregar a página
    async function checkInitialUser() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        updateUserUI(user);
    }
    checkInitialUser();
});

document.addEventListener('DOMContentLoaded', () => {

    // --- SELEÇÃO DE ELEMENTOS ---
    const startButton = document.getElementById('start-btn');
    const nextButton = document.getElementById('next-btn');
    const questionContainerElement = document.getElementById('question-container');
    const questionElement = document.getElementById('question');
    const answerButtonsElement = document.getElementById('answer-buttons');
    const body = document.body;
    const rankingList = document.getElementById('ranking-list-main');

    // Modals
    const assessmentModal = document.getElementById('assessment-modal');
    const assessmentText = document.getElementById('assessment-text');
    const assessmentActions = document.getElementById('assessment-actions');
    const closeAssessmentBtn = document.querySelector('#assessment-modal .close-btn');
    const authModal = document.getElementById('auth-modal');
    const authModalContent = document.getElementById('auth-modal-content');
    const closeAuthModalBtn = document.querySelector('#auth-modal .close-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileEmail = document.getElementById('profile-email');
    const profileScoresList = document.getElementById('profile-scores-list');
    const closeProfileBtn = document.querySelector('#profile-modal .close-btn');

    // Auth UI
    const authContainer = document.getElementById('auth-container');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const userInfo = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');

    // Screens
    const splashScreen = document.getElementById('splash-screen');
    const mainContainer = document.querySelector('.container');
    const topBar = document.querySelector('.top-bar');
    const startScreen = document.getElementById('start-screen');

    let shuffledQuestions, currentQuestionIndex, score;

    // --- CONFIGURAÇÃO DO SUPABASE ---
    const SUPABASE_URL = 'https://awjxbqyowdhoyuwvsxwn.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3anhicXlvd2Rob3l1d3ZzeHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTc0ODcsImV4cCI6MjA3MDQ5MzQ4N30.8gzyGmoFyOvB35BdoJQOpUj334HaxwVd5FBV5rrncuQ';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- EVENT LISTENERS ---
    startButton.addEventListener('click', startGame);
    nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        setNextQuestion();
    });
    loginBtn.addEventListener('click', () => showAuthForm(true));
    signupBtn.addEventListener('click', () => showAuthForm(false));
    logoutBtn.addEventListener('click', handleLogout);
    closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hide'));
    profileBtn.addEventListener('click', showProfile);
    closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hide'));
    closeAssessmentBtn.addEventListener('click', () => {
        assessmentModal.classList.add('hide');
        showStartScreen();
    });

    // --- LÓGICA DE UI ---
    function showStartScreen() {
        questionContainerElement.classList.add('hide');
        startScreen.classList.remove('hide');
    }

    function showQuizScreen() {
        startScreen.classList.add('hide');
        questionContainerElement.classList.remove('hide');
    }

    // --- LÓGICA DO QUIZ ---
    async function startGame() {
        showQuizScreen();
        const allQuestions = await fetchQuestions();
        if (allQuestions.length === 0) {
            questionElement.innerText = 'Nenhuma pergunta válida encontrada. Verifique o Supabase.';
            return;
        }
        score = 0;
        shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
        currentQuestionIndex = 0;
        setNextQuestion();
    }

    async function fetchQuestions() {
        questionElement.innerText = 'Carregando perguntas...';
        try {
            const { data, error } = await supabaseClient
                .from('perguntas')
                .select('*, respostas(*)');
            if (error) throw error;
            return data.filter(q => q.respostas && q.respostas.length > 0)
                       .map(q => ({
                            question: q.texto_pergunta,
                            answers: q.respostas.map(r => ({ text: r.texto_resposta, correct: r.e_correta }))
                       }));
        } catch (error) {
            console.error('Erro ao buscar perguntas:', error);
            questionElement.innerText = 'Não foi possível carregar as perguntas.';
            return [];
        }
    }

    function setNextQuestion() {
        resetState();
        showQuestion(shuffledQuestions[currentQuestionIndex]);
    }

    function showQuestion(question) {
        questionElement.innerText = question.question;
        answerButtonsElement.innerHTML = '';
        question.answers.forEach(answer => {
            const button = document.createElement('button');
            button.innerText = answer.text;
            button.classList.add('btn');
            if (answer.correct) {
                button.dataset.correct = 'true';
            }
            button.addEventListener('click', selectAnswer);
            answerButtonsElement.appendChild(button);
        });
    }

    function resetState() {
        nextButton.classList.add('hide');
    }

    function selectAnswer(e) {
        const selectedButton = e.target;
        const correct = selectedButton.dataset.correct === 'true';
        if (correct) score++;

        Array.from(answerButtonsElement.children).forEach(button => {
            if (button.dataset.correct === 'true') button.classList.add('correct');
            else button.classList.add('wrong');
            button.disabled = true;
        });

        if (shuffledQuestions.length > currentQuestionIndex + 1) {
            nextButton.classList.remove('hide');
        } else {
            setTimeout(showAssessment, 1200);
        }
    }

    async function showAssessment() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        questionContainerElement.classList.add('hide');

        const totalQuestions = shuffledQuestions.length;
        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
        let feedback = '';
        if (percentage === 100) feedback = 'Parabéns! Você é um verdadeiro craque!';
        else if (percentage >= 70) feedback = 'Excelente! Você conhece muito de futebol.';
        else if (percentage >= 50) feedback = 'Bom trabalho! Você está acima da média.';
        else feedback = 'Nada mal, mas que tal estudar um pouco mais?';

        assessmentText.innerHTML = `Você acertou <strong>${score}</strong> de <strong>${totalQuestions}</strong> perguntas (${percentage}%).<br><br><em>${feedback}</em>`;

        if (user) {
            assessmentActions.innerHTML = `<p>Sua pontuação foi salva automaticamente no seu perfil.</p>`;
            await saveScore(user);
        } else {
            assessmentActions.innerHTML = `<p>Para salvar sua pontuação e entrar no ranking, faça o login ou crie uma conta.</p><button id="assessment-login-btn" class="btn">Login</button><button id="assessment-signup-btn" class="btn btn-secondary">Cadastro</button>`;
            document.getElementById('assessment-login-btn').addEventListener('click', () => {
                assessmentModal.classList.add('hide');
                showAuthForm(true);
            });
            document.getElementById('assessment-signup-btn').addEventListener('click', () => {
                assessmentModal.classList.add('hide');
                showAuthForm(false);
            });
        }
        assessmentModal.classList.remove('hide');
    }

    async function saveScore(user) {
        if (!user) return;
        const { error } = await supabaseClient.from('ranking').insert([{ pontuacao: score, user_id: user.id, nome_usuario: user.email }]);
        if (error) console.error('Erro ao salvar no ranking:', error);
    }

    async function showRanking() {
        rankingList.innerHTML = '<li>Carregando ranking...</li>';
        try {
            const { data, error } = await supabaseClient.from('ranking').select('nome_usuario, pontuacao').order('pontuacao', { ascending: false }).limit(10);
            if (error) throw error;
            if (data.length === 0) {
                rankingList.innerHTML = '<li>Nenhuma pontuação registrada ainda. Seja o primeiro!</li>';
                return;
            }
            rankingList.innerHTML = '';
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

    // --- LÓGICA DE AUTENTICAÇÃO E PERFIL ---
    function showAuthForm(isLogin) {
        const formContent = `<h2>${isLogin ? 'Login' : 'Cadastro'}</h2><form id="auth-form"><input type="email" id="email-input" placeholder="seu@email.com" required><input type="password" id="password-input" placeholder="Sua senha" required><p id="auth-error-msg"></p><button type="submit" class="btn">${isLogin ? 'Entrar' : 'Cadastrar'}</button></form><a id="toggle-auth-mode">${isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}</a>`;
        authModalContent.innerHTML = formContent;
        authModal.classList.remove('hide');
        const authForm = document.getElementById('auth-form');
        const toggleAuthModeLink = document.getElementById('toggle-auth-mode');
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email-input').value;
            const password = document.getElementById('password-input').value;
            if (isLogin) handleLogin(email, password);
            else handleSignup(email, password);
        });
        toggleAuthModeLink.addEventListener('click', () => showAuthForm(!isLogin));
    }

    async function handleLogin(email, password) {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) document.getElementById('auth-error-msg').innerText = error.message;
        else authModal.classList.add('hide');
    }

    async function handleSignup(email, password) {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) document.getElementById('auth-error-msg').innerText = error.message;
        else {
            alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação (se aplicável) e faça o login.');
            showAuthForm(true);
        }
    }

    async function handleLogout() {
        await supabaseClient.auth.signOut();
    }

    async function showProfile() {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        profileEmail.innerText = user.email;
        profileScoresList.innerHTML = '<li>Carregando histórico...</li>';
        profileModal.classList.remove('hide');
        try {
            const { data, error } = await supabaseClient.from('ranking').select('pontuacao, data_hora').eq('user_id', user.id).order('data_hora', { ascending: false });
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

    function updateUserUI(user) {
        // Garante que o contêiner principal e a tela inicial estejam sempre visíveis
        mainContainer.classList.remove('hide');
        showStartScreen();

        if (user) {
            authContainer.classList.add('hide');
            userInfo.classList.remove('hide');
            userEmailSpan.innerText = user.email;
        } else {
            authContainer.classList.remove('hide');
            userInfo.classList.add('hide');
        }
    }

    // --- INICIALIZAÇÃO ---
    function initApp() {
        setTimeout(() => {
            splashScreen.classList.add('fade-out');
            setTimeout(() => {
                splashScreen.remove();
                topBar.classList.remove('hide');
                showRanking(); // Call showRanking on init
            }, 500);
        }, 2500);

        supabaseClient.auth.onAuthStateChange((_event, session) => {
            updateUserUI(session?.user);
        });

        async function checkInitialUser() {
            const { data: { user } } = await supabaseClient.auth.getUser();
            updateUserUI(user);
        }
        checkInitialUser();
    }

    initApp();
});

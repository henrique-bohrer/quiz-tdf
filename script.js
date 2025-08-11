document.addEventListener('DOMContentLoaded', () => {

    // --- SELEÇÃO DE ELEMENTOS ---
    const startButton = document.getElementById('start-btn');
    const nextButton = document.getElementById('next-btn');
    const questionContainerElement = document.getElementById('question-container');
    const questionElement = document.getElementById('question');
    const answerButtonsElement = document.getElementById('answer-buttons');
    const body = document.body;
    const rankingBtn = document.getElementById('ranking-btn');

    // Modals
    const assessmentModal = document.getElementById('assessment-modal');
    const assessmentText = document.getElementById('assessment-text');
    const assessmentActions = document.getElementById('assessment-actions');
    const closeAssessmentBtn = document.getElementById('close-assessment-btn');
    const rankingModal = document.getElementById('ranking-modal');
    const rankingList = document.getElementById('ranking-list');
    const closeRankingBtn = document.getElementById('close-ranking-btn');
    const authModal = document.getElementById('auth-modal');
    const authModalContent = document.getElementById('auth-modal-content');
    const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
    const profileModal = document.getElementById('profile-modal');
    const profileEmail = document.getElementById('profile-email');
    const profileScoresList = document.getElementById('profile-scores-list');
    const closeProfileBtn = document.getElementById('close-profile-btn');

    // Auth UI
    const authContainer = document.getElementById('auth-container');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const userInfo = document.getElementById('user-info');
    const userEmailSpan = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');

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
    rankingBtn.addEventListener('click', showRanking);
    closeRankingBtn.addEventListener('click', () => rankingModal.classList.add('hide'));
    loginBtn.addEventListener('click', () => showAuthForm(true));
    signupBtn.addEventListener('click', () => showAuthForm(false));
    logoutBtn.addEventListener('click', handleLogout);
    closeAuthModalBtn.addEventListener('click', () => authModal.classList.add('hide'));
    profileBtn.addEventListener('click', showProfile);
    closeProfileBtn.addEventListener('click', () => profileModal.classList.add('hide'));
    closeAssessmentBtn.addEventListener('click', () => assessmentModal.classList.add('hide'));

    // --- LÓGICA DO QUIZ ---
    async function startGame() {
        startButton.classList.add('hide');
        rankingBtn.classList.add('hide');
        questionContainerElement.classList.remove('hide');

        const allQuestions = await fetchQuestions();
        if (allQuestions.length === 0) {
            questionElement.innerText = 'Nenhuma pergunta válida encontrada. Verifique o Supabase.';
            startButton.innerText = 'Tentar Novamente';
            startButton.classList.remove('hide');
            rankingBtn.classList.remove('hide');
            questionContainerElement.classList.add('hide');
            return;
        }

        score = 0;
        shuffledQuestions = allQuestions.sort(() => Math.random() - 0.5);
        currentQuestionIndex = 0;
        setNextQuestion();
    }

    async function fetchQuestions() {
        // ... (código de fetchQuestions, sem alterações)
        questionElement.innerText = 'Carregando perguntas...';
        try {
            const { data, error } = await supabaseClient
                .from('perguntas')
                .select('texto_pergunta, respostas (texto_resposta, e_correta)');
            if (error) throw error;
            return data.map(q => ({
                question: q.texto_pergunta,
                answers: q.respostas ? q.respostas.map(r => ({ text: r.texto_resposta, correct: r.e_correta })) : []
            })).filter(q => q.answers.length > 0);
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
        answerButtonsElement.innerHTML = ''; // Limpa botões anteriores
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
        clearStatusClass(body);
        nextButton.classList.add('hide');
    }

    function selectAnswer(e) {
        const selectedButton = e.target;
        const correct = selectedButton.dataset.correct === 'true';

        if (correct) {
            score++;
        }

        setStatusClass(body, correct); // Aplica a classe de cor de fundo
        Array.from(answerButtonsElement.children).forEach(button => {
            setStatusClass(button, button.dataset.correct === 'true'); // Aplica classe e animação
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
        clearStatusClass(body);
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
            assessmentActions.innerHTML = `<p>Sua pontuação será salva automaticamente no seu perfil.</p>`;
            await saveScore(user);
        } else {
            assessmentActions.innerHTML = `
                <p>Para salvar sua pontuação e entrar no ranking, faça o login ou crie uma conta.</p>
                <button id="assessment-login-btn" class="btn">Login</button>
                <button id="assessment-signup-btn" class="btn btn-secondary">Cadastro</button>
            `;
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
        if (!user) return; // Só salva se o usuário estiver logado

        const { error } = await supabaseClient.from('ranking').insert([{ pontuacao: score, user_id: user.id, nome_usuario: user.email }]);
        if (error) {
            console.error('Erro ao salvar no ranking:', error);
        }
    }

    // --- LÓGICA DE RANKING ---
    async function showRanking() {
        // ... (código de showRanking, sem alterações)
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
        // ... (código de showAuthForm, sem alterações)
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
        // ... (código de showProfile, sem alterações)
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            alert('Você precisa estar logado para ver seu perfil.');
            return;
        }
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
        if (user) {
            authContainer.classList.add('hide');
            userInfo.classList.remove('hide');
            userEmailSpan.innerText = user.email;
        } else {
            authContainer.classList.remove('hide');
            userInfo.classList.add('hide');
            userEmailSpan.innerText = '';
        }
        // Sempre mostra o botão de recomeçar após o fim do quiz
        startButton.innerText = 'Recomeçar';
        startButton.classList.remove('hide');
        rankingBtn.classList.remove('hide');
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        updateUserUI(session?.user);
    });

    // --- INICIALIZAÇÃO ---
    // Define o tema escuro como padrão no carregamento
    body.dataset.theme = 'dark';

    // --- FUNÇÕES AUXILIARES DE ESTILO ---
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

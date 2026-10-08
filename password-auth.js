const senhaAdmin = document.querySelector("#senhaAdmin");
const linkAcesso = document.querySelector("#linkAcesso");
const novaSenha = document.querySelector("#novaSenha");
const confirmarSenha = document.querySelector("#confirmarSenha");
const salvarSenha = document.querySelector("#salvarSenha");

loginForm.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    evento.stopImmediatePropagation();

    const email = emailAdmin.value.trim().toLowerCase();
    const senha = senhaAdmin.value;
    if (email !== EMAIL_ADMIN.toLowerCase()) {
        authStatus.textContent = "Este e-mail não tem permissão para administrar os projetos.";
        return;
    }

    const entrar = loginForm.querySelector('button[type="submit"]');
    entrar.disabled = true;
    entrar.textContent = "Entrando...";
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    authStatus.textContent = error
        ? `Não foi possível entrar: ${error.message}`
        : "Acesso autorizado.";
    entrar.disabled = false;
    entrar.textContent = "Entrar";
}, true);

linkAcesso.addEventListener("click", async () => {
    const email = emailAdmin.value.trim().toLowerCase();
    if (email !== EMAIL_ADMIN.toLowerCase()) {
        authStatus.textContent = "Informe o e-mail autorizado para receber o link.";
        return;
    }

    linkAcesso.disabled = true;
    authStatus.textContent = "Enviando o link de primeiro acesso...";
    const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href.split("#")[0] }
    });
    authStatus.textContent = error
        ? `Não foi possível enviar o link: ${error.message}`
        : "Link enviado. Abra-o neste navegador; depois defina sua senha no painel.";
    window.setTimeout(() => { linkAcesso.disabled = false; }, 60000);
});

salvarSenha.addEventListener("click", async () => {
    if (novaSenha.value.length < 8) {
        adminStatus.textContent = "Use uma senha com pelo menos 8 caracteres.";
        novaSenha.focus();
        return;
    }
    if (novaSenha.value !== confirmarSenha.value) {
        adminStatus.textContent = "As senhas não coincidem.";
        confirmarSenha.focus();
        return;
    }

    salvarSenha.disabled = true;
    adminStatus.textContent = "Salvando sua senha...";
    const { error } = await supabaseClient.auth.updateUser({ password: novaSenha.value });
    adminStatus.textContent = error
        ? `Não foi possível salvar a senha: ${error.message}`
        : "Senha salva. Nos próximos acessos, entre com seu e-mail e senha.";
    if (!error) {
        novaSenha.value = "";
        confirmarSenha.value = "";
    }
    salvarSenha.disabled = false;
});

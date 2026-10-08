// Dados compartilhados pelo Supabase: https://supabase.com/dashboard/project/azqkzoxlniujwyfhaqjh
const SUPABASE_URL = "https://azqkzoxlniujwyfhaqjh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fPRJvSMfmf0qVAXZQXCIcg_6RIm5AO2";
const EMAIL_ADMIN = "gabrielsoaresunia@gmail.com";
const BUCKET_TRABALHOS = "trabalhos";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function mostrarProjeto(titulo, texto) {
    document.querySelector("#modalTitulo").textContent = titulo;
    document.querySelector("#modalTexto").textContent = texto;
    document.querySelector("#modal").classList.add("aberto");
}

function fecharProjeto() {
    document.querySelector("#modal").classList.remove("aberto");
}

const modalProjeto = document.querySelector("#modal");
modalProjeto?.addEventListener("click", (evento) => {
    if (evento.target === modalProjeto) fecharProjeto();
});

const loginForm = document.querySelector("#loginForm");
const emailAdmin = document.querySelector("#emailAdmin");
const authStatus = document.querySelector("#authStatus");
const diarioAdmin = document.querySelector("#diarioAdmin");
const listaTrabalhos = document.querySelector("#listaTrabalhos");
const abrirEditor = document.querySelector("#abrirEditor");
const editorConteudo = document.querySelector("#editorConteudo");
const resumoTrabalho = document.querySelector("#resumoTrabalho");
const fotoInput = document.querySelector("#fotoInput");
const videoInput = document.querySelector("#videoInput");
const fotoTexto = document.querySelector("#fotoTexto");
const videoTexto = document.querySelector("#videoTexto");
const numeroTrabalhoEl = abrirEditor;
let fotoSelecionada = null;
let videoSelecionado = null;
let trabalhosCarregados = [];

function atualizarBotao() {
    numeroTrabalhoEl.textContent = `+ Adicionar resumo do trabalho ${trabalhosCarregados.length + 1}`;
}

function mostrarEditorAutorizado(user) {
    const autorizado = user?.email?.toLowerCase() === EMAIL_ADMIN.toLowerCase();
    diarioAdmin.hidden = !autorizado;
    loginForm.hidden = autorizado;
    if (!autorizado && user) {
        authStatus.textContent = "Este e-mail não tem permissão para publicar.";
        supabaseClient.auth.signOut();
    }
}

function criarCardTrabalho(trabalho) {
    const card = document.createElement("article");
    card.className = "diario-trabalho";

    const numero = document.createElement("span");
    numero.className = "diario-trabalho-numero";
    numero.textContent = `TRABALHO ${trabalho.numero}`;

    const titulo = document.createElement("h3");
    titulo.textContent = `Trabalho ${trabalho.numero}`;

    const texto = document.createElement("p");
    texto.className = "diario-trabalho-texto";
    texto.textContent = trabalho.resumo;
    card.append(numero, titulo, texto);

    const urls = [trabalho.foto_path, trabalho.video_path].filter(Boolean)
        .map((path) => supabaseClient.storage.from(BUCKET_TRABALHOS).getPublicUrl(path).data.publicUrl);
    if (urls.length) {
        const midias = document.createElement("div");
        midias.className = "diario-trabalho-midias";
        if (trabalho.foto_path) {
            const imagem = document.createElement("img");
            imagem.alt = `Foto do trabalho ${trabalho.numero}`;
            imagem.src = urls[0];
            midias.appendChild(imagem);
        }
        if (trabalho.video_path) {
            const video = document.createElement("video");
            video.controls = true;
            video.preload = "metadata";
            video.src = supabaseClient.storage.from(BUCKET_TRABALHOS).getPublicUrl(trabalho.video_path).data.publicUrl;
            midias.appendChild(video);
        }
        card.appendChild(midias);
    }
    listaTrabalhos.appendChild(card);
}

async function carregarTrabalhos() {
    const { data, error } = await supabaseClient.from("trabalhos")
        .select("id, numero, resumo, foto_path, video_path, created_at")
        .order("created_at", { ascending: true });
    if (error) {
        console.error("Erro ao carregar os trabalhos:", error);
        authStatus.textContent = "Não foi possível carregar os trabalhos. Confira a configuração do Supabase.";
        return;
    }
    trabalhosCarregados = data || [];
    listaTrabalhos.replaceChildren();
    trabalhosCarregados.forEach(criarCardTrabalho);
    atualizarBotao();
}

loginForm.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const email = emailAdmin.value.trim().toLowerCase();
    if (email !== EMAIL_ADMIN.toLowerCase()) {
        authStatus.textContent = "Este e-mail não tem permissão para publicar.";
        return;
    }
    authStatus.textContent = "Enviando link de acesso para seu e-mail...";
    const { error } = await supabaseClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href.split("#")[0] }
    });
    authStatus.textContent = error
        ? `Não foi possível enviar o link: ${error.message}`
        : "Link enviado. Abra o e-mail e toque nele neste mesmo navegador para publicar.";
});

document.querySelector("#sairAdmin").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    mostrarEditorAutorizado(null);
    authStatus.textContent = "Você saiu do painel de publicação.";
});

supabaseClient.auth.onAuthStateChange((_event, session) => mostrarEditorAutorizado(session?.user));
supabaseClient.auth.getSession().then(({ data }) => mostrarEditorAutorizado(data.session?.user));

abrirEditor.addEventListener("click", () => {
    editorConteudo.hidden = false;
    abrirEditor.hidden = true;
    resumoTrabalho.focus();
});

function limparEditor() {
    resumoTrabalho.value = "";
    fotoInput.value = "";
    videoInput.value = "";
    fotoSelecionada = null;
    videoSelecionado = null;
    fotoTexto.textContent = "Adicionar foto";
    videoTexto.textContent = "Adicionar vídeo";
}

function cancelarEdicao() {
    limparEditor();
    editorConteudo.hidden = true;
    abrirEditor.hidden = false;
}

document.querySelector("#cancelarTrabalho").addEventListener("click", cancelarEdicao);
fotoInput.addEventListener("change", () => {
    fotoSelecionada = fotoInput.files[0] || null;
    fotoTexto.textContent = fotoSelecionada?.name || "Adicionar foto";
});
videoInput.addEventListener("change", () => {
    videoSelecionado = videoInput.files[0] || null;
    videoTexto.textContent = videoSelecionado?.name || "Adicionar vídeo";
});

async function enviarMidia(arquivo, pasta, caminhosEnviados) {
    if (!arquivo) return null;
    const extensao = arquivo.name.includes(".") ? arquivo.name.split(".").pop().replace(/[^a-zA-Z0-9]/g, "") : "bin";
    const caminho = `${pasta}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await supabaseClient.storage.from(BUCKET_TRABALHOS).upload(caminho, arquivo, {
        contentType: arquivo.type || "application/octet-stream",
        upsert: false
    });
    if (error) throw error;
    caminhosEnviados.push(caminho);
    return caminho;
}

document.querySelector("#registrarTrabalho").addEventListener("click", async () => {
    const resumo = resumoTrabalho.value.trim();
    if (!resumo) {
        resumoTrabalho.focus();
        return;
    }
    const caminhosEnviados = [];
    const botao = document.querySelector("#registrarTrabalho");
    botao.disabled = true;
    botao.textContent = "Salvando...";
    try {
        const fotoPath = await enviarMidia(fotoSelecionada, "fotos", caminhosEnviados);
        const videoPath = await enviarMidia(videoSelecionado, "videos", caminhosEnviados);
        const { error } = await supabaseClient.from("trabalhos").insert({
            numero: trabalhosCarregados.length + 1,
            resumo,
            foto_path: fotoPath,
            video_path: videoPath
        });
        if (error) throw error;
        await carregarTrabalhos();
        cancelarEdicao();
    } catch (error) {
        console.error("Erro ao salvar o trabalho:", error);
        if (caminhosEnviados.length) await supabaseClient.storage.from(BUCKET_TRABALHOS).remove(caminhosEnviados);
        alert(`Não foi possível salvar. Confira a configuração do Supabase e tente novamente. ${error.message || ""}`);
    } finally {
        botao.disabled = false;
        botao.textContent = "Registrar trabalho →";
    }
});

resumoTrabalho.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
        evento.preventDefault();
        document.querySelector("#registrarTrabalho").click();
    }
});

carregarTrabalhos();

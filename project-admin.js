const SUPABASE_URL = "https://azqkzoxlniujwyfhaqjh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fPRJvSMfmf0qVAXZQXCIcg_6RIm5AO2";
const EMAIL_ADMIN = "gabrielsoaresunia@gmail.com";
const BUCKET_TRABALHOS = "trabalhos";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const modal = document.querySelector("#modal");
const loginForm = document.querySelector("#loginForm");
const emailAdmin = document.querySelector("#emailAdmin");
const senhaAdmin = document.querySelector("#senhaAdmin");
const linkAcesso = document.querySelector("#linkAcesso");
const novaSenha = document.querySelector("#novaSenha");
const confirmarSenha = document.querySelector("#confirmarSenha");
const salvarSenha = document.querySelector("#salvarSenha");
const authStatus = document.querySelector("#authStatus");
const adminStatus = document.querySelector("#adminStatus");
const diarioAdmin = document.querySelector("#diarioAdmin");
const listaProjetos = document.querySelector("#listaProjetos");
const projetosVazio = document.querySelector("#projetosVazio");
const listaTrabalhos = document.querySelector("#listaTrabalhos");
const editorConteudo = document.querySelector("#editorConteudo");
const abrirEditor = document.querySelector("#abrirEditor");
const tituloProjeto = document.querySelector("#tituloProjeto");
const resumoTrabalho = document.querySelector("#resumoTrabalho");
const fotoInput = document.querySelector("#fotoInput");
const videoInput = document.querySelector("#videoInput");
const fotoTexto = document.querySelector("#fotoTexto");
const videoTexto = document.querySelector("#videoTexto");
const salvarProjetoBotao = document.querySelector("#registrarTrabalho");

let projetosCarregados = [];
let projetoEmEdicao = null;
let administradorAtivo = false;

document.querySelector("#projetos").append(listaProjetos, projetosVazio);
salvarProjetoBotao.textContent = "Salvar projeto";
fotoTexto.textContent = "Adicionar fotos";
videoTexto.textContent = "Adicionar vídeos";

function mostrarProjeto(titulo, texto) {
    document.querySelector("#modalTitulo").textContent = titulo;
    const textoLegivel = String(texto || "").trim()
        .replace(/\s*\*\s*/g, "\n• ")
        .replace(/\s*(O que fizemos\?|Ideias que surgiram:?|O que decidimos\?|Dificuldades que tivemos:?|Pr[oó]ximo passo:?|O que pretendemos detectar\?|Resposta do sistema:?|Como funcionar[aá]\?)\s*/giu, "\n\n$1\n")
        .replace(/\n{3,}/g, "\n\n");
    document.querySelector("#modalTexto").textContent = textoLegivel;
    modal.classList.add("aberto");
}

function fecharProjeto() {
    modal.classList.remove("aberto");
}

modal?.addEventListener("click", (evento) => {
    if (evento.target === modal) fecharProjeto();
});

function listaDeCaminhos(valor) {
    if (Array.isArray(valor)) return valor.filter(Boolean);
    return valor ? [valor] : [];
}

function urlMidia(caminho) {
    return supabaseClient.storage.from(BUCKET_TRABALHOS).getPublicUrl(caminho).data.publicUrl;
}

function criarCardProjeto(projeto) {
    const card = document.createElement("article");
    card.className = "projeto";

    const midias = document.createElement("div");
    midias.className = "projeto-midias";
    const fotos = listaDeCaminhos(projeto.foto_paths || projeto.foto_path);
    const videos = listaDeCaminhos(projeto.video_paths || projeto.video_path);

    fotos.forEach((caminho) => {
        const imagem = document.createElement("img");
        imagem.src = urlMidia(caminho);
        imagem.alt = `Foto do projeto ${projeto.titulo}`;
        midias.appendChild(imagem);
    });
    videos.forEach((caminho) => {
        const video = document.createElement("video");
        video.controls = true;
        video.preload = "metadata";
        video.src = urlMidia(caminho);
        video.setAttribute("aria-label", `Vídeo do projeto ${projeto.titulo}`);
        midias.appendChild(video);
    });
    if (!midias.childElementCount) {
        const capa = document.createElement("div");
        capa.className = "projeto-imagem";
        capa.textContent = `PROJETO ${String(projeto.numero).padStart(2, "0")}`;
        midias.appendChild(capa);
    }

    const conteudo = document.createElement("div");
    conteudo.className = "projeto-conteudo";
    const etiqueta = document.createElement("span");
    etiqueta.textContent = `PROJETO ${String(projeto.numero).padStart(2, "0")}`;
    const titulo = document.createElement("h3");
    titulo.textContent = projeto.titulo || `Projeto ${projeto.numero}`;
    const resumo = document.createElement("p");
    resumo.className = "projeto-resumo-preview";
    const resumoClaro = document.createElement("span");
    resumoClaro.className = "projeto-resumo-claro";
    resumoClaro.textContent = projeto.resumo;
    const resumoDesfocado = document.createElement("span");
    resumoDesfocado.className = "projeto-resumo-desfocado";
    resumoDesfocado.textContent = projeto.resumo;
    resumoDesfocado.setAttribute("aria-hidden", "true");
    resumo.append(resumoClaro, resumoDesfocado);
    const detalhes = document.createElement("button");
    detalhes.type = "button";
    detalhes.className = "ver-mais";
    detalhes.textContent = "Ver apresentação →";
    detalhes.addEventListener("click", () => mostrarProjeto(titulo.textContent, projeto.resumo));
    conteudo.append(etiqueta, titulo, resumo, detalhes);
    card.append(midias, conteudo);
    listaProjetos.appendChild(card);
}

function criarLinhaGerenciamento(projeto) {
    const item = document.createElement("article");
    item.className = "admin-projeto-item";
    const informacoes = document.createElement("div");
    const titulo = document.createElement("h4");
    titulo.textContent = projeto.titulo || `Projeto ${projeto.numero}`;
    const resumo = document.createElement("p");
    resumo.textContent = projeto.resumo;
    informacoes.append(titulo, resumo);

    const acoes = document.createElement("div");
    acoes.className = "admin-projeto-acoes";
    const editar = document.createElement("button");
    editar.type = "button";
    editar.className = "cancelar-trabalho";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => editarProjeto(projeto));
    const remover = document.createElement("button");
    remover.type = "button";
    remover.className = "cancelar-trabalho";
    remover.textContent = "Remover";
    remover.addEventListener("click", () => removerProjeto(projeto));
    acoes.append(editar, remover);
    item.append(informacoes, acoes);
    listaTrabalhos.appendChild(item);
}

async function carregarProjetos() {
    const { data, error } = await supabaseClient.from("trabalhos")
        .select("id, numero, titulo, resumo, foto_path, video_path, foto_paths, video_paths, created_at")
        .order("numero", { ascending: true });
    if (error) {
        console.error("Erro ao carregar projetos:", error);
        projetosVazio.hidden = false;
        projetosVazio.textContent = "Não foi possível carregar os projetos. Confira se a configuração do Supabase foi executada.";
        if (adminStatus) adminStatus.textContent = "Falha ao carregar os projetos.";
        return;
    }
    projetosCarregados = data || [];
    listaProjetos.replaceChildren();
    listaTrabalhos.replaceChildren();
    projetosCarregados.forEach(criarCardProjeto);
    if (administradorAtivo) projetosCarregados.forEach(criarLinhaGerenciamento);
    projetosVazio.hidden = projetosCarregados.length > 0;
}

function atualizarAcesso(user) {
    administradorAtivo = user?.email?.toLowerCase() === EMAIL_ADMIN.toLowerCase();
    diarioAdmin.hidden = !administradorAtivo;
    loginForm.hidden = administradorAtivo;
    if (user && !administradorAtivo) {
        authStatus.textContent = "Este e-mail não tem permissão para administrar os projetos.";
        supabaseClient.auth.signOut();
    }
    carregarProjetos();
}

loginForm.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const email = emailAdmin.value.trim().toLowerCase();
    if (email !== EMAIL_ADMIN.toLowerCase()) {
        authStatus.textContent = "Este email nao tem permissao para administrar os projetos.";
        return;
    }
    authStatus.textContent = "Validando email e senha...";
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senhaAdmin.value });
    authStatus.textContent = error ? `Falha no login: ${error.message}` : "Acesso autorizado.";
});

linkAcesso.addEventListener("click", async () => {
    const email = emailAdmin.value.trim().toLowerCase();
    if (email !== EMAIL_ADMIN.toLowerCase()) {
        authStatus.textContent = "Este email nao tem permissao para administrar os projetos.";
        return;
    }
    authStatus.textContent = "Enviando link de primeiro acesso...";
    const { error } = await supabaseClient.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split("#")[0] } });
    authStatus.textContent = error ? `Falha ao enviar o link: ${error.message}` : "Link enviado. Abra-o neste navegador e defina sua senha no painel.";
});

salvarSenha.addEventListener("click", async () => {
    if (!novaSenha.value || novaSenha.value.length < 8) {
        adminStatus.textContent = "A senha precisa ter pelo menos 8 caracteres.";
        novaSenha.focus();
        return;
    }
    if (novaSenha.value !== confirmarSenha.value) {
        adminStatus.textContent = "As senhas nao coincidem.";
        confirmarSenha.focus();
        return;
    }
    adminStatus.textContent = "Salvando senha...";
    const { error } = await supabaseClient.auth.updateUser({ password: novaSenha.value });
    adminStatus.textContent = error ? `Falha ao salvar a senha: ${error.message}` : "Senha definida. Nos proximos acessos, entre com email e senha.";
    if (!error) {
        novaSenha.value = "";
        confirmarSenha.value = "";
    }
});
document.querySelector("#sairAdmin").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    atualizarAcesso(null);
    authStatus.textContent = "Você saiu do painel de projetos.";
});

supabaseClient.auth.onAuthStateChange((_evento, sessao) => atualizarAcesso(sessao?.user));
supabaseClient.auth.getSession().then(({ data }) => atualizarAcesso(data.session?.user));

function limparEditor() {
    projetoEmEdicao = null;
    tituloProjeto.value = "";
    resumoTrabalho.value = "";
    fotoInput.value = "";
    videoInput.value = "";
    fotoTexto.textContent = "Adicionar fotos";
    videoTexto.textContent = "Adicionar vídeos";
    salvarProjetoBotao.textContent = "Salvar projeto";
}

function abrirFormulario(projeto = null) {
    limparEditor();
    projetoEmEdicao = projeto;
    if (projeto) {
        tituloProjeto.value = projeto.titulo || "";
        resumoTrabalho.value = projeto.resumo || "";
        fotoTexto.textContent = listaDeCaminhos(projeto.foto_paths || projeto.foto_path).length
            ? "Selecionar novas fotos para substituir as atuais"
            : "Adicionar fotos";
        videoTexto.textContent = listaDeCaminhos(projeto.video_paths || projeto.video_path).length
            ? "Selecionar novos vídeos para substituir os atuais"
            : "Adicionar vídeos";
        salvarProjetoBotao.textContent = "Salvar alterações";
    }
    editorConteudo.hidden = false;
    abrirEditor.hidden = true;
    tituloProjeto.focus();
}

function editarProjeto(projeto) {
    abrirFormulario(projeto);
    editorConteudo.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fecharFormulario() {
    limparEditor();
    editorConteudo.hidden = true;
    abrirEditor.hidden = false;
}

abrirEditor.addEventListener("click", () => abrirFormulario());
document.querySelector("#cancelarTrabalho").addEventListener("click", fecharFormulario);

fotoInput.addEventListener("change", () => {
    fotoTexto.textContent = fotoInput.files.length
        ? `${fotoInput.files.length} foto(s) selecionada(s)`
        : "Adicionar fotos";
});
videoInput.addEventListener("change", () => {
    videoTexto.textContent = videoInput.files.length
        ? `${videoInput.files.length} vídeo(s) selecionado(s)`
        : "Adicionar vídeos";
});

async function enviarMidias(arquivos, pasta, carregados) {
    const caminhos = [];
    for (const arquivo of arquivos) {
        const extensao = arquivo.name.includes(".")
            ? arquivo.name.split(".").pop().replace(/[^a-zA-Z0-9]/g, "")
            : "bin";
        const caminho = `${pasta}/${crypto.randomUUID()}.${extensao}`;
        const { error } = await supabaseClient.storage.from(BUCKET_TRABALHOS).upload(caminho, arquivo, {
            contentType: arquivo.type || "application/octet-stream",
            upsert: false
        });
        if (error) throw error;
        caminhos.push(caminho);
        carregados.push(caminho);
    }
    return caminhos;
}

async function removerProjeto(projeto) {
    if (!window.confirm(`Remover o projeto “${projeto.titulo}”? Essa ação não pode ser desfeita.`)) return;
    const { error } = await supabaseClient.from("trabalhos").delete().eq("id", projeto.id);
    if (error) {
        alert(`Não foi possível remover o projeto. ${error.message}`);
        return;
    }
    const midias = [
        ...listaDeCaminhos(projeto.foto_paths || projeto.foto_path),
        ...listaDeCaminhos(projeto.video_paths || projeto.video_path)
    ];
    if (midias.length) await supabaseClient.storage.from(BUCKET_TRABALHOS).remove(midias);
    adminStatus.textContent = "Projeto removido.";
    await carregarProjetos();
}

salvarProjetoBotao.addEventListener("click", async () => {
    const titulo = tituloProjeto.value.trim();
    const resumo = resumoTrabalho.value.trim();
    if (!titulo || !resumo) {
        adminStatus.textContent = "Preencha o título e a apresentação do projeto.";
        (!titulo ? tituloProjeto : resumoTrabalho).focus();
        return;
    }

    const botao = salvarProjetoBotao;
    const arquivosCarregados = [];
    botao.disabled = true;
    botao.textContent = "Salvando...";
    adminStatus.textContent = "Enviando o projeto e as mídias...";
    let novasFotos = null;
    let novosVideos = null;

    try {
        novasFotos = fotoInput.files.length
            ? await enviarMidias([...fotoInput.files], "fotos", arquivosCarregados)
            : null;
        novosVideos = videoInput.files.length
            ? await enviarMidias([...videoInput.files], "videos", arquivosCarregados)
            : null;

        const projeto = projetoEmEdicao;
        const valores = {
            titulo,
            resumo,
            foto_paths: novasFotos || (projeto ? listaDeCaminhos(projeto.foto_paths || projeto.foto_path) : []),
            video_paths: novosVideos || (projeto ? listaDeCaminhos(projeto.video_paths || projeto.video_path) : [])
        };

        let resposta;
        if (projeto) {
            resposta = await supabaseClient.from("trabalhos").update(valores).eq("id", projeto.id);
        } else {
            const proximoNumero = projetosCarregados.reduce((maior, item) => Math.max(maior, item.numero || 0), 0) + 1;
            resposta = await supabaseClient.from("trabalhos").insert({ ...valores, numero: proximoNumero });
        }
        if (resposta.error) throw resposta.error;

        if (projeto) {
            const midiasAnteriores = [
                ...(novasFotos ? listaDeCaminhos(projeto.foto_paths || projeto.foto_path) : []),
                ...(novosVideos ? listaDeCaminhos(projeto.video_paths || projeto.video_path) : [])
            ];
            if (midiasAnteriores.length) await supabaseClient.storage.from(BUCKET_TRABALHOS).remove(midiasAnteriores);
        }

        await carregarProjetos();
        fecharFormulario();
        adminStatus.textContent = projeto ? "Projeto atualizado com sucesso." : "Projeto publicado com sucesso.";
    } catch (error) {
        console.error("Erro ao salvar o projeto:", error);
        if (arquivosCarregados.length) await supabaseClient.storage.from(BUCKET_TRABALHOS).remove(arquivosCarregados);
        adminStatus.textContent = `Não foi possível salvar. Confira a configuração do Supabase e tente novamente. ${error.message || ""}`;
    } finally {
        botao.disabled = false;
        botao.textContent = projetoEmEdicao ? "Salvar alterações" : "Salvar projeto";
    }
});

carregarProjetos();

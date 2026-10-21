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
const tipoConteudo = document.querySelector("#tipoConteudo");
const projetoPai = document.querySelector("#projetoPai");
const projetoPaiCampo = document.querySelector("#projetoPaiCampo");
const linhaDoTempo = document.querySelector("#linhaDoTempo");
const timelineBotoes = document.querySelector("#timelineBotoes");
const timelineConteudo = document.querySelector("#timelineConteudo");

let projetosCarregados = [];
let projetoEmEdicao = null;
let atualizacaoEmEdicao = null;
let projetoEmConversao = null;
let atualizacoesCarregadas = {};
let administradorAtivo = false;
let aoFecharModal = null;

document.querySelector("#projetos").append(listaProjetos, projetosVazio);
salvarProjetoBotao.textContent = "Salvar projeto";
fotoTexto.textContent = "Adicionar fotos";
videoTexto.textContent = "Adicionar vídeos";

function mostrarProjeto(titulo, texto, atualizacoes = [], destinoInline = null, midiasApresentacao = null, aoFechar = null) {
    aoFecharModal = aoFechar;
    document.querySelector("#modalTitulo").textContent = titulo;
    const textoLegivel = String(texto || "").trim()
        .replace(/\s*\*\s*/g, "\n• ")
        .replace(/\s*(O que fizemos\?|Ideias que surgiram:?|O que decidimos\?|Dificuldades que tivemos:?|Pr[oó]ximo passo:?|O que pretendemos detectar\?|Resposta do sistema:?|Como funcionar[aá]\?)\s*/giu, "\n\n$1\n")
        .replace(/\n{3,}/g, "\n\n");
    const topicos = /(O que fizemos\?|Ideias que surgiram:?|O que decidimos\?|Dificuldades que tivemos:?|Pr[o\u00F3]ximo passo:?|O que pretendemos detectar\?|Resposta do sistema:?|Como funcionar[a\u00E1]\?|Detec[c\u00E7][a\u00E3]o de objetos)/giu;
    const modalTexto = document.querySelector("#modalTexto");
    modalTexto.replaceChildren();
    let inicio = 0;
    let topico;
    while ((topico = topicos.exec(textoLegivel)) !== null) {
        const antes = textoLegivel.slice(inicio, topico.index).trim();
        if (antes) modalTexto.append(document.createTextNode(antes));
        const destaque = document.createElement("strong");
        destaque.className = "modal-topico";
        destaque.textContent = topico[0];
        modalTexto.append(destaque);
        inicio = topico.index + topico[0].length;
    }
    const restante = textoLegivel.slice(inicio).trim();
    if (restante) modalTexto.append(document.createTextNode(restante));
    linhaDoTempo.hidden = atualizacoes.length === 0;
    timelineBotoes.replaceChildren();
    timelineConteudo.replaceChildren();
    const larguraDoDeck = destinoInline?.clientWidth || timelineBotoes.clientWidth;
    const espalhamento = atualizacoes.length > 1
        ? Math.min(38, Math.max(15, (larguraDoDeck - 150) / (atualizacoes.length - 1)))
        : 0;
    atualizacoes.forEach((atualizacao, indice) => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "timeline-card";
        botao.style.setProperty("--card-x", `${(indice - (atualizacoes.length - 1) / 2) * espalhamento}px`);
        botao.style.setProperty("--card-rotate", `${(indice - (atualizacoes.length - 1) / 2) * 5}deg`);
        botao.style.zIndex = String(indice + 1);
        const numero = document.createElement("span");
        numero.className = "timeline-card-numero";
        numero.textContent = indice === 0 ? "PROJETO" : `ETAPA ${String(indice).padStart(2, "0")}`;
        const tituloCard = document.createElement("strong");
        tituloCard.textContent = atualizacao.titulo;
        botao.append(numero, tituloCard);
        botao.setAttribute("aria-label", `Abrir ${numero.textContent}: ${atualizacao.titulo}`);
        botao.addEventListener("click", () => mostrarAtualizacao(atualizacao, botao));
        timelineBotoes.append(botao);
    });
    if (atualizacoes.length) mostrarAtualizacao(atualizacoes[0], timelineBotoes.firstElementChild);
    if (destinoInline) {
        destinoInline.append(modalTexto, linhaDoTempo);
        modal.classList.remove("aberto");
    } else {
        const caixaModal = modal.querySelector(".modal-caixa");
        caixaModal.querySelector(".modal-midias")?.remove();
        caixaModal.append(modalTexto, linhaDoTempo);
        const fotos = listaDeCaminhos(midiasApresentacao?.foto_paths || midiasApresentacao?.foto_path);
        const videos = listaDeCaminhos(midiasApresentacao?.video_paths || midiasApresentacao?.video_path);
        if (fotos.length || videos.length) {
            const gradeMidias = document.createElement("div");
            gradeMidias.className = "modal-midias";
            fotos.forEach((caminho) => {
                const imagem = document.createElement("img");
                imagem.src = urlMidia(caminho);
                imagem.alt = `Foto de ${titulo}`;
                gradeMidias.append(imagem);
            });
            videos.forEach((caminho) => {
                const video = document.createElement("video");
                video.src = urlMidia(caminho);
                video.controls = true;
                video.preload = "metadata";
                video.setAttribute("aria-label", `Vídeo de ${titulo}`);
                gradeMidias.append(video);
            });
            caixaModal.append(gradeMidias);
        }
        modal.classList.add("aberto");
    }
}

function mostrarAtualizacao(atualizacao, botaoAtivo) {
    timelineBotoes.querySelectorAll("button").forEach((botao, indice) => {
        const ativo = botao === botaoAtivo;
        botao.classList.toggle("ativo", ativo);
        botao.style.zIndex = ativo ? "100" : String(indice + 1);
    });
    timelineConteudo.replaceChildren();
    const titulo = document.createElement("h4");
    titulo.textContent = atualizacao.titulo;
    const data = document.createElement("time");
    data.textContent = new Date(atualizacao.created_at).toLocaleDateString("pt-BR");
    const texto = document.createElement("p");
    texto.textContent = atualizacao.resumo;
    const midias = document.createElement("div");
    midias.className = "diario-trabalho-midias";
    listaDeCaminhos(atualizacao.foto_paths).forEach((caminho) => {
        const imagem = document.createElement("img");
        imagem.src = urlMidia(caminho);
        imagem.alt = `Foto da atualização ${atualizacao.titulo}`;
        midias.append(imagem);
    });
    listaDeCaminhos(atualizacao.video_paths).forEach((caminho) => {
        const video = document.createElement("video");
        video.src = urlMidia(caminho);
        video.controls = true;
        midias.append(video);
    });
    timelineConteudo.append(titulo, data, texto);
    if (midias.childElementCount) timelineConteudo.append(midias);
}

function fecharProjeto() {
    modal.classList.remove("aberto");
    const callback = aoFecharModal;
    aoFecharModal = null;
    callback?.();
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

function preencherMidiasProjeto(midias, etapa, projeto) {
    midias.replaceChildren();
    const fotos = listaDeCaminhos(etapa.foto_paths || etapa.foto_path);
    const videos = listaDeCaminhos(etapa.video_paths || etapa.video_path);
    fotos.forEach((caminho) => {
        const imagem = document.createElement("img");
        imagem.src = urlMidia(caminho);
        imagem.alt = `Foto de ${etapa.titulo || projeto.titulo}`;
        midias.append(imagem);
    });
    videos.forEach((caminho) => {
        const video = document.createElement("video");
        video.controls = true;
        video.preload = "metadata";
        video.src = urlMidia(caminho);
        video.setAttribute("aria-label", `Vídeo de ${etapa.titulo || projeto.titulo}`);
        midias.append(video);
    });
    if (!midias.childElementCount) {
        const capa = document.createElement("div");
        capa.className = "projeto-imagem";
        capa.textContent = `PROJETO ${String(projeto.numero).padStart(2, "0")}`;
        midias.append(capa);
    }
}

function criarCardProjeto(projeto) {
    const card = document.createElement("article");
    card.className = "projeto";
    const etapas = [projeto, ...(atualizacoesCarregadas[projeto.id] || [])];
    let etapaAtiva = 0;

    const deck = document.createElement("section");
    deck.className = "projeto-etapas";
    const deckTitulo = document.createElement("h4");
    deckTitulo.textContent = "Etapas e atualizações";
    const cartas = document.createElement("div");
    cartas.className = "timeline-botoes";
    const controles = document.createElement("div");
    controles.className = "timeline-controles";
    const etapaAnterior = document.createElement("button");
    etapaAnterior.type = "button";
    etapaAnterior.className = "timeline-controle";
    etapaAnterior.textContent = "← Anterior";
    const etapaIndicador = document.createElement("span");
    etapaIndicador.className = "timeline-indicador";
    const proximaEtapa = document.createElement("button");
    proximaEtapa.type = "button";
    proximaEtapa.className = "timeline-controle";
    proximaEtapa.textContent = "Próxima →";
    controles.append(etapaAnterior, etapaIndicador, proximaEtapa);
    deck.append(deckTitulo, cartas, controles);

    const midias = document.createElement("div");
    midias.className = "projeto-midias";

    const conteudo = document.createElement("div");
    conteudo.className = "projeto-conteudo";
    const etiqueta = document.createElement("span");
    const titulo = document.createElement("h3");
    const resumo = document.createElement("p");
    resumo.className = "projeto-resumo-preview";
    const data = document.createElement("time");
    data.className = "projeto-etapa-data";
    const detalhes = document.createElement("button");
    detalhes.type = "button";
    detalhes.className = "ver-mais";
    detalhes.textContent = "Ver apresentação →";
    const selecionarEtapa = (indice) => {
        etapaAtiva = indice;
        const etapa = etapas[indice];
        etapaIndicador.textContent = `${indice + 1} de ${etapas.length}`;
        etiqueta.textContent = indice === 0
            ? `PROJETO ${String(projeto.numero).padStart(2, "0")}`
            : `ATUALIZAÇÃO ${String(indice).padStart(2, "0")}`;
        titulo.textContent = etapa.titulo || `Projeto ${projeto.numero}`;
        resumo.textContent = etapa.resumo || "";
        data.textContent = etapa.created_at ? new Date(etapa.created_at).toLocaleDateString("pt-BR") : "";
        if (etapas.length === 1) preencherMidiasProjeto(midias, etapa, projeto);
        cartas.querySelectorAll(".timeline-card").forEach((carta, cartaIndice) => {
            const ativa = cartaIndice === indice;
            carta.classList.toggle("ativo", ativa);
            carta.style.zIndex = ativa ? "100" : String(cartaIndice + 1);
            carta.style.setProperty("--current-x", ativa ? "0px" : carta.dataset.x);
        });
    };

    if (etapas.length > 1) {
        const espacamento = Math.min(58, Math.max(20, (380 - 210) / (etapas.length - 1)));
        etapas.forEach((etapa, indice) => {
            const carta = document.createElement("div");
            carta.className = "timeline-card";
            carta.dataset.x = `${(indice - (etapas.length - 1) / 2) * espacamento}px`;
            carta.style.setProperty("--card-x", carta.dataset.x);
            carta.style.setProperty("--current-x", carta.dataset.x);
            carta.style.setProperty("--card-rotate", `${(indice - (etapas.length - 1) / 2) * 5}deg`);
            carta.style.zIndex = String(indice + 1);
            const botaoCarta = document.createElement("button");
            botaoCarta.type = "button";
            botaoCarta.className = "timeline-card-select";
            const numero = document.createElement("span");
            numero.className = "timeline-card-numero";
            numero.textContent = indice === 0 ? "PROJETO" : `ETAPA ${String(indice).padStart(2, "0")}`;
            const fotoCapa = listaDeCaminhos(etapa.foto_paths || etapa.foto_path)[0];
            const videoCapa = listaDeCaminhos(etapa.video_paths || etapa.video_path)[0];
            if (fotoCapa) {
                const imagemCarta = document.createElement("img");
                imagemCarta.className = "timeline-card-foto";
                imagemCarta.src = urlMidia(fotoCapa);
                imagemCarta.alt = "";
                imagemCarta.setAttribute("aria-hidden", "true");
                carta.append(imagemCarta);
            } else if (videoCapa) {
                const videoCarta = document.createElement("video");
                videoCarta.className = "timeline-card-video";
                videoCarta.src = urlMidia(videoCapa);
                videoCarta.muted = true;
                videoCarta.autoplay = true;
                videoCarta.loop = true;
                videoCarta.playsInline = true;
                videoCarta.preload = "metadata";
                videoCarta.setAttribute("aria-hidden", "true");
                carta.append(videoCarta);
            }
            const tituloCarta = document.createElement("strong");
            tituloCarta.textContent = etapa.titulo || `Projeto ${projeto.numero}`;
            botaoCarta.append(numero, tituloCarta);
            carta.append(botaoCarta);
            if (videoCapa) {
                const seloVideo = document.createElement("button");
                seloVideo.type = "button";
                seloVideo.className = "timeline-card-video-badge";
                seloVideo.textContent = "▶ VÍDEO";
                seloVideo.setAttribute("aria-label", `Reproduzir vídeo de ${etapa.titulo || projeto.titulo}`);
                seloVideo.addEventListener("click", () => {
                    mostrarProjeto(etapa.titulo || projeto.titulo, etapa.resumo || "", [], null, { video_paths: [videoCapa] }, () => selecionarEtapa(0));
                });
                carta.append(seloVideo);
            }
            botaoCarta.setAttribute("aria-label", `Mostrar ${numero.textContent}: ${etapa.titulo || projeto.titulo}`);
            botaoCarta.addEventListener("click", () => selecionarEtapa(indice));
            cartas.append(carta);
        });
        etapaAnterior.addEventListener("click", () => {
            selecionarEtapa((etapaAtiva - 1 + etapas.length) % etapas.length);
        });
        proximaEtapa.addEventListener("click", () => {
            selecionarEtapa((etapaAtiva + 1) % etapas.length);
        });
    } else {
        controles.hidden = true;
    }
    detalhes.addEventListener("click", () => {
        const etapa = etapas[etapaAtiva];
        mostrarProjeto(etapa.titulo || projeto.titulo, etapa.resumo || "", [], null, etapa, () => selecionarEtapa(0));
    });
    conteudo.append(etiqueta, titulo, data, resumo, detalhes);
    if (etapas.length > 1) card.append(deck);
    else card.append(midias);
    card.append(conteudo);
    selecionarEtapa(etapaAtiva);
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
    const adicionarAtualizacao = document.createElement("button");
    adicionarAtualizacao.type = "button";
    adicionarAtualizacao.className = "cancelar-trabalho";
    adicionarAtualizacao.textContent = "Adicionar atualização";
    adicionarAtualizacao.addEventListener("click", () => abrirAtualizacao(projeto));
    const converter = document.createElement("button");
    converter.type = "button";
    converter.className = "cancelar-trabalho";
    converter.textContent = "Converter em atualização";
    converter.disabled = (atualizacoesCarregadas[projeto.id] || []).length > 0;
    if (converter.disabled) converter.title = "Este projeto já tem atualizações; converta as etapas individualmente para preservar o histórico.";
    converter.addEventListener("click", () => converterProjetoEmAtualizacao(projeto));
    acoes.append(editar, adicionarAtualizacao, converter, remover);
    item.append(informacoes, acoes);
    (atualizacoesCarregadas[projeto.id] || []).forEach((atualizacao, indice) => {
        const etapa = document.createElement("div");
        etapa.className = "admin-atualizacao-item";
        const nome = document.createElement("span");
        nome.textContent = `Atualização ${indice + 1}: ${atualizacao.titulo}`;
        const editarEtapa = document.createElement("button");
        editarEtapa.type = "button";
        editarEtapa.className = "cancelar-trabalho";
        editarEtapa.textContent = "Editar atualização";
        editarEtapa.addEventListener("click", () => abrirAtualizacao(projeto, atualizacao));
        const excluirEtapa = document.createElement("button");
        excluirEtapa.type = "button";
        excluirEtapa.className = "cancelar-trabalho";
        excluirEtapa.textContent = "Remover";
        excluirEtapa.addEventListener("click", () => removerAtualizacao(projeto, atualizacao));
        etapa.append(nome, editarEtapa, excluirEtapa);
        item.append(etapa);
    });
    listaTrabalhos.appendChild(item);
}

async function carregarProjetos() {
    const { data, error } = await supabaseClient.from("trabalhos")
        .select("id, numero, titulo, resumo, foto_path, video_path, foto_paths, video_paths, created_at")
        .order("numero", { ascending: true });
    if (error) {
        console.error("Erro ao carregar projetos:", error);
        projetosVazio.hidden = false;
        projetosVazio.textContent = `Não foi possível carregar os projetos. Erro ${error.code || "sem código"}: ${error.message || "motivo não informado"}`;
        if (adminStatus) adminStatus.textContent = `Falha ao carregar projetos: ${error.message || "motivo não informado"}`;
        return;
    }
    projetosCarregados = data || [];
    const resultadoAtualizacoes = await supabaseClient.from("atualizacoes_trabalhos")
        .select("id, trabalho_id, titulo, resumo, foto_paths, video_paths, created_at")
        .order("created_at", { ascending: true });
    atualizacoesCarregadas = {};
    if (resultadoAtualizacoes.error) {
        console.warn("Histórico indisponível. Execute a migração SQL atualizada.", resultadoAtualizacoes.error);
        if (administradorAtivo) adminStatus.textContent = "Para ativar o histórico interativo, execute a versão atualizada de supabase-setup.sql no Supabase.";
    } else {
        (resultadoAtualizacoes.data || []).forEach((atualizacao) => {
            (atualizacoesCarregadas[atualizacao.trabalho_id] ||= []).push(atualizacao);
        });
    }
    projetoPai.replaceChildren(...projetosCarregados.map((projeto) => {
        const opcao = document.createElement("option");
        opcao.value = projeto.id;
        opcao.textContent = projeto.titulo;
        return opcao;
    }));
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
    atualizacaoEmEdicao = null;
    projetoEmConversao = null;
    tituloProjeto.value = "";
    resumoTrabalho.value = "";
    fotoInput.value = "";
    videoInput.value = "";
    fotoTexto.textContent = "Adicionar fotos";
    videoTexto.textContent = "Adicionar vídeos";
    salvarProjetoBotao.textContent = "Salvar projeto";
    tipoConteudo.value = "projeto";
    tipoConteudo.disabled = false;
    projetoPaiCampo.hidden = true;
    projetoPai.disabled = false;
    document.querySelector("#tituloProjetoLabel").textContent = "Título do projeto";
    document.querySelector("#resumoProjetoLabel").textContent = "Apresentação do projeto";
    tituloProjeto.placeholder = "Nome do projeto";
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

function abrirAtualizacao(projeto, atualizacao = null) {
    abrirFormulario();
    tipoConteudo.value = "atualizacao";
    tipoConteudo.disabled = Boolean(atualizacao);
    projetoPaiCampo.hidden = false;
    projetoPai.value = projeto.id;
    projetoPai.disabled = Boolean(atualizacao);
    atualizacaoEmEdicao = atualizacao;
    document.querySelector("#tituloProjetoLabel").textContent = "Título desta atualização";
    document.querySelector("#resumoProjetoLabel").textContent = "O que mudou nesta etapa?";
    tituloProjeto.placeholder = "Ex.: Montagem do circuito";
    salvarProjetoBotao.textContent = atualizacao ? "Salvar atualização" : "Publicar atualização";
    if (atualizacao) {
        tituloProjeto.value = atualizacao.titulo;
        resumoTrabalho.value = atualizacao.resumo;
    }
    editorConteudo.scrollIntoView({ behavior: "smooth", block: "center" });
}

function converterProjetoEmAtualizacao(projeto) {
    if ((atualizacoesCarregadas[projeto.id] || []).length) {
        adminStatus.textContent = "Este projeto já tem atualizações. Para preservar o histórico, converta as etapas individualmente.";
        return;
    }
    abrirFormulario();
    projetoEmConversao = projeto;
    tipoConteudo.value = "atualizacao";
    tipoConteudo.disabled = true;
    projetoPaiCampo.hidden = false;
    projetoPai.replaceChildren(...projetosCarregados
        .filter((item) => item.id !== projeto.id)
        .map((item) => {
            const opcao = document.createElement("option");
            opcao.value = item.id;
            opcao.textContent = item.titulo;
            return opcao;
        }));
    projetoPai.value = projetoPai.options[0]?.value || "";
    tituloProjeto.value = projeto.titulo || "";
    resumoTrabalho.value = projeto.resumo || "";
    document.querySelector("#tituloProjetoLabel").textContent = "Título da atualização";
    document.querySelector("#resumoProjetoLabel").textContent = "Descrição da atualização";
    fotoTexto.textContent = listaDeCaminhos(projeto.foto_paths || projeto.foto_path).length
        ? "As fotos atuais serão mantidas (ou selecione outras)"
        : "Adicionar fotos";
    videoTexto.textContent = listaDeCaminhos(projeto.video_paths || projeto.video_path).length
        ? "Os vídeos atuais serão mantidos (ou selecione outros)"
        : "Adicionar vídeos";
    salvarProjetoBotao.textContent = "Converter e salvar atualização";
    adminStatus.textContent = projetosCarregados.length < 2
        ? "É necessário haver outro projeto publicado para receber esta atualização."
        : "Escolha o projeto de destino. O conteúdo e as mídias atuais serão reaproveitados.";
    editorConteudo.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fecharFormulario() {
    limparEditor();
    editorConteudo.hidden = true;
    abrirEditor.hidden = false;
}

abrirEditor.addEventListener("click", () => abrirFormulario());
tipoConteudo.addEventListener("change", () => {
    const ehAtualizacao = tipoConteudo.value === "atualizacao";
    projetoPaiCampo.hidden = !ehAtualizacao;
    document.querySelector("#tituloProjetoLabel").textContent = ehAtualizacao ? "Título desta atualização" : "Título do projeto";
    document.querySelector("#resumoProjetoLabel").textContent = ehAtualizacao ? "O que mudou nesta etapa?" : "Apresentação do projeto";
});
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
    const { data: atualizacoes, error: erroHistorico } = await supabaseClient.from("atualizacoes_trabalhos")
        .select("foto_paths, video_paths").eq("trabalho_id", projeto.id);
    if (erroHistorico) {
        alert(`Não foi possível conferir as mídias das atualizações. ${erroHistorico.message}`);
        return;
    }
    const { error } = await supabaseClient.from("trabalhos").delete().eq("id", projeto.id);
    if (error) {
        alert(`Não foi possível remover o projeto. ${error.message}`);
        return;
    }
    const midias = [
        ...listaDeCaminhos(projeto.foto_paths || projeto.foto_path),
        ...listaDeCaminhos(projeto.video_paths || projeto.video_path),
        ...(atualizacoes || []).flatMap((atualizacao) => [...listaDeCaminhos(atualizacao.foto_paths), ...listaDeCaminhos(atualizacao.video_paths)])
    ];
    if (midias.length) await supabaseClient.storage.from(BUCKET_TRABALHOS).remove(midias);
    adminStatus.textContent = "Projeto removido.";
    await carregarProjetos();
}

async function removerAtualizacao(projeto, atualizacao) {
    if (!window.confirm(`Remover a atualização “${atualizacao.titulo}”?`)) return;
    const { error } = await supabaseClient.from("atualizacoes_trabalhos").delete().eq("id", atualizacao.id);
    if (error) {
        alert(`Não foi possível remover a atualização. ${error.message}`);
        return;
    }
    const midias = [...listaDeCaminhos(atualizacao.foto_paths), ...listaDeCaminhos(atualizacao.video_paths)];
    if (midias.length) await supabaseClient.storage.from(BUCKET_TRABALHOS).remove(midias);
    await carregarProjetos();
    adminStatus.textContent = "Atualização removida.";
}

salvarProjetoBotao.addEventListener("click", async () => {
    const ehAtualizacao = tipoConteudo.value === "atualizacao";
    if (projetoEmConversao && !window.confirm("Este projeto será removido da lista de cards e incluído como atualização do projeto escolhido. Texto e mídias serão mantidos. Continuar?")) return;
    const titulo = tituloProjeto.value.trim();
    const resumo = resumoTrabalho.value.trim();
    if (!titulo || !resumo || (ehAtualizacao && !projetoPai.value)) {
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

        if (ehAtualizacao) {
            const editandoAtualizacao = Boolean(atualizacaoEmEdicao);
            const projetoConvertido = projetoEmConversao;
            const valoresAtualizacao = {
                trabalho_id: projetoPai.value,
                titulo,
                resumo,
                foto_paths: novasFotos || listaDeCaminhos(atualizacaoEmEdicao?.foto_paths || projetoConvertido?.foto_paths || projetoConvertido?.foto_path),
                video_paths: novosVideos || listaDeCaminhos(atualizacaoEmEdicao?.video_paths || projetoConvertido?.video_paths || projetoConvertido?.video_path)
            };
            const respostaAtualizacao = projetoConvertido
                ? await supabaseClient.from("atualizacoes_trabalhos").insert(valoresAtualizacao).select("id").single()
                : atualizacaoEmEdicao
                ? await supabaseClient.from("atualizacoes_trabalhos").update(valoresAtualizacao).eq("id", atualizacaoEmEdicao.id)
                : await supabaseClient.from("atualizacoes_trabalhos").insert(valoresAtualizacao);
            if (respostaAtualizacao.error) throw respostaAtualizacao.error;
            if (projetoConvertido) {
                const exclusaoProjeto = await supabaseClient.from("trabalhos").delete().eq("id", projetoConvertido.id);
                if (exclusaoProjeto.error) {
                    await supabaseClient.from("atualizacoes_trabalhos").delete().eq("id", respostaAtualizacao.data.id);
                    throw exclusaoProjeto.error;
                }
            }
            const antigas = [
                ...(novasFotos ? listaDeCaminhos(atualizacaoEmEdicao?.foto_paths || projetoConvertido?.foto_paths || projetoConvertido?.foto_path) : []),
                ...(novosVideos ? listaDeCaminhos(atualizacaoEmEdicao?.video_paths || projetoConvertido?.video_paths || projetoConvertido?.video_path) : [])
            ];
            if (antigas.length) await supabaseClient.storage.from(BUCKET_TRABALHOS).remove(antigas);
            await carregarProjetos();
            fecharFormulario();
            adminStatus.textContent = projetoConvertido ? "Projeto convertido e incluído no histórico selecionado." : editandoAtualizacao ? "Atualização editada." : "Atualização publicada dentro do projeto.";
            return;
        }

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

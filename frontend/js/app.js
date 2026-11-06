// ==========================================================
// app.js — interface: formulários, tabelas e registro de requisições
// ==========================================================
(() => {
  const ROTULOS_PERFIL = { EMPREENDEDOR_MEI: 'Empreendedor MEI', ADMINISTRADOR: 'Administrador' };
  const SQL = { GET: 'SELECT', POST: 'INSERT', PUT: 'UPDATE', DELETE: 'DELETE' };
  const $ = id => document.getElementById(id);

  // Configuração de cada recurso (uma entrada por tabela)
  const recursos = {
    perfil: {
      rota: '/perfis',
      tabela: 'perfil',
      form: $('form-perfil'),
      busca: $('busca-perfil'),
      porId: $('id-perfil'),
      tbody: $('tbody-perfil'),
      status: $('status-perfil'),
      colunas: 3,
      lerForm: f => ({ nome: f.elements.nome.value }),
      preencher: (f, i) => { f.elements.nome.value = i.nome; },
      consulta: f => ({ nome: f.elements.q.value.trim() }),
      celulas: i => [i.id, ROTULOS_PERFIL[i.nome] || i.nome],
    },
    categoria: {
      rota: '/categorias',
      tabela: 'categoria',
      form: $('form-categoria'),
      busca: $('busca-categoria'),
      porId: $('id-categoria'),
      tbody: $('tbody-categoria'),
      status: $('status-categoria'),
      colunas: 5,
      lerForm: f => ({
        nome: f.elements.nome.value,
        tipo: f.elements.tipo.value,
        ativa: f.elements.ativa.checked,
      }),
      preencher: (f, i) => {
        f.elements.nome.value = i.nome;
        f.elements.tipo.value = i.tipo;
        f.elements.ativa.checked = i.ativa;
      },
      consulta: f => ({ busca: f.elements.q.value.trim(), tipo: f.elements.tipo.value }),
      celulas: i => [i.id, i.nome, i.tipo === 'RECEITA' ? 'Receita' : 'Despesa', i.ativa ? 'sim' : 'não'],
    },
  };

  // ---------- Registro de requisições ----------
  const log = $('log');

  function registrar(metodo, caminho, corpo, resposta, tabela) {
    const li = document.createElement('li');

    const titulo = document.createElement('strong');
    titulo.textContent = `${metodo} ${caminho}`;

    const resumo = document.createElement('span');
    resumo.textContent = ` → ${resposta.status || 'sem resposta'} (${SQL[metodo]} na tabela ${tabela}) às ${new Date().toLocaleTimeString('pt-BR')}`;

    const detalhes = document.createElement('details');
    const sumario = document.createElement('summary');
    sumario.textContent = 'Ver requisição e resposta';
    const pre = document.createElement('pre');
    pre.textContent =
      `Requisição: ${metodo} ${caminho}\n` +
      `Corpo: ${corpo ? JSON.stringify(corpo, null, 2) : '(vazio)'}\n\n` +
      `Resposta (${resposta.status}):\n${JSON.stringify(resposta.data, null, 2)}`;
    detalhes.append(sumario, pre);

    li.append(titulo, resumo, detalhes);
    log.prepend(li);
  }

  $('limpar-log').addEventListener('click', () => { log.textContent = ''; });

  // ---------- Chamadas ----------
  function mensagemErro(dados) {
    if (dados && dados.detail) return typeof dados.detail === 'string' ? dados.detail : JSON.stringify(dados.detail);
    return 'erro desconhecido.';
  }

  async function chamar(chave, metodo, caminho, corpo, silencioso = false) {
    const r = recursos[chave];
    const resposta = await Api.request(metodo, caminho, corpo);
    registrar(metodo, caminho, corpo, resposta, r.tabela);
    if (!silencioso) {
      r.status.textContent = resposta.ok
        ? `Sucesso (${resposta.status}).`
        : `Erro ${resposta.status}: ${mensagemErro(resposta.data)}`;
    }
    return resposta;
  }

  // ---------- Tabela ----------
  function renderizar(chave, itens) {
    const r = recursos[chave];
    r.tbody.textContent = '';

    if (itens.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = r.colunas;
      td.textContent = 'Nenhum registro encontrado.';
      tr.append(td);
      r.tbody.append(tr);
      return;
    }

    for (const item of itens) {
      const tr = document.createElement('tr');
      for (const valor of r.celulas(item)) {
        const td = document.createElement('td');
        td.textContent = valor;
        tr.append(td);
      }
      const acoes = document.createElement('td');
      for (const [acao, rotulo] of [['editar', 'Editar'], ['excluir', 'Excluir']]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.acao = acao;
        b.dataset.id = item.id;
        b.textContent = rotulo;
        acoes.append(b);
      }
      tr.append(acoes);
      r.tbody.append(tr);
    }
  }

  // GET (listar / pesquisar)
  async function listar(chave, silencioso = false) {
    const r = recursos[chave];
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(r.consulta(r.busca))) if (v) params.set(k, v);
    const qs = params.toString();
    const resposta = await chamar(chave, 'GET', r.rota + (qs ? `?${qs}` : ''), null, silencioso);
    if (resposta.ok) renderizar(chave, resposta.data);
  }

  // ---------- Modo edição ----------
  function modoEdicao(chave, ativo) {
    const r = recursos[chave];
    r.form.querySelector('[type="submit"]').textContent = ativo ? 'Salvar alteração' : 'Cadastrar';
    r.form.querySelector('[data-cancelar]').hidden = !ativo;
  }

  function sairDaEdicao(chave) {
    recursos[chave].form.reset();
    modoEdicao(chave, false);
  }

  // ---------- Eventos ----------
  for (const chave of Object.keys(recursos)) {
    const r = recursos[chave];

    // POST (cadastrar) ou PUT (salvar alteração)
    r.form.addEventListener('submit', async e => {
      e.preventDefault();
      const id = r.form.elements.id.value;
      const corpo = r.lerForm(r.form);
      const resposta = id
        ? await chamar(chave, 'PUT', `${r.rota}/${id}`, corpo)
        : await chamar(chave, 'POST', r.rota, corpo);
      if (resposta.ok) {
        sairDaEdicao(chave);
        await listar(chave, true);
      }
    });

    r.form.querySelector('[data-cancelar]').addEventListener('click', () => {
      sairDaEdicao(chave);
      r.status.textContent = 'Edição cancelada.';
    });

    // GET (listar / pesquisar)
    r.busca.addEventListener('submit', e => { e.preventDefault(); listar(chave); });

    // GET /{id}
    r.porId.addEventListener('submit', async e => {
      e.preventDefault();
      const id = r.porId.elements.id.value;
      const resposta = await chamar(chave, 'GET', `${r.rota}/${id}`);
      renderizar(chave, resposta.ok ? [resposta.data] : []);
    });

    // Editar (GET /{id} + preencher) e Excluir (DELETE /{id})
    r.tbody.addEventListener('click', async e => {
      const botao = e.target.closest('button[data-acao]');
      if (!botao) return;
      const id = botao.dataset.id;

      if (botao.dataset.acao === 'editar') {
        const resposta = await chamar(chave, 'GET', `${r.rota}/${id}`);
        if (resposta.ok) {
          r.preencher(r.form, resposta.data);
          r.form.elements.id.value = resposta.data.id;
          modoEdicao(chave, true);
          r.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
          r.status.textContent = `Editando o registro ${id}. Altere os campos e clique em "Salvar alteração".`;
        }
      }

      if (botao.dataset.acao === 'excluir') {
        if (!confirm(`Excluir o registro ${id} da tabela ${r.tabela}?`)) return;
        const resposta = await chamar(chave, 'DELETE', `${r.rota}/${id}`);
        if (resposta.ok) {
          if (r.form.elements.id.value === id) sairDaEdicao(chave);
          await listar(chave, true);
        }
      }
    });
  }

  // ---------- Conexão ----------
  const baseUrl = $('base-url');
  const simulado = $('modo-simulado');

  function aplicarConexao() {
    Api.config.baseUrl = baseUrl.value;
    Api.config.simulado = simulado.checked;
    baseUrl.disabled = simulado.checked;
    for (const chave of Object.keys(recursos)) listar(chave);
  }

  baseUrl.addEventListener('change', aplicarConexao);
  simulado.addEventListener('change', aplicarConexao);

  aplicarConexao();
})();

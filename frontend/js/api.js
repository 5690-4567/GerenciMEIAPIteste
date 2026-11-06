// ==========================================================
// api.js — camada de comunicação (equivalente ao "cliente" da API)
// Modo real:      fetch() para a API Node/Express (PostgreSQL)
// Modo simulado:  banco em memória com as mesmas rotas e regras
// Toda resposta tem o formato { ok, status, data }
// ==========================================================
const Api = (() => {
  const config = { baseUrl: 'http://localhost:3000', simulado: true };

  const resp = (status, data) => ({ ok: status >= 200 && status < 300, status, data });

  // ---------- Modo real ----------
  async function requisicaoReal(metodo, caminho, corpo) {
    try {
      const r = await fetch(config.baseUrl.replace(/\/$/, '') + caminho, {
        method: metodo,
        headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
      const texto = await r.text();
      let data = null;
      try { data = texto ? JSON.parse(texto) : null; } catch { data = texto; }
      return resp(r.status, data);
    } catch (e) {
      return resp(0, { detail: 'Não foi possível conectar à API. Ela está rodando? (ou use o modo simulado)' });
    }
  }

  // ---------- Modo simulado ----------
  const banco = {
    perfis: [
      { id: 1, nome: 'ADMINISTRADOR' },
      { id: 2, nome: 'EMPREENDEDOR_MEI' },
    ],
    categorias: [
      { id: 1, nome: 'Vendas', tipo: 'RECEITA', ativa: true },
      { id: 2, nome: 'Aluguel', tipo: 'DESPESA', ativa: true },
    ],
    proximoId: { perfis: 3, categorias: 3 },
  };

  const NOMES_PERFIL = ['EMPREENDEDOR_MEI', 'ADMINISTRADOR'];
  const TIPOS_CATEGORIA = ['RECEITA', 'DESPESA'];

  const validadores = {
    perfis(corpo, id) {
      if (!NOMES_PERFIL.includes(corpo?.nome)) {
        return { erro: [422, 'nome deve ser EMPREENDEDOR_MEI ou ADMINISTRADOR.'] };
      }
      if (banco.perfis.some(p => p.nome === corpo.nome && p.id !== id)) {
        return { erro: [409, 'Esse perfil já está cadastrado.'] };
      }
      return { valor: { nome: corpo.nome } };
    },
    categorias(corpo) {
      const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim() : '';
      if (!nome || nome.length > 100) return { erro: [422, 'nome é obrigatório (até 100 caracteres).'] };
      if (!TIPOS_CATEGORIA.includes(corpo.tipo)) return { erro: [422, 'tipo deve ser RECEITA ou DESPESA.'] };
      const ativa = corpo.ativa === undefined ? true : corpo.ativa;
      if (typeof ativa !== 'boolean') return { erro: [422, 'ativa deve ser true ou false.'] };
      return { valor: { nome, tipo: corpo.tipo, ativa } };
    },
  };

  const naoEncontrado = { perfis: 'Perfil não encontrado.', categorias: 'Categoria não encontrada.' };
  const excluido = { perfis: 'Perfil excluído com sucesso.', categorias: 'Categoria excluída com sucesso.' };

  function filtrar(recurso, params) {
    let itens = banco[recurso];
    if (recurso === 'perfis' && params.get('nome')) {
      const t = params.get('nome').toLowerCase();
      itens = itens.filter(p => p.nome.toLowerCase().includes(t));
    }
    if (recurso === 'categorias') {
      if (params.get('busca')) {
        const t = params.get('busca').toLowerCase();
        itens = itens.filter(c => c.nome.toLowerCase().includes(t));
      }
      if (params.get('tipo')) itens = itens.filter(c => c.tipo === params.get('tipo'));
    }
    return itens;
  }

  async function requisicaoSimulada(metodo, caminho, corpo) {
    await new Promise(r => setTimeout(r, 150)); // simula a latência da rede
    const url = new URL(caminho, 'http://simulado');
    const [, recurso, idTexto] = url.pathname.split('/');
    if (!banco[recurso]) return resp(404, { detail: 'Rota não encontrada.' });

    const lista = banco[recurso];
    const temId = idTexto !== undefined;
    const id = temId ? Number(idTexto) : null;
    if (temId && (!Number.isInteger(id) || id < 1)) return resp(422, { detail: 'id inválido.' });

    const indice = temId ? lista.findIndex(i => i.id === id) : -1;

    if (metodo === 'GET' && !temId) return resp(200, filtrar(recurso, url.searchParams));
    if (metodo === 'GET') {
      return indice < 0 ? resp(404, { detail: naoEncontrado[recurso] }) : resp(200, lista[indice]);
    }
    if (metodo === 'POST' && !temId) {
      const { erro, valor } = validadores[recurso](corpo, null);
      if (erro) return resp(erro[0], { detail: erro[1] });
      const novo = { id: banco.proximoId[recurso]++, ...valor };
      lista.push(novo);
      return resp(201, novo);
    }
    if (metodo === 'PUT' && temId) {
      if (indice < 0) return resp(404, { detail: naoEncontrado[recurso] });
      const { erro, valor } = validadores[recurso](corpo, id);
      if (erro) return resp(erro[0], { detail: erro[1] });
      lista[indice] = { id, ...valor };
      return resp(200, lista[indice]);
    }
    if (metodo === 'DELETE' && temId) {
      if (indice < 0) return resp(404, { detail: naoEncontrado[recurso] });
      lista.splice(indice, 1);
      return resp(200, { mensagem: excluido[recurso] });
    }
    return resp(405, { detail: 'Método não permitido.' });
  }

  // ---------- Interface pública ----------
  function request(metodo, caminho, corpo) {
    return config.simulado
      ? requisicaoSimulada(metodo, caminho, corpo)
      : requisicaoReal(metodo, caminho, corpo);
  }

  return { config, request };
})();

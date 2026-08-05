/* =====================================================================
   interpretador_csharp.js
   Mini-interpretador de C# (subconjunto didático) usado pelo
   "Laboratório Perdido" para executar de verdade o código do aluno.

   Suporta:
     - tipos primitivos: int, long, short, byte, double, float, decimal,
       string, bool, char, object, var
     - arrays (int[] a = new int[5], int[] a = {1,2,3}) e List<T>
     - Console.Write / WriteLine / ReadLine / ReadKey / Clear
     - if / else if / else, switch, for, while, do-while, foreach
     - break, continue, return
     - métodos estáticos definidos pelo aluno
     - interpolação $"...", verbatim @"...", formatação {x:F2}
     - Math, Convert, int.Parse / double.Parse / bool.Parse,
       int.TryParse (com out) e os métodos de string mais comuns

   API pública:
     CSharp.executar(codigo, { entradas:["50"] })
        -> { ok:true, saida:"...", linhas:[...] }
         | { ok:false, erro:"mensagem", linha:12 }

     CSharp.analisar(codigo)
        -> { ok:true, recursos:{ 'tipo:int':true, 'estrutura:for':true, ... } }
         | { ok:false, erro:"mensagem", linha:12 }

     CSharp.ROTULOS_RECURSOS -> rótulos em português para a interface
   ===================================================================== */
(function (global) {
'use strict';

/* ===================== ERROS ===================== */
function CsErro(msg, linha) {
  this.name = 'CsErro';
  this.message = msg;
  this.linha = linha || null;
}
CsErro.prototype.toString = function () { return this.message; };
function erro(msg, linha) { throw new CsErro(msg, linha); }

/* ===================== LÉXICO ===================== */
var PALAVRAS = ['int','long','short','byte','uint','double','float','decimal',
  'string','bool','char','object','var','if','else','while','do','for','foreach',
  'in','switch','case','default','break','continue','return','true','false','null',
  'new','using','namespace','class','struct','static','void','public','private',
  'protected','internal','const','readonly','out','ref','this','partial','sealed',
  'abstract','override','virtual','try','catch','finally','throw','goto','enum','interface'];

var TIPOS_NUM_INT = ['int','long','short','byte','uint'];
var TIPOS_NUM_DEC = ['double','float','decimal'];

var OPERADORES = ['==','!=','<=','>=','&&','||','++','--','+=','-=','*=','/=','%=','=>','??'];
var SIMBOLOS = '+-*/%=<>!&|?:;,.(){}[]';

function ehLetra(c) { return /[A-Za-z_@]/.test(c); }
function ehIdent(c) { return /[A-Za-z0-9_]/.test(c); }
function ehDigito(c) { return c >= '0' && c <= '9'; }

function lerTexto(src, i, verbatim, linha) {
  // src[i] === '"'
  i++;
  var bruto = '', valor = '';
  var fechou = false;
  while (i < src.length) {
    var c = src[i];
    if (verbatim) {
      if (c === '"') {
        if (src[i + 1] === '"') { bruto += '""'; valor += '"'; i += 2; continue; }
        i++; fechou = true; break;
      }
      if (c === '\n') linha++;
      bruto += c; valor += c; i++;
    } else {
      if (c === '"') { i++; fechou = true; break; }
      if (c === '\n') erro('Texto entre aspas não foi fechado nesta linha.', linha);
      if (c === '\\') {
        var p = src[i + 1];
        bruto += c + p;
        valor += desescapar(p);
        i += 2; continue;
      }
      bruto += c; valor += c; i++;
    }
  }
  if (!fechou) erro('Faltou fechar as aspas de um texto.', linha);
  return { i: i, linha: linha, bruto: bruto, valor: valor };
}

function desescapar(c) {
  if (c === 'n') return '\n';
  if (c === 't') return '\t';
  if (c === 'r') return '';
  if (c === '0') return '\0';
  if (c === '\\') return '\\';
  if (c === '"') return '"';
  if (c === "'") return "'";
  return c;
}
function desescaparTexto(s) {
  var out = '';
  for (var i = 0; i < s.length; i++) {
    if (s[i] === '\\') { out += desescapar(s[i + 1]); i++; }
    else out += s[i];
  }
  return out;
}

function lex(src) {
  var toks = [], i = 0, linha = 1;
  function push(tipo, valor) { toks.push({ tipo: tipo, valor: valor, linha: linha }); }

  while (i < src.length) {
    var c = src[i];

    if (c === '\n') { linha++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }

    // comentários
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') linha++; i++; }
      i += 2; continue;
    }

    // diretivas de pré-processador: ignora a linha
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }

    // strings interpoladas / verbatim
    if ((c === '$' && (src[i + 1] === '"' || (src[i + 1] === '@' && src[i + 2] === '"'))) ||
        (c === '@' && (src[i + 1] === '"' || (src[i + 1] === '$' && src[i + 2] === '"')))) {
      var interp = false, verbatim = false;
      if (c === '$') { interp = true; i++; if (src[i] === '@') { verbatim = true; i++; } }
      else { verbatim = true; i++; if (src[i] === '$') { interp = true; i++; } }
      var r = lerTexto(src, i, verbatim, linha);
      i = r.i; linha = r.linha;
      if (interp) push('interp', { bruto: r.bruto, verbatim: verbatim });
      else push('texto', r.valor);
      continue;
    }
    if (c === '"') {
      var r2 = lerTexto(src, i, false, linha);
      i = r2.i; linha = r2.linha;
      push('texto', r2.valor);
      continue;
    }

    // char
    if (c === "'") {
      i++;
      var ch = src[i];
      if (ch === '\\') { ch = desescapar(src[i + 1]); i += 2; } else { i++; }
      if (src[i] !== "'") erro("Caractere entre aspas simples mal formado.", linha);
      i++;
      push('char', ch);
      continue;
    }

    // números
    if (ehDigito(c) || (c === '.' && ehDigito(src[i + 1]))) {
      var ini = i, temPonto = false;
      while (i < src.length && (ehDigito(src[i]) || src[i] === '_' ||
             (src[i] === '.' && ehDigito(src[i + 1]) && !temPonto))) {
        if (src[i] === '.') temPonto = true;
        i++;
      }
      var suf = '';
      if (i < src.length && /[fFdDmMlLuU]/.test(src[i])) { suf = src[i].toLowerCase(); i++; }
      var txt = src.slice(ini, i).replace(/_/g, '').replace(/[fFdDmMlLuU]$/, '');
      var decimalT = temPonto || suf === 'f' || suf === 'd' || suf === 'm';
      push('numero', { valor: parseFloat(txt), decimal: decimalT });
      continue;
    }

    // identificadores / palavras-chave
    if (ehLetra(c)) {
      var ini2 = i;
      if (src[i] === '@') i++;
      while (i < src.length && ehIdent(src[i])) i++;
      var nome = src.slice(ini2, i).replace(/^@/, '');
      if (PALAVRAS.indexOf(nome) >= 0) push('kw', nome);
      else push('ident', nome);
      continue;
    }

    // operadores
    var achou = null;
    for (var k = 0; k < OPERADORES.length; k++) {
      if (src.substr(i, OPERADORES[k].length) === OPERADORES[k]) { achou = OPERADORES[k]; break; }
    }
    if (achou) { push('op', achou); i += achou.length; continue; }
    if (SIMBOLOS.indexOf(c) >= 0) { push('op', c); i++; continue; }

    erro('Símbolo não reconhecido: "' + c + '"', linha);
  }
  toks.push({ tipo: 'eof', valor: null, linha: linha });
  return toks;
}

/* ===================== PARSER ===================== */
function Parser(toks) { this.t = toks; this.i = 0; }

Parser.prototype.atual = function () { return this.t[this.i]; };
Parser.prototype.espiar = function (n) { return this.t[this.i + (n || 0)]; };
Parser.prototype.linha = function () { return this.atual().linha; };
Parser.prototype.fim = function () { return this.atual().tipo === 'eof'; };
Parser.prototype.eh = function (tipo, valor) {
  var a = this.atual();
  if (a.tipo !== tipo) return false;
  if (valor === undefined) return true;
  return a.valor === valor;
};
Parser.prototype.pegar = function (tipo, valor) {
  if (this.eh(tipo, valor)) { return this.t[this.i++]; }
  return null;
};
Parser.prototype.exigir = function (tipo, valor, msg) {
  var tk = this.pegar(tipo, valor);
  if (!tk) {
    erro(msg || ('Esperava "' + (valor || tipo) + '" mas encontrei "' +
      descreverToken(this.atual()) + '".'), this.linha());
  }
  return tk;
};

function descreverToken(tk) {
  if (tk.tipo === 'eof') return 'fim do arquivo';
  if (tk.tipo === 'numero') return String(tk.valor.valor);
  if (tk.tipo === 'texto') return '"' + tk.valor + '"';
  if (tk.tipo === 'interp') return '$"..."';
  return String(tk.valor);
}

/* ---- tipos ---- */
Parser.prototype.tentarTipo = function () {
  var salvo = this.i;
  var a = this.atual();
  var nome = null;
  if (a.tipo === 'kw' && (TIPOS_NUM_INT.indexOf(a.valor) >= 0 || TIPOS_NUM_DEC.indexOf(a.valor) >= 0 ||
      ['string', 'bool', 'char', 'object', 'var', 'void'].indexOf(a.valor) >= 0)) {
    nome = a.valor; this.i++;
  } else if (a.tipo === 'ident') {
    nome = a.valor; this.i++;
  } else {
    return null;
  }
  var generico = null;
  if (this.eh('op', '<')) {
    // pode ser genérico OU comparação — só aceita se fechar com > sem quebrar
    var salvoG = this.i;
    this.i++;
    var interno = this.tentarTipo();
    if (interno && this.pegar('op', '>')) { generico = interno; }
    else { this.i = salvoG; this.i = salvo; return null; }
  }
  if (this.eh('op', '?')) {
    // nullable: só aceita se o próximo for identificador (evita confundir com ternário)
    if (this.espiar(1) && this.espiar(1).tipo === 'ident') this.i++;
  }
  var arranjo = false;
  while (this.eh('op', '[') && this.espiar(1) && this.espiar(1).tipo === 'op' && this.espiar(1).valor === ']') {
    this.i += 2; arranjo = true;
  }
  return { nome: nome, generico: generico, arranjo: arranjo };
};

Parser.prototype.ehDeclaracao = function () {
  var salvo = this.i;
  if (this.eh('kw', 'const')) return true;
  var t = null;
  try { t = this.tentarTipo(); } catch (e) { this.i = salvo; return false; }
  if (!t) { this.i = salvo; return false; }
  var ok = this.eh('ident');
  this.i = salvo;
  return ok;
};

/* ---- unidade de compilação ---- */
Parser.prototype.parsePrograma = function () {
  var topo = [], metodos = {};
  while (!this.fim()) {
    this.parseMembro(topo, metodos);
  }
  return { topo: topo, metodos: metodos };
};

Parser.prototype.parseMembro = function (topo, metodos) {
  // using ...;
  if (this.eh('kw', 'using')) {
    while (!this.fim() && !this.eh('op', ';')) this.i++;
    this.pegar('op', ';');
    return;
  }
  // namespace X { ... }  |  namespace X;
  if (this.eh('kw', 'namespace')) {
    this.i++;
    while (!this.fim() && !this.eh('op', '{') && !this.eh('op', ';')) this.i++;
    if (this.pegar('op', ';')) return;
    this.exigir('op', '{');
    while (!this.fim() && !this.eh('op', '}')) this.parseMembro(topo, metodos);
    this.exigir('op', '}');
    return;
  }
  // modificadores
  var salvo = this.i;
  var mods = 0;
  while (this.atual().tipo === 'kw' &&
         ['public', 'private', 'protected', 'internal', 'static', 'sealed', 'abstract',
          'partial', 'override', 'virtual', 'readonly'].indexOf(this.atual().valor) >= 0) {
    this.i++; mods++;
  }
  // class / struct / enum / interface
  if (this.eh('kw', 'class') || this.eh('kw', 'struct') || this.eh('kw', 'interface') || this.eh('kw', 'enum')) {
    this.i++;
    while (!this.fim() && !this.eh('op', '{')) this.i++;
    this.exigir('op', '{');
    while (!this.fim() && !this.eh('op', '}')) this.parseMembro(topo, metodos);
    this.exigir('op', '}');
    return;
  }
  // método?  TIPO Nome ( ... ) { ... }
  var salvoM = this.i;
  var tipoRet = this.tentarTipo();
  if (tipoRet && this.eh('ident') && this.espiar(1) && this.espiar(1).tipo === 'op' && this.espiar(1).valor === '(') {
    var nome = this.pegar('ident').valor;
    var params = this.parseParametros();
    if (this.eh('op', '{')) {
      var corpo = this.parseBloco();
      metodos[nome] = { nome: nome, params: params, corpo: corpo.corpo, retorno: tipoRet };
      return;
    }
    if (this.pegar('op', ';')) return; // assinatura sem corpo
  }
  this.i = salvoM;
  if (mods) {
    // era campo de classe com modificador -> trata como declaração normal
    topo.push(this.parseComando());
    return;
  }
  this.i = salvo;
  topo.push(this.parseComando());
};

Parser.prototype.parseParametros = function () {
  this.exigir('op', '(');
  var ps = [];
  while (!this.eh('op', ')')) {
    var porRef = false;
    if (this.pegar('kw', 'out') || this.pegar('kw', 'ref')) porRef = true;
    var tp = this.tentarTipo();
    var nm = this.exigir('ident', undefined, 'Esperava o nome de um parâmetro.').valor;
    ps.push({ tipo: tp, nome: nm, porRef: porRef });
    if (!this.pegar('op', ',')) break;
  }
  this.exigir('op', ')');
  return ps;
};

/* ---- comandos ---- */
Parser.prototype.parseBloco = function () {
  var ln = this.linha();
  this.exigir('op', '{');
  var corpo = [];
  while (!this.fim() && !this.eh('op', '}')) corpo.push(this.parseComando());
  this.exigir('op', '}', 'Faltou fechar uma chave "}".');
  return { k: 'bloco', corpo: corpo, linha: ln };
};

Parser.prototype.parseComando = function () {
  var ln = this.linha();

  if (this.eh('op', ';')) { this.i++; return { k: 'vazio', linha: ln }; }
  if (this.eh('op', '{')) return this.parseBloco();

  if (this.eh('kw', 'if')) {
    this.i++; this.exigir('op', '(');
    var cond = this.parseExpressao();
    this.exigir('op', ')');
    var entao = this.parseComando();
    var senao = null;
    if (this.pegar('kw', 'else')) senao = this.parseComando();
    return { k: 'se', cond: cond, entao: entao, senao: senao, linha: ln };
  }

  if (this.eh('kw', 'while')) {
    this.i++; this.exigir('op', '(');
    var c2 = this.parseExpressao();
    this.exigir('op', ')');
    return { k: 'enquanto', cond: c2, corpo: this.parseComando(), linha: ln };
  }

  if (this.eh('kw', 'do')) {
    this.i++;
    var corpoDo = this.parseComando();
    this.exigir('kw', 'while', 'Um "do" precisa terminar com "while (condição);".');
    this.exigir('op', '(');
    var c3 = this.parseExpressao();
    this.exigir('op', ')');
    this.pegar('op', ';');
    return { k: 'facaEnquanto', corpo: corpoDo, cond: c3, linha: ln };
  }

  if (this.eh('kw', 'for')) {
    this.i++; this.exigir('op', '(');
    var ini = null;
    if (!this.eh('op', ';')) {
      ini = this.ehDeclaracao() ? this.parseDeclaracao(true) : { k: 'expr', e: this.parseExpressao(), linha: ln };
    }
    this.exigir('op', ';');
    var cond4 = this.eh('op', ';') ? null : this.parseExpressao();
    this.exigir('op', ';');
    var passo = [];
    while (!this.eh('op', ')')) {
      passo.push(this.parseExpressao());
      if (!this.pegar('op', ',')) break;
    }
    this.exigir('op', ')');
    return { k: 'para', ini: ini, cond: cond4, passo: passo, corpo: this.parseComando(), linha: ln };
  }

  if (this.eh('kw', 'foreach')) {
    this.i++; this.exigir('op', '(');
    var tipoF = this.tentarTipo();
    var nomeF = this.exigir('ident', undefined, 'Esperava o nome da variável do foreach.').valor;
    this.exigir('kw', 'in', 'Um foreach precisa da palavra "in".');
    var col = this.parseExpressao();
    this.exigir('op', ')');
    return { k: 'paraCada', tipo: tipoF, nome: nomeF, colecao: col, corpo: this.parseComando(), linha: ln };
  }

  if (this.eh('kw', 'switch')) {
    this.i++; this.exigir('op', '(');
    var disc = this.parseExpressao();
    this.exigir('op', ')');
    this.exigir('op', '{');
    var casos = [];
    while (!this.fim() && !this.eh('op', '}')) {
      var rotulos = [], padrao = false;
      while (this.eh('kw', 'case') || this.eh('kw', 'default')) {
        if (this.pegar('kw', 'case')) {
          rotulos.push(this.parseExpressao());
          this.exigir('op', ':');
        } else {
          this.i++; padrao = true;
          this.exigir('op', ':');
        }
      }
      var corpoC = [];
      while (!this.fim() && !this.eh('op', '}') && !this.eh('kw', 'case') && !this.eh('kw', 'default')) {
        corpoC.push(this.parseComando());
      }
      casos.push({ rotulos: rotulos, padrao: padrao, corpo: corpoC });
    }
    this.exigir('op', '}');
    return { k: 'escolha', disc: disc, casos: casos, linha: ln };
  }

  if (this.pegar('kw', 'break')) { this.pegar('op', ';'); return { k: 'pare', linha: ln }; }
  if (this.pegar('kw', 'continue')) { this.pegar('op', ';'); return { k: 'continue', linha: ln }; }
  if (this.eh('kw', 'return')) {
    this.i++;
    var val = this.eh('op', ';') ? null : this.parseExpressao();
    this.pegar('op', ';');
    return { k: 'retorne', e: val, linha: ln };
  }
  if (this.eh('kw', 'throw')) {
    this.i++;
    while (!this.fim() && !this.eh('op', ';')) this.i++;
    this.pegar('op', ';');
    return { k: 'vazio', linha: ln };
  }
  if (this.eh('kw', 'try')) {
    this.i++;
    var b = this.parseBloco();
    while (this.eh('kw', 'catch') || this.eh('kw', 'finally')) {
      this.i++;
      if (this.eh('op', '(')) { var d = 0; do { if (this.eh('op', '(')) d++; if (this.eh('op', ')')) d--; this.i++; } while (d > 0 && !this.fim()); }
      this.parseBloco();
    }
    return b;
  }

  if (this.ehDeclaracao()) return this.parseDeclaracao(false);

  var e = this.parseExpressao();
  this.pegar('op', ';');
  return { k: 'expr', e: e, linha: ln };
};

Parser.prototype.parseDeclaracao = function (semPontoVirgula) {
  var ln = this.linha();
  this.pegar('kw', 'const');
  var tipo = this.tentarTipo();
  var decls = [];
  do {
    var nome = this.exigir('ident', undefined, 'Esperava o nome de uma variável.').valor;
    var init = null;
    if (this.pegar('op', '=')) {
      init = this.eh('op', '{') ? this.parseInicializadorLista() : this.parseExpressao();
    }
    decls.push({ nome: nome, init: init });
  } while (this.pegar('op', ','));
  if (!semPontoVirgula) this.pegar('op', ';');
  return { k: 'decl', tipo: tipo, decls: decls, linha: ln };
};

Parser.prototype.parseInicializadorLista = function () {
  var ln = this.linha();
  this.exigir('op', '{');
  var itens = [];
  while (!this.eh('op', '}')) {
    itens.push(this.eh('op', '{') ? this.parseInicializadorLista() : this.parseExpressao());
    if (!this.pegar('op', ',')) break;
  }
  this.exigir('op', '}');
  return { k: 'listaInit', itens: itens, linha: ln };
};

/* ---- expressões ---- */
Parser.prototype.parseExpressao = function () { return this.parseAtribuicao(); };

Parser.prototype.parseAtribuicao = function () {
  var esq = this.parseTernario();
  var a = this.atual();
  if (a.tipo === 'op' && ['=', '+=', '-=', '*=', '/=', '%='].indexOf(a.valor) >= 0) {
    this.i++;
    var dir = this.eh('op', '{') ? this.parseInicializadorLista() : this.parseAtribuicao();
    return { k: 'atrib', op: a.valor, alvo: esq, valor: dir, linha: a.linha };
  }
  return esq;
};

Parser.prototype.parseTernario = function () {
  var c = this.parseOu();
  if (this.eh('op', '?')) {
    var ln = this.linha();
    this.i++;
    var a = this.parseAtribuicao();
    this.exigir('op', ':');
    var b = this.parseAtribuicao();
    return { k: 'ternario', cond: c, a: a, b: b, linha: ln };
  }
  return c;
};

function nivelBinario(nome, ops, proximo) {
  Parser.prototype[nome] = function () {
    var e = this[proximo]();
    while (true) {
      var a = this.atual();
      if (a.tipo === 'op' && ops.indexOf(a.valor) >= 0) {
        this.i++;
        var d = this[proximo]();
        e = { k: 'bin', op: a.valor, esq: e, dir: d, linha: a.linha };
      } else break;
    }
    return e;
  };
}
nivelBinario('parseOu', ['||'], 'parseE');
nivelBinario('parseE', ['&&'], 'parseIgualdade');
nivelBinario('parseIgualdade', ['==', '!='], 'parseRelacional');
nivelBinario('parseRelacional', ['<', '>', '<=', '>='], 'parseSoma');
nivelBinario('parseSoma', ['+', '-'], 'parseProduto');
nivelBinario('parseProduto', ['*', '/', '%'], 'parseUnario');

var TIPOS_CAST = ['int', 'long', 'short', 'byte', 'double', 'float', 'decimal', 'char', 'string', 'bool'];

Parser.prototype.parseUnario = function () {
  var a = this.atual();
  if (a.tipo === 'op' && (a.valor === '!' || a.valor === '-' || a.valor === '+')) {
    this.i++;
    return { k: 'un', op: a.valor, e: this.parseUnario(), linha: a.linha };
  }
  if (a.tipo === 'op' && (a.valor === '++' || a.valor === '--')) {
    this.i++;
    return { k: 'pre', op: a.valor, e: this.parseUnario(), linha: a.linha };
  }
  // cast: (int)x
  if (a.tipo === 'op' && a.valor === '(') {
    var p1 = this.espiar(1), p2 = this.espiar(2);
    if (p1 && p1.tipo === 'kw' && TIPOS_CAST.indexOf(p1.valor) >= 0 &&
        p2 && p2.tipo === 'op' && p2.valor === ')') {
      this.i += 3;
      return { k: 'cast', tipo: p1.valor, e: this.parseUnario(), linha: a.linha };
    }
  }
  return this.parsePosfixo();
};

Parser.prototype.parsePosfixo = function () {
  var e = this.parsePrimario();
  while (true) {
    var a = this.atual();
    if (a.tipo === 'op' && a.valor === '.') {
      this.i++;
      var nome = this.atual();
      if (nome.tipo !== 'ident' && nome.tipo !== 'kw') erro('Esperava um nome depois do ponto.', a.linha);
      this.i++;
      e = { k: 'membro', obj: e, nome: nome.valor, linha: a.linha };
    } else if (a.tipo === 'op' && a.valor === '(') {
      this.i++;
      var args = [];
      while (!this.eh('op', ')')) {
        var porRef = !!(this.pegar('kw', 'out') || this.pegar('kw', 'ref'));
        if (porRef) {
          // "out int n" -> descarta o tipo; "out n" -> segue direto para o nome
          var salvoT = this.i;
          var td = this.tentarTipo();
          if (!td || !this.eh('ident')) this.i = salvoT;
        }
        var ex = this.parseExpressao();
        args.push({ e: ex, porRef: porRef });
        if (!this.pegar('op', ',')) break;
      }
      this.exigir('op', ')', 'Faltou fechar um parêntese ")".');
      e = { k: 'chamada', alvo: e, args: args, linha: a.linha };
    } else if (a.tipo === 'op' && a.valor === '[') {
      this.i++;
      var idx = this.parseExpressao();
      this.exigir('op', ']');
      e = { k: 'indice', obj: e, idx: idx, linha: a.linha };
    } else if (a.tipo === 'op' && (a.valor === '++' || a.valor === '--')) {
      this.i++;
      e = { k: 'pos', op: a.valor, e: e, linha: a.linha };
    } else break;
  }
  return e;
};

Parser.prototype.parsePrimario = function () {
  var a = this.atual(), ln = a.linha;

  if (a.tipo === 'numero') { this.i++; return { k: 'num', v: a.valor.valor, decimal: a.valor.decimal, linha: ln }; }
  if (a.tipo === 'texto') { this.i++; return { k: 'txt', v: a.valor, linha: ln }; }
  if (a.tipo === 'char') { this.i++; return { k: 'chr', v: a.valor, linha: ln }; }
  if (a.tipo === 'interp') { this.i++; return this.montarInterp(a.valor, ln); }
  if (a.tipo === 'kw' && a.valor === 'true') { this.i++; return { k: 'bool', v: true, linha: ln }; }
  if (a.tipo === 'kw' && a.valor === 'false') { this.i++; return { k: 'bool', v: false, linha: ln }; }
  if (a.tipo === 'kw' && a.valor === 'null') { this.i++; return { k: 'nulo', linha: ln }; }

  if (a.tipo === 'op' && a.valor === '(') {
    this.i++;
    var e = this.parseExpressao();
    this.exigir('op', ')', 'Faltou fechar um parêntese ")".');
    return e;
  }

  if (a.tipo === 'kw' && a.valor === 'new') {
    this.i++;
    var tipo = this.tentarTipo();
    if (!tipo) {
      // new[] { ... }
      if (this.eh('op', '[')) { this.i++; this.exigir('op', ']'); tipo = { nome: 'var', arranjo: true }; }
      else erro('Esperava um tipo depois de "new".', ln);
    }
    // new int[5] / new int[]{..}
    if (this.eh('op', '[')) {
      this.i++;
      var tam = this.eh('op', ']') ? null : this.parseExpressao();
      this.exigir('op', ']');
      var init = this.eh('op', '{') ? this.parseInicializadorLista() : null;
      return { k: 'novoArranjo', tipo: tipo, tamanho: tam, init: init, linha: ln };
    }
    if (tipo.arranjo) {
      var init2 = this.eh('op', '{') ? this.parseInicializadorLista() : null;
      return { k: 'novoArranjo', tipo: tipo, tamanho: null, init: init2, linha: ln };
    }
    var args = [];
    if (this.pegar('op', '(')) {
      while (!this.eh('op', ')')) { args.push({ e: this.parseExpressao() }); if (!this.pegar('op', ',')) break; }
      this.exigir('op', ')');
    }
    var initObj = this.eh('op', '{') ? this.parseInicializadorLista() : null;
    return { k: 'novoObj', tipo: tipo, args: args, init: initObj, linha: ln };
  }

  // tipos usados como "objeto" estático: int.Parse, string.Empty, double.Parse...
  if (a.tipo === 'kw' && TIPOS_CAST.indexOf(a.valor) >= 0) {
    this.i++;
    return { k: 'id', nome: a.valor, linha: ln };
  }

  if (a.tipo === 'ident') { this.i++; return { k: 'id', nome: a.valor, linha: ln }; }
  if (a.tipo === 'kw' && a.valor === 'this') { this.i++; return { k: 'id', nome: 'this', linha: ln }; }

  erro('Não entendi esta parte do código: "' + descreverToken(a) + '".', ln);
};

Parser.prototype.montarInterp = function (info, ln) {
  var bruto = info.bruto, verbatim = info.verbatim;
  var partes = [], buf = '', i = 0;
  while (i < bruto.length) {
    var c = bruto[i];
    if (c === '{' && bruto[i + 1] === '{') { buf += '{'; i += 2; continue; }
    if (c === '}' && bruto[i + 1] === '}') { buf += '}'; i += 2; continue; }
    if (c === '{') {
      if (buf) { partes.push({ lit: verbatim ? buf.replace(/""/g, '"') : desescaparTexto(buf) }); buf = ''; }
      var prof = 1, j = i + 1, src = '';
      while (j < bruto.length && prof > 0) {
        var d = bruto[j];
        if (d === '"') {
          src += d; j++;
          while (j < bruto.length && bruto[j] !== '"') { if (bruto[j] === '\\') { src += bruto[j]; j++; } src += bruto[j]; j++; }
          src += '"'; j++; continue;
        }
        if (d === '{') prof++;
        if (d === '}') { prof--; if (prof === 0) { j++; break; } }
        src += d; j++;
      }
      // separa formato ( {x:F2} )
      var fmt = null, nivel = 0, dentro = false, corte = -1;
      for (var q = 0; q < src.length; q++) {
        var ch = src[q];
        if (ch === '"') dentro = !dentro;
        if (dentro) continue;
        if (ch === '(' || ch === '[') nivel++;
        if (ch === ')' || ch === ']') nivel--;
        if (ch === ':' && nivel === 0) { corte = q; break; }
      }
      var exprSrc = src;
      if (corte >= 0) { exprSrc = src.slice(0, corte); fmt = src.slice(corte + 1).trim(); }
      var sub = new Parser(lex(exprSrc));
      partes.push({ expr: sub.parseExpressao(), fmt: fmt });
      i = j;
      continue;
    }
    buf += c; i++;
  }
  if (buf) partes.push({ lit: verbatim ? buf.replace(/""/g, '"') : desescaparTexto(buf) });
  return { k: 'interp', partes: partes, linha: ln };
};

/* ===================== VALORES ===================== */
function V(t, v) { return { t: t, v: v }; }
var NULO = { t: 'null', v: null };

function ehNumero(x) { return x.t === 'int' || x.t === 'double'; }

function fmtDouble(n) {
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
  if (Number.isInteger(n)) return String(n);
  var s = String(parseFloat(n.toPrecision(15)));
  return s;
}

function texto(x) {
  if (!x) return '';
  switch (x.t) {
    case 'string': return x.v;
    case 'bool': return x.v ? 'True' : 'False';
    case 'char': return x.v;
    case 'int': return String(x.v);
    case 'double': return fmtDouble(x.v);
    case 'null': return '';
    case 'array': case 'list': return '[' + x.v.map(texto).join(', ') + ']';
  }
  return String(x.v);
}

function aplicarFormato(x, fmt) {
  if (!fmt) return texto(x);
  var m = /^([FfNn])(\d*)$/.exec(fmt);
  if (m && ehNumero(x)) {
    var casas = m[2] === '' ? 2 : parseInt(m[2], 10);
    return x.v.toFixed(casas);
  }
  m = /^[Dd](\d*)$/.exec(fmt);
  if (m && ehNumero(x)) {
    var larg = m[1] === '' ? 0 : parseInt(m[1], 10);
    var s = String(Math.trunc(Math.abs(x.v)));
    while (s.length < larg) s = '0' + s;
    return (x.v < 0 ? '-' : '') + s;
  }
  m = /^[Pp](\d*)$/.exec(fmt);
  if (m && ehNumero(x)) {
    var c2 = m[1] === '' ? 2 : parseInt(m[1], 10);
    return (x.v * 100).toFixed(c2) + '%';
  }
  return texto(x);
}

function verdade(x, linha) {
  if (x.t === 'bool') return x.v;
  erro('Esperava uma condição verdadeiro/falso, mas veio um valor do tipo ' + nomeTipo(x) + '.', linha);
}

function nomeTipo(x) {
  var m = { int: 'int', double: 'double', string: 'string', bool: 'bool', char: 'char',
            array: 'array', list: 'List', null: 'null' };
  return m[x.t] || x.t;
}

function converterParaTipo(tipoNome, val, linha) {
  if (!tipoNome || tipoNome === 'var' || tipoNome === 'object') return val;
  if (TIPOS_NUM_INT.indexOf(tipoNome) >= 0) {
    if (val.t === 'int') return val;
    if (val.t === 'double') return V('int', Math.trunc(val.v));
    if (val.t === 'char') return V('int', val.v.charCodeAt(0));
    return val;
  }
  if (TIPOS_NUM_DEC.indexOf(tipoNome) >= 0) {
    if (ehNumero(val)) return V('double', val.v);
    return val;
  }
  if (tipoNome === 'string') {
    if (val.t === 'null') return NULO;
    if (val.t !== 'string') return V('string', texto(val));
    return val;
  }
  return val;
}

/* ===================== AMBIENTE ===================== */
function Ambiente(pai) { this.vars = {}; this.pai = pai; }
Ambiente.prototype.obter = function (n) {
  var e = this;
  while (e) { if (Object.prototype.hasOwnProperty.call(e.vars, n)) return e.vars[n]; e = e.pai; }
  return undefined;
};
Ambiente.prototype.existe = function (n) {
  var e = this;
  while (e) { if (Object.prototype.hasOwnProperty.call(e.vars, n)) return true; e = e.pai; }
  return false;
};
Ambiente.prototype.atribuir = function (n, v) {
  var e = this;
  while (e) { if (Object.prototype.hasOwnProperty.call(e.vars, n)) { e.vars[n] = v; return true; } e = e.pai; }
  return false;
};
Ambiente.prototype.declarar = function (n, v) { this.vars[n] = v; };

/* ===================== SINAIS DE CONTROLE ===================== */
var PARE = { sinal: 'pare' };
var SEGUIR = { sinal: 'continue' };
function Retorno(v) { this.sinal = 'retorno'; this.valor = v; }

/* ===================== INTERPRETADOR ===================== */
function Interpretador(opts) {
  opts = opts || {};
  this.entradas = (opts.entradas || []).slice();
  this.linhasSaida = [];
  this.buffer = '';
  this.passos = 0;
  this.maxPassos = opts.maxPassos || 400000;
  this.maxLinhas = opts.maxLinhas || 500;
  this.metodos = {};
  this.global = new Ambiente(null);
}

Interpretador.prototype.tick = function (linha) {
  if (++this.passos > this.maxPassos) {
    erro('O programa rodou tempo demais — provavelmente há um laço que nunca termina (verifique a condição de parada).', linha);
  }
};

Interpretador.prototype.escrever = function (s) {
  this.buffer += s;
  if (this.buffer.length > 20000) erro('O programa gerou texto demais na saída.', null);
};
Interpretador.prototype.novaLinha = function (linha) {
  this.linhasSaida.push(this.buffer);
  this.buffer = '';
  if (this.linhasSaida.length > this.maxLinhas) {
    erro('O programa imprimiu mais de ' + this.maxLinhas + ' linhas — verifique se algum laço não está se repetindo sem parar.', linha);
  }
};
Interpretador.prototype.saidaFinal = function () {
  var l = this.linhasSaida.slice();
  if (this.buffer.length) l.push(this.buffer);
  return l.join('\n');
};

Interpretador.prototype.rodar = function (prog) {
  this.metodos = prog.metodos;
  var env = new Ambiente(this.global);
  if (this.metodos['Main']) {
    // executa também as declarações soltas (campos estáticos) antes
    this.execBloco(prog.topo, env);
    this.execBloco(this.metodos['Main'].corpo, new Ambiente(env));
  } else {
    this.execBloco(prog.topo, env);
  }
};

Interpretador.prototype.execBloco = function (lista, env) {
  for (var i = 0; i < lista.length; i++) {
    var r = this.exec(lista[i], env);
    if (r) return r;
  }
  return null;
};

Interpretador.prototype.exec = function (s, env) {
  this.tick(s.linha);
  switch (s.k) {
    case 'vazio': return null;

    case 'bloco': return this.execBloco(s.corpo, new Ambiente(env));

    case 'expr': this.aval(s.e, env); return null;

    case 'decl': {
      var tn = s.tipo ? s.tipo.nome : 'var';
      for (var i = 0; i < s.decls.length; i++) {
        var d = s.decls[i];
        var val;
        if (d.init === null) val = this.valorPadrao(s.tipo);
        else if (d.init.k === 'listaInit') val = this.avalListaInit(d.init, s.tipo, env);
        else val = converterParaTipo(tn, this.aval(d.init, env), s.linha);
        env.declarar(d.nome, val);
      }
      return null;
    }

    case 'se':
      if (verdade(this.aval(s.cond, env), s.linha)) return this.exec(s.entao, env);
      else if (s.senao) return this.exec(s.senao, env);
      return null;

    case 'enquanto':
      while (verdade(this.aval(s.cond, env), s.linha)) {
        this.tick(s.linha);
        var r1 = this.exec(s.corpo, env);
        if (r1 === PARE) break;
        if (r1 && r1 !== SEGUIR) return r1;
      }
      return null;

    case 'facaEnquanto':
      do {
        this.tick(s.linha);
        var r2 = this.exec(s.corpo, env);
        if (r2 === PARE) break;
        if (r2 && r2 !== SEGUIR) return r2;
      } while (verdade(this.aval(s.cond, env), s.linha));
      return null;

    case 'para': {
      var envP = new Ambiente(env);
      if (s.ini) this.exec(s.ini, envP);
      while (s.cond === null || verdade(this.aval(s.cond, envP), s.linha)) {
        this.tick(s.linha);
        var r3 = this.exec(s.corpo, envP);
        if (r3 === PARE) break;
        if (r3 && r3 !== SEGUIR) return r3;
        for (var p = 0; p < s.passo.length; p++) this.aval(s.passo[p], envP);
      }
      return null;
    }

    case 'paraCada': {
      var col = this.aval(s.colecao, env);
      var itens;
      if (col.t === 'array' || col.t === 'list') itens = col.v;
      else if (col.t === 'string') itens = col.v.split('').map(function (c) { return V('char', c); });
      else erro('O foreach precisa percorrer uma lista, um array ou um texto.', s.linha);
      for (var j = 0; j < itens.length; j++) {
        this.tick(s.linha);
        var envF = new Ambiente(env);
        envF.declarar(s.nome, itens[j]);
        var r4 = this.exec(s.corpo, envF);
        if (r4 === PARE) break;
        if (r4 && r4 !== SEGUIR) return r4;
      }
      return null;
    }

    case 'escolha': {
      var d2 = this.aval(s.disc, env);
      var envS = new Ambiente(env);
      var idx = -1, padraoIdx = -1;
      for (var c = 0; c < s.casos.length && idx < 0; c++) {
        if (s.casos[c].padrao) padraoIdx = c;
        for (var l = 0; l < s.casos[c].rotulos.length; l++) {
          if (iguais(d2, this.aval(s.casos[c].rotulos[l], envS))) { idx = c; break; }
        }
      }
      if (idx < 0) idx = padraoIdx;
      if (idx < 0) return null;
      for (var cc = idx; cc < s.casos.length; cc++) {
        var r5 = this.execBloco(s.casos[cc].corpo, envS);
        if (r5 === PARE) return null;
        if (r5) return r5;
      }
      return null;
    }

    case 'pare': return PARE;
    case 'continue': return SEGUIR;
    case 'retorne': return new Retorno(s.e ? this.aval(s.e, env) : NULO);
  }
  erro('Comando não suportado pelo simulador.', s.linha);
};

Interpretador.prototype.valorPadrao = function (tipo) {
  if (!tipo) return NULO;
  var n = tipo.nome;
  if (tipo.arranjo) return NULO;
  if (TIPOS_NUM_INT.indexOf(n) >= 0) return V('int', 0);
  if (TIPOS_NUM_DEC.indexOf(n) >= 0) return V('double', 0);
  if (n === 'bool') return V('bool', false);
  if (n === 'char') return V('char', '\0');
  return NULO;
};

Interpretador.prototype.avalListaInit = function (node, tipo, env) {
  var self = this;
  var itens = node.itens.map(function (x) {
    return x.k === 'listaInit' ? self.avalListaInit(x, null, env) : self.aval(x, env);
  });
  var t = (tipo && tipo.nome === 'List') ? 'list' : 'array';
  return V(t, itens);
};

/* ---- avaliação de expressões ---- */
Interpretador.prototype.aval = function (e, env) {
  this.tick(e.linha);
  switch (e.k) {
    case 'num': return V(e.decimal ? 'double' : 'int', e.v);
    case 'txt': return V('string', e.v);
    case 'chr': return V('char', e.v);
    case 'bool': return V('bool', e.v);
    case 'nulo': return NULO;

    case 'interp': {
      var s = '';
      for (var i = 0; i < e.partes.length; i++) {
        var p = e.partes[i];
        if (p.lit !== undefined) s += p.lit;
        else s += aplicarFormato(this.aval(p.expr, env), p.fmt);
      }
      return V('string', s);
    }

    case 'id': {
      if (env.existe(e.nome)) return env.obter(e.nome);
      if (this.metodos[e.nome]) return { t: 'metodo', v: e.nome };
      if (['Console', 'Math', 'Convert', 'String'].indexOf(e.nome) >= 0 ||
          TIPOS_CAST.indexOf(e.nome) >= 0) return { t: 'classe', v: e.nome };
      erro('A variável "' + e.nome + '" não foi declarada antes de ser usada.', e.linha);
      break;
    }

    case 'listaInit': return this.avalListaInit(e, null, env);

    case 'bin': {
      if (e.op === '&&') {
        if (!verdade(this.aval(e.esq, env), e.linha)) return V('bool', false);
        return V('bool', verdade(this.aval(e.dir, env), e.linha));
      }
      if (e.op === '||') {
        if (verdade(this.aval(e.esq, env), e.linha)) return V('bool', true);
        return V('bool', verdade(this.aval(e.dir, env), e.linha));
      }
      return binario(e.op, this.aval(e.esq, env), this.aval(e.dir, env), e.linha);
    }

    case 'un': {
      var v = this.aval(e.e, env);
      if (e.op === '!') return V('bool', !verdade(v, e.linha));
      if (!ehNumero(v)) erro('Não dá para usar "' + e.op + '" em um valor do tipo ' + nomeTipo(v) + '.', e.linha);
      return V(v.t, e.op === '-' ? -v.v : v.v);
    }

    case 'ternario':
      return verdade(this.aval(e.cond, env), e.linha) ? this.aval(e.a, env) : this.aval(e.b, env);

    case 'cast': {
      var val = this.aval(e.e, env);
      if (TIPOS_NUM_INT.indexOf(e.tipo) >= 0) {
        if (val.t === 'char') return V('int', val.v.charCodeAt(0));
        if (!ehNumero(val)) erro('Não dá para converter ' + nomeTipo(val) + ' para ' + e.tipo + ' com um cast.', e.linha);
        return V('int', Math.trunc(val.v));
      }
      if (TIPOS_NUM_DEC.indexOf(e.tipo) >= 0) return V('double', val.v);
      if (e.tipo === 'char' && ehNumero(val)) return V('char', String.fromCharCode(val.v));
      if (e.tipo === 'string') return V('string', texto(val));
      return val;
    }

    case 'pre': case 'pos': {
      var atual = this.lerAlvo(e.e, env);
      if (!ehNumero(atual)) erro('Só dá para usar ++ ou -- em números.', e.linha);
      var novo = V(atual.t, e.op === '++' ? atual.v + 1 : atual.v - 1);
      this.gravarAlvo(e.e, novo, env);
      return e.k === 'pre' ? novo : atual;
    }

    case 'atrib': {
      var novoVal;
      if (e.op === '=') {
        novoVal = e.valor.k === 'listaInit' ? this.avalListaInit(e.valor, null, env) : this.aval(e.valor, env);
      } else {
        var a0 = this.lerAlvo(e.alvo, env);
        novoVal = binario(e.op.charAt(0), a0, this.aval(e.valor, env), e.linha);
        if (a0.t === 'int' && novoVal.t === 'double') novoVal = V('int', Math.trunc(novoVal.v));
        if (a0.t === 'string') novoVal = V('string', texto(novoVal));
      }
      this.gravarAlvo(e.alvo, novoVal, env);
      return novoVal;
    }

    case 'indice': {
      var obj = this.aval(e.obj, env);
      var idx = this.aval(e.idx, env);
      if (obj.t === 'string') {
        if (idx.v < 0 || idx.v >= obj.v.length) erro('Índice ' + idx.v + ' fora dos limites do texto.', e.linha);
        return V('char', obj.v.charAt(idx.v));
      }
      if (obj.t !== 'array' && obj.t !== 'list') erro('Só dá para usar [ ] em arrays, listas ou textos.', e.linha);
      if (idx.v < 0 || idx.v >= obj.v.length) {
        erro('Índice ' + idx.v + ' fora dos limites (a coleção tem ' + obj.v.length + ' posições, de 0 a ' + (obj.v.length - 1) + ').', e.linha);
      }
      return obj.v[idx.v];
    }

    case 'membro': return this.avalMembro(e, env);

    case 'chamada': return this.avalChamada(e, env);

    case 'novoArranjo': {
      if (e.init) {
        var itens = e.init.itens.map(function (x) { return this.aval(x, env); }, this);
        return V('array', itens);
      }
      var n = this.aval(e.tamanho, env);
      var arr = [];
      for (var q = 0; q < n.v; q++) arr.push(this.valorPadrao({ nome: e.tipo.nome }));
      return V('array', arr);
    }

    case 'novoObj': {
      var nomeT = e.tipo.nome;
      if (nomeT === 'List') {
        var lst = [];
        if (e.init) lst = e.init.itens.map(function (x) { return this.aval(x, env); }, this);
        return V('list', lst);
      }
      if (nomeT === 'Random') return V('random', {});
      erro('O simulador não conhece o tipo "' + nomeT + '". Use os tipos básicos, arrays ou List<T>.', e.linha);
      break;
    }
  }
  erro('Expressão não suportada pelo simulador.', e.linha);
};

Interpretador.prototype.lerAlvo = function (alvo, env) {
  if (alvo.k === 'id') {
    if (!env.existe(alvo.nome)) erro('A variável "' + alvo.nome + '" não foi declarada.', alvo.linha);
    return env.obter(alvo.nome);
  }
  return this.aval(alvo, env);
};

Interpretador.prototype.gravarAlvo = function (alvo, val, env) {
  if (alvo.k === 'id') {
    if (!env.atribuir(alvo.nome, val)) {
      erro('A variável "' + alvo.nome + '" não foi declarada antes de receber um valor.', alvo.linha);
    }
    return;
  }
  if (alvo.k === 'indice') {
    var obj = this.aval(alvo.obj, env);
    var idx = this.aval(alvo.idx, env);
    if (obj.t !== 'array' && obj.t !== 'list') erro('Só dá para atribuir com [ ] em arrays ou listas.', alvo.linha);
    if (idx.v < 0 || idx.v >= obj.v.length) erro('Índice ' + idx.v + ' fora dos limites da coleção.', alvo.linha);
    obj.v[idx.v] = val;
    return;
  }
  erro('Não dá para atribuir um valor a esta expressão.', alvo.linha);
};

/* ---- membros (propriedades) ---- */
Interpretador.prototype.avalMembro = function (e, env) {
  // classes estáticas conhecidas
  if (e.obj.k === 'id') {
    var n = e.obj.nome;
    if (!env.existe(n)) {
      if (n === 'Math') {
        if (e.nome === 'PI') return V('double', Math.PI);
        if (e.nome === 'E') return V('double', Math.E);
      }
      if (n === 'string' || n === 'String') {
        if (e.nome === 'Empty') return V('string', '');
      }
      if (n === 'int') {
        if (e.nome === 'MaxValue') return V('int', 2147483647);
        if (e.nome === 'MinValue') return V('int', -2147483648);
      }
      if (['Console', 'Math', 'Convert', 'String', 'string'].indexOf(n) >= 0 || TIPOS_CAST.indexOf(n) >= 0) {
        return { t: 'estatico', v: n + '.' + e.nome };
      }
    }
  }
  var obj = this.aval(e.obj, env);
  if (obj.t === 'array' && e.nome === 'Length') return V('int', obj.v.length);
  if (obj.t === 'list' && (e.nome === 'Count' || e.nome === 'Length')) return V('int', obj.v.length);
  if (obj.t === 'string' && e.nome === 'Length') return V('int', obj.v.length);
  return { t: 'metodoInstancia', v: { obj: obj, nome: e.nome } };
};

/* ---- chamadas ---- */
Interpretador.prototype.avalChamada = function (e, env) {
  var self = this;
  var alvo = e.alvo;
  var linha = e.linha;

  function args() {
    return e.args.map(function (a) { return self.aval(a.e, env); });
  }

  // Console.*, Math.*, Convert.*, int.Parse, etc.
  if (alvo.k === 'membro' && alvo.obj.k === 'id' && !env.existe(alvo.obj.nome)) {
    var cls = alvo.obj.nome, m = alvo.nome;

    if (cls === 'Console') {
      if (m === 'WriteLine' || m === 'Write') {
        var vs = args();
        var s = '';
        if (vs.length === 1) s = texto(vs[0]);
        else if (vs.length > 1) {
          s = texto(vs[0]);
          if (vs[0].t === 'string' && /\{\d+\}/.test(vs[0].v)) {
            s = vs[0].v.replace(/\{(\d+)(?::([^}]*))?\}/g, function (_, i2, f) {
              var v2 = vs[parseInt(i2, 10) + 1];
              return v2 === undefined ? '' : aplicarFormato(v2, f);
            });
          } else {
            for (var q = 1; q < vs.length; q++) s += texto(vs[q]);
          }
        }
        self.escrever(s);
        if (m === 'WriteLine') self.novaLinha(linha);
        return NULO;
      }
      if (m === 'ReadLine') {
        if (!self.entradas.length) return NULO;
        return V('string', self.entradas.shift());
      }
      if (m === 'ReadKey' || m === 'Read') return NULO;
      if (m === 'Clear') { return NULO; }
      erro('Console.' + m + ' não é suportado pelo simulador. Use Write, WriteLine ou ReadLine.', linha);
    }

    if (cls === 'Math') {
      var a = args().map(function (x) { return x.v; });
      var tipos = args();
      var todosInt = tipos.every(function (x) { return x.t === 'int'; });
      switch (m) {
        case 'Abs': return V(todosInt ? 'int' : 'double', Math.abs(a[0]));
        case 'Max': return V(todosInt ? 'int' : 'double', Math.max(a[0], a[1]));
        case 'Min': return V(todosInt ? 'int' : 'double', Math.min(a[0], a[1]));
        case 'Pow': return V('double', Math.pow(a[0], a[1]));
        case 'Sqrt': return V('double', Math.sqrt(a[0]));
        case 'Round': return V('double', a.length > 1 ? parseFloat(a[0].toFixed(a[1])) : Math.round(a[0]));
        case 'Floor': return V('double', Math.floor(a[0]));
        case 'Ceiling': return V('double', Math.ceil(a[0]));
        case 'Truncate': return V('double', Math.trunc(a[0]));
      }
      erro('Math.' + m + ' não é suportado pelo simulador.', linha);
    }

    if (cls === 'Convert') {
      var v0 = args()[0];
      if (m === 'ToInt32' || m === 'ToInt64' || m === 'ToInt16') return V('int', paraInteiro(v0, linha));
      if (m === 'ToDouble' || m === 'ToSingle' || m === 'ToDecimal') return V('double', paraDecimal(v0, linha));
      if (m === 'ToBoolean') return V('bool', paraBool(v0, linha));
      if (m === 'ToString') return V('string', texto(v0));
      if (m === 'ToChar') return V('char', texto(v0).charAt(0));
      erro('Convert.' + m + ' não é suportado pelo simulador.', linha);
    }

    if (TIPOS_CAST.indexOf(cls) >= 0 || cls === 'String') {
      if (m === 'Parse') {
        var pv = args()[0];
        if (TIPOS_NUM_INT.indexOf(cls) >= 0) return V('int', paraInteiro(pv, linha));
        if (TIPOS_NUM_DEC.indexOf(cls) >= 0) return V('double', paraDecimal(pv, linha));
        if (cls === 'bool') return V('bool', paraBool(pv, linha));
        if (cls === 'char') return V('char', texto(pv).charAt(0));
      }
      if (m === 'TryParse') {
        var bruto = self.aval(e.args[0].e, env);
        var destino = e.args[1].e;
        var okv = false, valConv = V('int', 0);
        var txt0 = (bruto && bruto.t === 'string') ? bruto.v : texto(bruto);
        if (TIPOS_NUM_INT.indexOf(cls) >= 0) {
          var n1 = parseInt(String(txt0).trim(), 10);
          okv = !isNaN(n1) && /^-?\d+$/.test(String(txt0).trim());
          valConv = V('int', okv ? n1 : 0);
        } else if (TIPOS_NUM_DEC.indexOf(cls) >= 0) {
          var n2 = parseFloat(String(txt0).trim().replace(',', '.'));
          okv = !isNaN(n2);
          valConv = V('double', okv ? n2 : 0);
        } else if (cls === 'bool') {
          var t2 = String(txt0).trim().toLowerCase();
          okv = (t2 === 'true' || t2 === 'false');
          valConv = V('bool', t2 === 'true');
        }
        if (destino && destino.k === 'id') {
          if (!env.atribuir(destino.nome, valConv)) env.declarar(destino.nome, valConv);
        }
        return V('bool', okv);
      }
      if (cls === 'String' || cls === 'string') {
        if (m === 'Join') {
          var ja = args();
          var sep = texto(ja[0]);
          var col = ja[1];
          var lista = (col && (col.t === 'array' || col.t === 'list')) ? col.v : ja.slice(1);
          return V('string', lista.map(texto).join(sep));
        }
        if (m === 'IsNullOrEmpty') {
          var sv = args()[0];
          return V('bool', sv.t === 'null' || (sv.t === 'string' && sv.v.length === 0));
        }
        if (m === 'IsNullOrWhiteSpace') {
          var sw = args()[0];
          return V('bool', sw.t === 'null' || (sw.t === 'string' && sw.v.trim().length === 0));
        }
        if (m === 'Format') {
          var fa = args();
          return V('string', texto(fa[0]).replace(/\{(\d+)(?::([^}]*))?\}/g, function (_, i3, f3) {
            var vv = fa[parseInt(i3, 10) + 1];
            return vv === undefined ? '' : aplicarFormato(vv, f3);
          }));
        }
      }
      erro(cls + '.' + m + ' não é suportado pelo simulador.', linha);
    }
  }

  // método de instância (string, array, list)
  if (alvo.k === 'membro') {
    var obj = this.aval(alvo.obj, env);
    return this.metodoInstancia(obj, alvo.nome, args(), linha, alvo, env);
  }

  // método definido pelo aluno
  if (alvo.k === 'id' && this.metodos[alvo.nome]) {
    return this.chamarMetodo(this.metodos[alvo.nome], args(), linha);
  }

  erro('Não sei executar a chamada "' + (alvo.nome || 'esta função') + '".', linha);
};

Interpretador.prototype.chamarMetodo = function (met, vals, linha) {
  if (this.profundidade === undefined) this.profundidade = 0;
  if (++this.profundidade > 200) { this.profundidade--; erro('Chamadas de método aninhadas demais (recursão infinita?).', linha); }
  var env = new Ambiente(this.global);
  for (var i = 0; i < met.params.length; i++) {
    var p = met.params[i];
    var v = vals[i] === undefined ? NULO : vals[i];
    env.declarar(p.nome, p.tipo ? converterParaTipo(p.tipo.nome, v, linha) : v);
  }
  var r = this.execBloco(met.corpo, env);
  this.profundidade--;
  if (r && r.sinal === 'retorno') return r.valor;
  return NULO;
};

Interpretador.prototype.metodoInstancia = function (obj, nome, vals, linha) {
  if (obj.t === 'string') {
    var s = obj.v;
    switch (nome) {
      case 'ToUpper': return V('string', s.toUpperCase());
      case 'ToLower': return V('string', s.toLowerCase());
      case 'Trim': return V('string', s.trim());
      case 'TrimStart': return V('string', s.replace(/^\s+/, ''));
      case 'TrimEnd': return V('string', s.replace(/\s+$/, ''));
      case 'Substring': return V('string', vals.length > 1 ? s.substr(vals[0].v, vals[1].v) : s.substr(vals[0].v));
      case 'Contains': return V('bool', s.indexOf(texto(vals[0])) >= 0);
      case 'StartsWith': return V('bool', s.indexOf(texto(vals[0])) === 0);
      case 'EndsWith': return V('bool', s.lastIndexOf(texto(vals[0])) === s.length - texto(vals[0]).length);
      case 'IndexOf': return V('int', s.indexOf(texto(vals[0])));
      case 'Replace': return V('string', s.split(texto(vals[0])).join(texto(vals[1])));
      case 'Equals': return V('bool', s === texto(vals[0]));
      case 'ToString': return V('string', s);
      case 'Split': {
        var sep = vals.length ? texto(vals[0]) : ' ';
        return V('array', s.split(sep).map(function (x) { return V('string', x); }));
      }
    }
    erro('O simulador não conhece o método string.' + nome + '.', linha);
  }
  if (obj.t === 'list') {
    switch (nome) {
      case 'Add': obj.v.push(vals[0]); return NULO;
      case 'Contains': return V('bool', obj.v.some(function (x) { return iguais(x, vals[0]); }));
      case 'Remove': {
        for (var i = 0; i < obj.v.length; i++) if (iguais(obj.v[i], vals[0])) { obj.v.splice(i, 1); return V('bool', true); }
        return V('bool', false);
      }
      case 'RemoveAt': obj.v.splice(vals[0].v, 1); return NULO;
      case 'Clear': obj.v.length = 0; return NULO;
      case 'IndexOf': {
        for (var j = 0; j < obj.v.length; j++) if (iguais(obj.v[j], vals[0])) return V('int', j);
        return V('int', -1);
      }
      case 'Sort': obj.v.sort(function (a, b) { return ehNumero(a) ? a.v - b.v : String(texto(a)).localeCompare(texto(b)); }); return NULO;
      case 'Reverse': obj.v.reverse(); return NULO;
    }
    erro('O simulador não conhece o método List.' + nome + '.', linha);
  }
  if (obj.t === 'array') {
    if (nome === 'ToString') return V('string', texto(obj));
    erro('O simulador não conhece o método de array "' + nome + '".', linha);
  }
  if (ehNumero(obj) || obj.t === 'bool' || obj.t === 'char') {
    if (nome === 'ToString') {
      return V('string', vals.length ? aplicarFormato(obj, texto(vals[0])) : texto(obj));
    }
    if (nome === 'Equals') return V('bool', iguais(obj, vals[0]));
  }
  if (obj.t === 'null') erro('Tentou usar "' + nome + '" em um valor nulo (a variável não recebeu valor).', linha);
  erro('O simulador não conhece o método "' + nome + '" para este tipo.', linha);
};

/* ---- operadores ---- */
function iguais(a, b) {
  if (!a || !b) return false;
  if (a.t === 'null' || b.t === 'null') return a.t === b.t;
  if (ehNumero(a) && ehNumero(b)) return a.v === b.v;
  if (a.t === 'char' && b.t === 'char') return a.v === b.v;
  if (a.t === 'char' && b.t === 'string') return a.v === b.v;
  if (a.t === 'string' && b.t === 'char') return a.v === b.v;
  return a.t === b.t && a.v === b.v;
}

function binario(op, a, b, linha) {
  if (op === '+') {
    if (a.t === 'string' || b.t === 'string') return V('string', texto(a) + texto(b));
    if (a.t === 'char' && b.t === 'char') return V('int', a.v.charCodeAt(0) + b.v.charCodeAt(0));
  }
  if (op === '==') return V('bool', iguais(a, b));
  if (op === '!=') return V('bool', !iguais(a, b));

  if (['<', '>', '<=', '>='].indexOf(op) >= 0) {
    if (!ehNumero(a) || !ehNumero(b)) {
      if (a.t === 'char' && b.t === 'char') { a = V('int', a.v.charCodeAt(0)); b = V('int', b.v.charCodeAt(0)); }
      else erro('Não dá para comparar ' + nomeTipo(a) + ' com ' + nomeTipo(b) + ' usando "' + op + '".', linha);
    }
    if (op === '<') return V('bool', a.v < b.v);
    if (op === '>') return V('bool', a.v > b.v);
    if (op === '<=') return V('bool', a.v <= b.v);
    return V('bool', a.v >= b.v);
  }

  if (['+', '-', '*', '/', '%'].indexOf(op) >= 0) {
    var an = a.t === 'char' ? V('int', a.v.charCodeAt(0)) : a;
    var bn = b.t === 'char' ? V('int', b.v.charCodeAt(0)) : b;
    if (!ehNumero(an) || !ehNumero(bn)) {
      erro('Não dá para usar "' + op + '" entre ' + nomeTipo(a) + ' e ' + nomeTipo(b) + '.', linha);
    }
    var inteiro = an.t === 'int' && bn.t === 'int';
    if (op === '+') return V(inteiro ? 'int' : 'double', an.v + bn.v);
    if (op === '-') return V(inteiro ? 'int' : 'double', an.v - bn.v);
    if (op === '*') return V(inteiro ? 'int' : 'double', an.v * bn.v);
    if (op === '/') {
      if (bn.v === 0) {
        if (inteiro) erro('Divisão por zero.', linha);
        return V('double', an.v / bn.v);
      }
      return inteiro ? V('int', Math.trunc(an.v / bn.v)) : V('double', an.v / bn.v);
    }
    if (op === '%') {
      if (bn.v === 0) erro('Resto de divisão por zero.', linha);
      return V(inteiro ? 'int' : 'double', an.v % bn.v);
    }
  }
  erro('Operador "' + op + '" não suportado.', linha);
}

function paraInteiro(v, linha) {
  if (v.t === 'int') return v.v;
  if (v.t === 'double') return Math.round(v.v);
  if (v.t === 'bool') return v.v ? 1 : 0;
  if (v.t === 'null') erro('O programa tentou converter para número um valor vazio — provavelmente faltou uma entrada (Console.ReadLine) ou ela veio vazia.', linha);
  var s = String(v.v).trim().replace(',', '.');
  var n = parseFloat(s);
  if (isNaN(n)) erro('Não foi possível converter "' + v.v + '" para número inteiro.', linha);
  return Math.trunc(n);
}
function paraDecimal(v, linha) {
  if (ehNumero(v)) return v.v;
  if (v.t === 'bool') return v.v ? 1 : 0;
  if (v.t === 'null') erro('O programa tentou converter para número um valor vazio — provavelmente faltou uma entrada (Console.ReadLine) ou ela veio vazia.', linha);
  var s = String(v.v).trim().replace(',', '.');
  var n = parseFloat(s);
  if (isNaN(n)) erro('Não foi possível converter "' + v.v + '" para número decimal.', linha);
  return n;
}
function paraBool(v, linha) {
  if (v.t === 'bool') return v.v;
  if (ehNumero(v)) return v.v !== 0;
  var s = String(v.v).trim().toLowerCase();
  if (s === 'true' || s === 'verdadeiro' || s === '1' || s === 'sim') return true;
  if (s === 'false' || s === 'falso' || s === '0' || s === 'nao' || s === 'não') return false;
  erro('Não foi possível converter "' + v.v + '" para verdadeiro/falso.', linha);
}

/* ===================== ANÁLISE (requisitos) ===================== */
var ROTULOS_RECURSOS = {
  'tipo:int': 'declarar variável de número inteiro (int)',
  'tipo:double': 'declarar variável de número decimal (double/float/decimal)',
  'tipo:string': 'declarar variável de texto (string)',
  'tipo:bool': 'declarar variável verdadeiro/falso (bool)',
  'tipo:char': 'declarar variável de caractere (char)',
  'estrutura:if': 'usar uma decisão if',
  'estrutura:else': 'usar o caminho alternativo else',
  'estrutura:switch': 'usar switch/case',
  'estrutura:for': 'usar laço for',
  'estrutura:while': 'usar laço while',
  'estrutura:do': 'usar laço do-while',
  'estrutura:foreach': 'usar laço foreach',
  'estrutura:array': 'usar um array',
  'estrutura:list': 'usar uma List<T>',
  'estrutura:metodo': 'criar um método próprio',
  'estrutura:leitura': 'ler dados com Console.ReadLine',
  'estrutura:saida': 'exibir dados com Console.WriteLine',
  'estrutura:logico': 'combinar condições com && ou ||',
  'estrutura:aninhado': 'usar um laço dentro de outro',
  'estrutura:interpolacao': 'montar o texto com interpolação $"..."',
  'estrutura:conversao': 'converter texto em número (Parse/Convert)',
  'estrutura:acumulador': 'acumular um valor dentro do laço (ex: soma += x)'
};

function analisarAst(prog) {
  var rec = {};
  var pilhaLacos = 0;
  var contadores = [];   // nomes das variáveis de controle dos for's abertos

  function marcar(k) { rec[k] = true; }
  function ehContador(nome) {
    for (var i = 0; i < contadores.length; i++) if (contadores[i].indexOf(nome) >= 0) return true;
    return false;
  }
  function usaId(e, nome) {
    if (!e || typeof e !== 'object') return false;
    if (e.k === 'id') return e.nome === nome;
    var chaves = ['esq', 'dir', 'e', 'cond', 'a', 'b', 'obj', 'idx', 'alvo', 'valor'];
    for (var i = 0; i < chaves.length; i++) if (usaId(e[chaves[i]], nome)) return true;
    return false;
  }

  function tipoDeclarado(tipo, init) {
    if (!tipo) return null;
    var n = tipo.nome;
    if (tipo.arranjo) marcar('estrutura:array');
    if (n === 'List') marcar('estrutura:list');
    if (n === 'var') {
      if (!init) return null;
      if (init.k === 'num') return init.decimal ? 'double' : 'int';
      if (init.k === 'txt') return 'string';
      if (init.k === 'bool') return 'bool';
      if (init.k === 'chr') return 'char';
      if (init.k === 'interp') return 'string';
      if (init.k === 'novoArranjo' || init.k === 'listaInit') { marcar('estrutura:array'); return null; }
      if (init.k === 'novoObj' && init.tipo && init.tipo.nome === 'List') { marcar('estrutura:list'); return null; }
      if (init.k === 'bin' && init.op === '+' &&
          (init.esq.k === 'txt' || init.dir.k === 'txt')) return 'string';
      if (init.k === 'chamada') {
        var alvoC = init.alvo;
        if (alvoC && alvoC.k === 'membro') {
          var cl = alvoC.obj.k === 'id' ? alvoC.obj.nome : '';
          if (cl === 'Console' && alvoC.nome === 'ReadLine') return 'string';
          if (TIPOS_NUM_INT.indexOf(cl) >= 0 && alvoC.nome === 'Parse') return 'int';
          if (TIPOS_NUM_DEC.indexOf(cl) >= 0 && alvoC.nome === 'Parse') return 'double';
          if (cl === 'bool' && alvoC.nome === 'Parse') return 'bool';
          if (cl === 'Convert') {
            if (/Int/.test(alvoC.nome)) return 'int';
            if (/Double|Single|Decimal/.test(alvoC.nome)) return 'double';
            if (/Boolean/.test(alvoC.nome)) return 'bool';
            if (/String/.test(alvoC.nome)) return 'string';
          }
        }
      }
      return null;
    }
    if (tipo.arranjo) return null;
    if (TIPOS_NUM_INT.indexOf(n) >= 0) return 'int';
    if (TIPOS_NUM_DEC.indexOf(n) >= 0) return 'double';
    if (n === 'string') return 'string';
    if (n === 'bool') return 'bool';
    if (n === 'char') return 'char';
    return null;
  }

  function visitarE(e) {
    if (!e || typeof e !== 'object') return;
    switch (e.k) {
      case 'interp': marcar('estrutura:interpolacao');
        e.partes.forEach(function (p) { if (p.expr) visitarE(p.expr); });
        return;
      case 'bin':
        if (e.op === '&&' || e.op === '||') marcar('estrutura:logico');
        visitarE(e.esq); visitarE(e.dir); return;
      case 'un': case 'cast': visitarE(e.e); return;
      case 'pre': case 'pos':
        if (pilhaLacos > 0 && e.e.k === 'id' && !ehContador(e.e.nome)) marcar('estrutura:acumulador');
        visitarE(e.e); return;
      case 'ternario': visitarE(e.cond); visitarE(e.a); visitarE(e.b); return;
      case 'atrib':
        if (pilhaLacos > 0 && e.alvo.k === 'id' && !ehContador(e.alvo.nome)) {
          // soma += x   ou   soma = soma + x
          if (e.op !== '=' || usaId(e.valor, e.alvo.nome)) marcar('estrutura:acumulador');
        }
        visitarE(e.alvo); visitarE(e.valor); return;
      case 'indice': marcar('estrutura:array'); visitarE(e.obj); visitarE(e.idx); return;
      case 'membro': visitarE(e.obj); return;
      case 'listaInit': e.itens.forEach(visitarE); return;
      case 'novoArranjo': marcar('estrutura:array'); if (e.init) e.init.itens.forEach(visitarE); visitarE(e.tamanho); return;
      case 'novoObj':
        if (e.tipo && e.tipo.nome === 'List') marcar('estrutura:list');
        if (e.init) e.init.itens.forEach(visitarE);
        e.args.forEach(function (a) { visitarE(a.e); });
        return;
      case 'chamada': {
        var alvo = e.alvo;
        if (alvo && alvo.k === 'membro' && alvo.obj.k === 'id') {
          var cl = alvo.obj.nome;
          if (cl === 'Console' && alvo.nome === 'ReadLine') marcar('estrutura:leitura');
          if (cl === 'Console' && (alvo.nome === 'WriteLine' || alvo.nome === 'Write')) marcar('estrutura:saida');
          if (alvo.nome === 'Parse' || alvo.nome === 'TryParse' || cl === 'Convert') marcar('estrutura:conversao');
        }
        visitarE(alvo);
        e.args.forEach(function (a) { visitarE(a.e); });
        return;
      }
    }
  }

  function visitarS(s) {
    if (!s || typeof s !== 'object') return;
    switch (s.k) {
      case 'bloco': s.corpo.forEach(visitarS); return;
      case 'decl': {
        s.decls.forEach(function (d) {
          var t = tipoDeclarado(s.tipo, d.init);
          if (t) marcar('tipo:' + t);
          visitarE(d.init);
        });
        return;
      }
      case 'expr': visitarE(s.e); return;
      case 'se':
        marcar('estrutura:if');
        if (s.senao) marcar('estrutura:else');
        visitarE(s.cond); visitarS(s.entao); visitarS(s.senao); return;
      case 'enquanto':
        marcar('estrutura:while');
        if (pilhaLacos > 0) marcar('estrutura:aninhado');
        pilhaLacos++; visitarE(s.cond); visitarS(s.corpo); pilhaLacos--; return;
      case 'facaEnquanto':
        marcar('estrutura:do');
        if (pilhaLacos > 0) marcar('estrutura:aninhado');
        pilhaLacos++; visitarS(s.corpo); visitarE(s.cond); pilhaLacos--; return;
      case 'para': {
        marcar('estrutura:for');
        if (pilhaLacos > 0) marcar('estrutura:aninhado');
        var nomes = (s.ini && s.ini.k === 'decl') ? s.ini.decls.map(function (d) { return d.nome; }) : [];
        if (s.ini && s.ini.k === 'expr' && s.ini.e.k === 'atrib' && s.ini.e.alvo.k === 'id') nomes.push(s.ini.e.alvo.nome);
        contadores.push(nomes);
        pilhaLacos++;
        visitarS(s.ini); visitarE(s.cond);
        (s.passo || []).forEach(visitarE); visitarS(s.corpo);
        pilhaLacos--; contadores.pop();
        return;
      }
      case 'paraCada':
        marcar('estrutura:foreach');
        if (pilhaLacos > 0) marcar('estrutura:aninhado');
        pilhaLacos++; visitarE(s.colecao); visitarS(s.corpo); pilhaLacos--; return;
      case 'escolha':
        marcar('estrutura:switch');
        visitarE(s.disc);
        s.casos.forEach(function (c) { c.rotulos.forEach(visitarE); c.corpo.forEach(visitarS); });
        return;
      case 'retorne': visitarE(s.e); return;
    }
  }

  prog.topo.forEach(visitarS);
  var nomes = Object.keys(prog.metodos);
  nomes.forEach(function (n) {
    if (n !== 'Main') marcar('estrutura:metodo');
    prog.metodos[n].corpo.forEach(visitarS);
  });
  return rec;
}

/* ===================== API ===================== */
function compilar(codigo) {
  var toks = lex(codigo);
  var p = new Parser(toks);
  return p.parsePrograma();
}

function executar(codigo, opts) {
  opts = opts || {};
  try {
    var prog = compilar(codigo);
    var interp = new Interpretador(opts);
    interp.rodar(prog);
    return { ok: true, saida: interp.saidaFinal(), linhas: interp.linhasSaida.slice() };
  } catch (e) {
    if (e instanceof CsErro || e.name === 'CsErro') {
      return { ok: false, erro: e.message, linha: e.linha };
    }
    if (e && e.message && /call stack/i.test(e.message)) {
      return { ok: false, erro: 'Recursão infinita: um método está chamando a si mesmo sem parar.', linha: null };
    }
    return { ok: false, erro: 'Erro inesperado no simulador: ' + (e && e.message ? e.message : e), linha: null };
  }
}

function analisar(codigo) {
  try {
    var prog = compilar(codigo);
    return { ok: true, recursos: analisarAst(prog) };
  } catch (e) {
    if (e instanceof CsErro || e.name === 'CsErro') return { ok: false, erro: e.message, linha: e.linha };
    return { ok: false, erro: 'Erro inesperado ao analisar o código.', linha: null };
  }
}

global.CSharp = {
  executar: executar,
  analisar: analisar,
  ROTULOS_RECURSOS: ROTULOS_RECURSOS
};

})(typeof window !== 'undefined' ? window : this);

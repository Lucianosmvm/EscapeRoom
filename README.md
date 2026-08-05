# Laboratório Perdido — Plataforma de Desafios (GitHub Pages)

O aluno **escreve o código C# no Visual Studio, cola na plataforma e o próprio site executa o programa** — não é mais o aluno colando a saída do console na mão. A verificação combina duas coisas:

1. **Execução real** — um mini-interpretador de C# roda o código do aluno em cada cenário de teste e compara a saída produzida com a esperada. Qualquer solução funcional passa: nome de variável, indentação, `var` ou tipo explícito, `+` ou interpolação `$"..."` — nada disso importa.
2. **Requisitos de conceito** — a questão pode exigir que o código contenha certas construções (um `foreach`, um `do-while`, uma variável `bool`, um laço dentro de outro...). Isso é checado na estrutura do código, então não dá para "chutar" a saída certa sem usar o conceito pedido.

## Estrutura para o repositório

```
seu-repositorio/
├── index.html                <- página principal
├── interpretador_csharp.js   <- OBRIGATÓRIO: o interpretador de C#
├── config.json               <- diz qual conteúdo está ativo
├── conteudo_1.json           <- exemplo curto (variáveis)
├── conteudo_2.json           <- campanha "As Nove Chaves" (10 fases, estruturas básicas)
└── conteudo_3.json           <- campanha "ESCAPE CODE" (19 missões, do zero até POO)
```

> Se `interpretador_csharp.js` não estiver na mesma pasta do `index.html`, a verificação não funciona.

## Código de acesso: cada desafio tem o seu

Cada conteúdo tem um **código** que você passa para a turma. O aluno digita esse código na tela de entrada e a plataforma carrega o desafio correspondente — sem você precisar publicar nada de novo.

O `config.json` lista os conteúdos disponíveis e diz qual é o padrão:

```json
{
  "ativo": "conteudo_2.json",
  "conteudos": ["conteudo_1.json", "conteudo_2.json", "conteudo_3.json"]
}
```

E cada conteúdo declara o próprio código:

```json
"meta": { "nome": "Conteúdo 3 — ESCAPE CODE...", "codigo": "OMEGA2048" }
```

Códigos que já vêm prontos: `EXEMPLO` (conteúdo 1), `NOVECHAVES` (conteúdo 2) e `OMEGA2048` (conteúdo 3). Para trocar, edite o `meta.codigo` do arquivo ou defina direto no `config.json`, que tem prioridade:

```json
{ "arquivo": "conteudo_3.json", "codigo": "TURMA201" }
```

Como funciona na prática:
- **Com código** → o aluno entra naquele desafio, seja ele qual for.
- **Sem código** → entra no `ativo`. Se você quiser obrigar o código, é só tirar o `ativo` do `config.json`.
- Maiúsculas, minúsculas e espaços são ignorados: `omega 2048` abre o mesmo desafio que `OMEGA2048`.
- O código fica lembrado no navegador: quem recarrega a página continua no mesmo desafio, sem redigitar.
- **O progresso é separado por desafio.** A mesma equipe pode estar na missão 7 do ÔMEGA e na fase 2 das Nove Chaves ao mesmo tempo, sem um sobrescrever o outro. Progresso salvo antes desta versão é migrado sozinho na primeira entrada.

Turmas diferentes com desafios diferentes ao mesmo tempo: basta dar códigos diferentes para cada uma. Não precisa mexer no `config.json` entre uma aula e outra.

O código também aparece no painel do professor (campo "Código de acesso"), e vai junto no arquivo quando você exporta o conteúdo. Um conteúdo novo só passa a responder ao código depois de estar publicado no repositório **e** listado em `conteudos`.

Depois de qualquer alteração: commit, e aguarde o GitHub Pages publicar (geralmente menos de 1 minuto, às vezes até uns 10 min por causa de cache de CDN).

### Criando um desafio novo, do zero

1. No painel do professor, monte módulos e questões, preencha o **nome** e o **código de acesso**.
2. Clique em **⬇ Exportar conteúdo (.json)** — o arquivo baixado já vem com o código dentro.
3. Renomeie para `conteudo_4.json` (ou o nome que quiser) e suba na mesma pasta do `index.html`.
4. Acrescente o arquivo à lista `conteudos` do `config.json`.
5. Passe o código para a turma. Pronto — não precisa mexer no `ativo`.

## Como o aluno usa

0. Entra com o nome da equipe e o **código do desafio** que você passou.
1. Lê o enunciado (uma situação, não um "faça um programa que imprima X").
2. Vê os **requisitos** ("o seu código precisa: declarar uma variável decimal, usar foreach...") e os **cenários de teste** (o que vai ser digitado no console e o que a saída precisa conter).
3. Escreve o programa no Visual Studio, cola no editor da página.
4. **▶ EXECUTAR** roda o código ali mesmo e mostra a saída do console — quantas vezes quiser, sem contar tentativa.
5. **✔ VERIFICAR** roda todos os cenários e só libera a fase se tudo passar. Erra? O feedback diz o que falta: requisito não cumprido, erro de compilação com o número da linha, ou qual cenário deu saída diferente.

O código digitado fica salvo no navegador (rascunho por questão), então recarregar a página não perde o trabalho.

## Continuar em outro dia (ou em outro computador)

Na tela de módulos e na tela final há **💾 Salvar progresso (.json)**: baixa um arquivo com tudo — fases resolvidas, chaves conquistadas, pontuação, dicas usadas, tempo acumulado e **todo o código já escrito**, inclusive o da missão que ficou pela metade.

Para voltar, o aluno usa **📂 Continuar de um arquivo salvo**, na tela de identificação da equipe. O estado volta inteiro e o editor reabre exatamente com o código de onde ele parou.

Detalhes que valem saber:
- O cronômetro é **acumulado**, não contado a partir de uma data fixa: fechar o navegador na sexta e voltar na terça não infla o tempo da equipe.
- Se o arquivo tiver sido salvo em um desafio diferente do que está ativo agora, a plataforma avisa antes de carregar.
- É o mesmo mecanismo para trocar de máquina: salvar no laboratório, carregar em casa.

## Como criar/editar questões

Pelo painel do professor (senha `semsenha`) ou editando o JSON direto. Formato de uma questão:

```json
{
  "id": "q1",
  "moduloId": "mod1",
  "titulo": "Terminal de Identificação",
  "enunciado": "texto da situação (aceita quebras de linha \n)",
  "pontosBase": 10,
  "dica1": "conceitual",
  "dica2": "mais específica",
  "dica3": "quase a resposta",
  "requisitos": ["tipo:string", "tipo:int", "estrutura:foreach"],
  "casos": [
    {
      "descricao": "gerador com carga baixa",
      "entradas": ["12"],
      "saidaEsperada": "carga crítica",
      "modo": "contem",
      "rotulo": "(opcional) como descrever o padrão para o aluno"
    }
  ],
  "gabarito": "using System; ..."
}
```

- **`entradas`**: o que o aluno "digitaria" no console, um item por `Console.ReadLine()`. Vazio (`[]`) se a questão não lê nada.
- **Cenários**: casos com as *mesmas* `entradas` são agrupados e o programa roda **uma vez só** para todos eles — assim dá para ter várias checagens ("a saída precisa conter X", "...e também Y") com feedback item a item.
- **`modo`**:
  - `contem` — a saída precisa conter esse texto (permite linhas extras);
  - `exata` — a saída inteira precisa ser aquela (use quando o enunciado disser "imprima só a mensagem");
  - `regex` — expressão regular, para ordem de linhas ou números com casas decimais.
- **Sempre ignorado na comparação**: maiúsculas/minúsculas, acentos, espaços extras e vírgula vs. ponto decimal (`1,60` = `1.60`). Ou seja, o aluno não é reprovado por acento ou pela cultura do Windows.
- **`gabarito`**: solução de referência, só o professor vê. O botão **"Testar gabarito nos cenários"** roda ela contra todos os casos e avisa se algum cenário está impossível de passar ou se o próprio gabarito não cumpre os requisitos marcados. Use sempre antes de publicar uma questão nova.

## Chaveiro (progressão gamificada)

O `conteudo_2.json` é uma campanha: cada sala devolve uma **chave numérica** que o programa do aluno precisa *calcular* (não digitar), e o desafio final só abre com as nove juntas.

Para ativar isso em um conteúdo, basta:

```json
"meta": { "nome": "...", "chaveiro": { "total": 9, "rotulo": "CHAVEIRO DO LABORATÓRIO" } }
```

A plataforma então mostra o chaveiro no topo da tela do aluno (`🔑 3: 33` / `🔒 4`) e, toda vez que uma questão é aceita, procura na saída do programa qualquer linha no formato `CHAVE N: valor` e guarda esse valor no slot N. Se o conteúdo não tiver `meta.chaveiro`, nada disso aparece.

Quando uma questão tem vários cenários, marque com `"oficial": true` o caso cuja execução conta como a "história oficial" — é dele que a chave é extraída. Sem marcação, vale o primeiro cenário.

As nove chaves do conteúdo 2 são `23, 8, 33, 16, 21, 4, 50, 1, 9` (soma 165, maior 50) — é exatamente o que a fase 10 exige. As dezoito chaves do conteúdo 3 são `30, 151, 38, 10, 11, 20, 8, 73, 34, 58, 100, 180, 95, 300, 4, 3, 2, 20` (soma **1137**, a CHAVE FINAL do confronto com EVA). Se você alterar o cálculo de alguma missão, ajuste também a lista e a soma da missão final, e rode o "Testar gabarito" das duas.

## Conteúdo 3 — ESCAPE CODE: A Fuga do Projeto ÔMEGA

Campanha de 19 missões, uma por aula, com dificuldade crescente até orientação a objetos. O aluno é um programador preso no Complexo ÔMEGA e cada programa que ele escreve arranca uma chave da IA EVA.

| # | Missão | Conceito | Chave |
|---|---|---|---|
| 1 | O Despertar | variáveis e tipos | 30 |
| 2 | Reator de Energia | operadores matemáticos | 151 |
| 3 | Scanner Biométrico | if / else | 38 |
| 4 | Terminal de Rotas | switch | 10 |
| 5 | Sistema de Resfriamento | laço for | 11 |
| 6 | Inventário Perdido | arrays | 20 |
| 7 | Sobreviventes | List&lt;T&gt; | 8 |
| 8 | Banco de Dados | Dictionary&lt;K,V&gt; | 73 |
| 9 | Sala de Controle | métodos | 34 |
| 10 | O Registro | classes | 58 |
| 11 | Os Robôs | objetos e propriedades | 100 |
| 12 | A Fábrica | construtores | 180 |
| 13 | Arsenal | encapsulamento | 95 |
| 14 | A Evolução | herança | 300 |
| 15 | A Rebelião | polimorfismo (virtual/override) | 4 |
| 16 | O Núcleo da EVA | classes abstratas | 3 |
| 17 | Protocolo de Emergência | interfaces | 2 |
| 18 | Sobrecarga | try / catch / finally | 20 |
| **FINAL** | **O Confronto com EVA** | tudo junto | **CHAVE FINAL 1137** |

A missão final não introduz conceito novo: ela exige classes com herança, uma `List<Robo>` percorrida com polimorfismo, um `Dictionary` de códigos, um cálculo protegido por `try/catch` e a soma das 18 chaves — terminando no banner "SISTEMA OMEGA DESATIVADO".

Para ativar essa campanha, aponte o `config.json` para ela:

```json
{ "ativo": "conteudo_3.json" }
```

### Requisitos disponíveis

Tipos: `tipo:int`, `tipo:double`, `tipo:string`, `tipo:bool`, `tipo:char`.

Estruturas básicas: `estrutura:if`, `estrutura:else`, `estrutura:switch`, `estrutura:for`, `estrutura:while`, `estrutura:do`, `estrutura:foreach`, `estrutura:array`, `estrutura:list`, `estrutura:dicionario`, `estrutura:leitura` (Console.ReadLine), `estrutura:saida` (Console.WriteLine), `estrutura:logico` (`&&`/`||`), `estrutura:aninhado` (laço dentro de laço), `estrutura:interpolacao`, `estrutura:conversao` (Parse/Convert), `estrutura:acumulador` (somar/contar dentro do laço).

Métodos: `estrutura:metodo`, `estrutura:metodoParam` (recebe parâmetros), `estrutura:metodoRetorno` (devolve valor com `return`).

Orientação a objetos: `estrutura:classe`, `estrutura:objeto` (instanciar com `new`), `estrutura:construtor`, `estrutura:propriedade`, `estrutura:encapsulamento` (campo privado + `set` validado), `estrutura:heranca`, `estrutura:base`, `estrutura:virtual`, `estrutura:polimorfismo` (`override`), `estrutura:abstrata`, `estrutura:interface`.

Exceções: `estrutura:excecao` (try/catch), `estrutura:finally`, `estrutura:lancar` (`throw`).

## O que o interpretador de C# entende

**Fundamentos**: tipos primitivos, `var`, arrays, `List<T>`, `Dictionary<K,V>` (com `KeyValuePair`, `Keys`, `Values`, `ContainsKey`), `Console.Write/WriteLine/ReadLine`, `if/else`, `switch`, `for`, `while`, `do-while`, `foreach`, `break`/`continue`, interpolação `$"..."` com formatação (`{x:F2}`), `Math`, `Convert`, `int.Parse`/`double.Parse`/`TryParse` e os métodos usuais de `string`.

**Orientação a objetos**: classes com campos, propriedades (automáticas e com `get`/`set` de corpo próprio), construtores (inclusive `: base(...)` e `: this(...)`), métodos de instância e estáticos, herança, `base.Metodo()`, `virtual`/`override` com despacho dinâmico de verdade, classes `abstract` (instanciar uma dá erro explicando o motivo), interfaces com `is` e conversão `(ITipo)x`, e `override ToString()` — que é usado quando o objeto é impresso.

**Exceções**: `try`/`catch`/`finally`, `throw new Exception("...")` e a hierarquia usual (`DivideByZeroException`, `FormatException`, `IndexOutOfRangeException`, `NullReferenceException`, `ArgumentException`...). Os erros de execução do próprio simulador viram essas exceções, então dividir por zero dentro de um `try` é capturado como em C# de verdade, e `ex.Message` funciona.

Aceita tanto o programa completo (`using` + `namespace` + `class` + `Main`) quanto instruções soltas no topo do arquivo.

**Não cobre** (o aluno recebe uma mensagem clara dizendo que não é suportado): LINQ, genéricos definidos pelo aluno, `struct` com semântica de valor, delegates/eventos/lambdas, arquivos, threads, e o resto da biblioteca padrão. Laços infinitos e recursão sem fim são interrompidos com aviso em vez de travar o navegador.

## Sobre a senha do professor

`semsenha` é só uma trava simples pra evitar cliques por engano — **não é segurança de verdade** (o código roda todo no navegador). Não use para provas com peso alto na nota sem supervisão presencial.

## Modo offline / local (fallback)

Se o `config.json` não existir ou o arquivo for aberto direto do computador (sem `http(s)://`), a plataforma usa o conteúdo salvo no `localStorage` daquele navegador, e o professor pode importar/exportar `.json` pelo painel. O interpretador funciona normalmente offline.

## Progresso dos alunos

Fica no `localStorage` do navegador/dispositivo usado (não sincroniza entre máquinas). Se a equipe trocar de computador no meio da atividade, o progresso não acompanha, e "Ver progresso das equipes" só mostra quem jogou *naquele mesmo navegador*. Um placar compartilhado exigiria um backend (ex: Firebase).

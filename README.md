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
├── conteudo_1.json
├── conteudo_2.json           <- crie quantos quiser
└── conteudo_3.json
```

> Se `interpretador_csharp.js` não estiver na mesma pasta do `index.html`, a verificação não funciona.

## Como trocar qual conteúdo os alunos respondem

Edite **só o `config.json`**:

```json
{
  "ativo": "conteudo_2.json"
}
```

Salve, dê commit, aguarde o GitHub Pages publicar (geralmente menos de 1 minuto, às vezes até uns 10 min por causa de cache de CDN).

## Como o aluno usa

1. Lê o enunciado (uma situação, não um "faça um programa que imprima X").
2. Vê os **requisitos** ("o seu código precisa: declarar uma variável decimal, usar foreach...") e os **cenários de teste** (o que vai ser digitado no console e o que a saída precisa conter).
3. Escreve o programa no Visual Studio, cola no editor da página.
4. **▶ EXECUTAR** roda o código ali mesmo e mostra a saída do console — quantas vezes quiser, sem contar tentativa.
5. **✔ VERIFICAR** roda todos os cenários e só libera a fase se tudo passar. Erra? O feedback diz o que falta: requisito não cumprido, erro de compilação com o número da linha, ou qual cenário deu saída diferente.

O código digitado fica salvo no navegador (rascunho por questão), então recarregar a página não perde o trabalho.

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

### Requisitos disponíveis

Tipos: `tipo:int`, `tipo:double`, `tipo:string`, `tipo:bool`, `tipo:char`.

Estruturas: `estrutura:if`, `estrutura:else`, `estrutura:switch`, `estrutura:for`, `estrutura:while`, `estrutura:do`, `estrutura:foreach`, `estrutura:array`, `estrutura:list`, `estrutura:metodo`, `estrutura:leitura` (Console.ReadLine), `estrutura:saida` (Console.WriteLine), `estrutura:logico` (`&&`/`||`), `estrutura:aninhado` (laço dentro de laço), `estrutura:interpolacao`, `estrutura:conversao` (Parse/Convert), `estrutura:acumulador` (somar/contar dentro do laço).

## O que o interpretador de C# entende

Cobre o C# introdutório: tipos primitivos, `var`, arrays e `List<T>`, `Console.Write/WriteLine/ReadLine`, `if/else`, `switch`, `for`, `while`, `do-while`, `foreach`, `break`/`continue`, métodos estáticos próprios, interpolação `$"..."` com formatação (`{x:F2}`), `Math`, `Convert`, `int.Parse`/`double.Parse`/`TryParse` e os métodos usuais de `string` (`ToUpper`, `Trim`, `Substring`, `Contains`, `Split`, `Length`...). Aceita tanto o programa completo (`using` + `namespace` + `class` + `Main`) quanto instruções soltas no topo do arquivo.

**Não cobre** (o aluno recebe uma mensagem clara dizendo que não é suportado): classes e objetos próprios, herança, interfaces, LINQ, `try/catch` com tratamento real, arquivos, threads, e a maior parte da biblioteca padrão. Laços infinitos e recursão sem fim são interrompidos com aviso em vez de travar o navegador.

## Sobre a senha do professor

`semsenha` é só uma trava simples pra evitar cliques por engano — **não é segurança de verdade** (o código roda todo no navegador). Não use para provas com peso alto na nota sem supervisão presencial.

## Modo offline / local (fallback)

Se o `config.json` não existir ou o arquivo for aberto direto do computador (sem `http(s)://`), a plataforma usa o conteúdo salvo no `localStorage` daquele navegador, e o professor pode importar/exportar `.json` pelo painel. O interpretador funciona normalmente offline.

## Progresso dos alunos

Fica no `localStorage` do navegador/dispositivo usado (não sincroniza entre máquinas). Se a equipe trocar de computador no meio da atividade, o progresso não acompanha, e "Ver progresso das equipes" só mostra quem jogou *naquele mesmo navegador*. Um placar compartilhado exigiria um backend (ex: Firebase).

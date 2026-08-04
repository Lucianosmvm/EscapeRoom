# Laboratório Perdido — Plataforma de Desafios (GitHub Pages)

## Estrutura para o repositório

```
seu-repositorio/
├── index.html            <- renomeie plataforma_desafios.html para este nome
├── config.json             <- diz qual conteúdo está ativo
├── conteudo_1.json
├── conteudo_2.json          <- crie quantos quiser
└── conteudo_3.json
```

> GitHub Pages serve `index.html` automaticamente na raiz do site — por isso o arquivo principal deve se chamar `index.html`.

## Como trocar qual conteúdo os alunos respondem

Edite **só o `config.json`**:

```json
{
  "ativo": "conteudo_2.json"
}
```

Salve, dê commit, aguarde o GitHub Pages publicar (geralmente menos de 1 minuto, às vezes até uns 10 min por causa de cache de CDN) e pronto — todo mundo que abrir o link vai carregar automaticamente o `conteudo_2.json`.

## Como criar um novo conteúdo (`conteudo_N.json`)

1. Abra o site publicado, clique em **"Sou professor(a)"** (senha: `semsenha`).
2. Monte os módulos e questões normalmente pela interface.
3. No topo do painel, dê um nome para esse conjunto (ex: "Conteúdo 2 — Vetores").
4. Clique em **"Exportar conteúdo (.json)"** — isso baixa um arquivo com tudo que você criou.
5. Renomeie esse arquivo baixado para `conteudo_N.json` (o número que você quiser) e suba ele pro repositório, na mesma pasta do `index.html`.
6. Aponte o `config.json` pra ele quando quiser que seja o ativo.

Assim seus 3 conteúdos ficam guardados como arquivos separados no repositório, e trocar qual está "no ar" é sempre uma edição de uma linha só.

## Sobre a senha do professor

`semsenha` é só uma trava simples pra evitar cliques por engano/curiosidade — **não é segurança de verdade** (o código roda todo no navegador, então qualquer pessoa com conhecimento técnico consegue contornar isso). Não use para provas com peso alto na nota sem supervisão presencial.

## Modo offline / local (fallback)

Se o `config.json` não existir ou o arquivo estiver sendo aberto direto do computador (sem estar hospedado via `http(s)://`), a plataforma cai automaticamente no comportamento antigo: usa o conteúdo salvo no `localStorage` daquele navegador, e você pode importar/exportar `.json` manualmente pelo painel do professor.

## Progresso dos alunos

O progresso de cada equipe fica salvo no `localStorage` do navegador/dispositivo que ela usou (não é sincronizado entre dispositivos nem centralizado num servidor). Isso significa:
- Se a equipe trocar de computador no meio da atividade, o progresso não acompanha.
- "Ver progresso das equipes" no painel do professor só mostra as equipes que jogaram *naquele mesmo navegador*.

Se quiser um placar de verdade compartilhado entre todos os dispositivos (ex: para acompanhar a turma toda em tempo real), isso exige um banco de dados compartilhado (ex: Firebase, gratuito no plano básico) — é uma extensão possível, mas exige adicionar um backend simples.

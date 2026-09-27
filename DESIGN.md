---
name: Controle de Despesas
description: Caderneta de contas pessoal em PT-BR — extrato, não dashboard.
colors:
  papel: "#ece7da"
  papel-noturno: "#171a14"
  papel-elevado: "#f5f1e6"
  papel-elevado-noturno: "#1f231b"
  tinta: "#23281f"
  tinta-noturna: "#eae5d6"
  tinta-suave: "#6b7260"
  tinta-suave-noturna: "#9ca28d"
  pauta: "#c9c0ac"
  pauta-noturna: "#383f30"
  verde-cedula: "#2f6f4e"
  verde-cedula-noturno: "#6fb98c"
  vermelho-tijolo: "#9a3b34"
  vermelho-tijolo-noturno: "#d98479"
  azul-tinta: "#2b4c7e"
  azul-tinta-noturno: "#7fa0d1"
  mostarda-alerta: "#a3791f"
typography:
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  numeric:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontFeature: "tabular-nums"
rounded:
  sm: "2px"
  md: "6px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
---

# Design System: Controle de Despesas

## Overview

**Creative North Star: "A Caderneta de Contas"**

O app existe para uma pessoa só administrar o próprio dinheiro, em português, no celular e no computador, todo dia. Ele não vende nada e não precisa impressionar visitante — precisa passar confiança e deixar o número certo fácil de achar. Em vez da estética padrão de dashboard SaaS (cards arredondados idênticos, paleta slate/emerald do Tailwind, gradiente, glass), o sistema visual parte de um objeto concreto e local: a caderneta de anotar contas, com a paleta puxada das cédulas do Real. Fundo de papel (não branco puro, não preto puro), tinta em vez de texto genérico, pauta fina em vez de sombra, números alinhados em coluna como um extrato impresso.

Rejeições confirmadas: sem glassmorphism/backdrop-blur decorativo, sem sombra colorida como identidade, sem borda lateral/superior colorida acima de 1px como "categoria virou decoração", sem rótulo em CAIXA ALTA acima de título, sem ícone-emoji.

**Key Characteristics:**
- Papel + tinta, não branco + preto.
- Números sempre em fonte monoespaçada tabular, texto sempre em sans.
- Identidade de categoria vem da cor do ícone/selo e do texto, nunca de uma barra decorativa.
- Raio de canto pequeno e consistente; só o botão flutuante do celular é redondo de verdade.

## Colors

Paleta de dois eixos: papel (claro/escuro) + tinta de três cores puxadas das cédulas do Real.

### Primary
- **Azul-tinta** (`#2b4c7e` claro / `#7fa0d1` escuro): ação primária, transferências, links, foco de campo, seleção de texto. Usado com moderação — é a única cor que aparece em botão sólido.

### Secondary
- **Verde-cédula** (`#2f6f4e` claro / `#6fb98c` escuro): toda receita/entrada, saldo positivo.
- **Vermelho-tijolo** (`#9a3b34` claro / `#d98479` escuro): toda despesa/saída, saldo negativo, exclusão.

### Neutral
- **Papel** (`#ece7da` claro / `#171a14` escuro): fundo da página.
- **Papel elevado** (`#f5f1e6` claro / `#1f231b` escuro): painéis, modais, inputs.
- **Papel em hover** (`#e2dbc7` claro / `#262b1f` escuro): estado de hover/pressed.
- **Tinta** (`#23281f` claro / `#eae5d6` escuro): texto principal.
- **Tinta suave** (`#6b7260` claro / `#9ca28d` escuro): texto secundário/legenda — nunca cinza puro, sempre com o mesmo matiz verde-oliva da tinta principal.
- **Pauta** (`#c9c0ac` claro / `#383f30` escuro): toda linha divisória e borda, no lugar de sombra.

### Named Rules
**The One Wash Rule.** No máximo uma cor de tinta por elemento de uma vez — nunca fundo colorido + borda colorida + ícone colorido no mesmo bloco.
**The No Colored Edge Rule.** Nenhum `border-left`/`border-top` colorido acima de 1px em card, lista ou seção — decoração de card de SaaS. A identidade de uma seção (Entradas vs. Saídas) vem do ícone e do texto, não de uma faixa colorida na borda.

## Typography

**Body Font:** IBM Plex Sans (com ui-sans-serif, system-ui como fallback)
**Numeric/Mono Font:** IBM Plex Mono, só para valores em R$ e datas

**Character:** Uma família técnica e sóbria (desenhada pela IBM para documentação corporativa), não a Inter/Arial genérica de qualquer SaaS. O par Sans/Mono é a mesma família em dois papéis — texto corrido em Sans, todo número em Mono tabular — pra parecer um extrato real, não um efeito "tech".

### Hierarchy
- **Título de página** (bold, text-xl a text-3xl responsivo, tracking normal): nome do app no cabeçalho.
- **Título de seção** (semibold, text-base a text-lg): "Entradas", "Despesas por categoria", nomes de modal.
- **Corpo** (regular, text-sm): descrições, rótulos de campo, texto de ajuda.
- **Legenda** (regular, text-xs, cor tinta-suave): categoria, método de pagamento, contagem de itens.
- **Numérico** (semibold a extrabold conforme destaque, `.tabular` = IBM Plex Mono + tabular-nums): todo valor em R$, toda data curta.

### Named Rules
**The Tabular Money Rule.** Todo valor monetário e toda data usam a classe `.tabular` (IBM Plex Mono). Nunca a fonte do corpo — é o que faz uma coluna de valores alinhar de verdade.

## Layout

Container central `max-w-6xl`, com moldura própria (`border-2 rounded-3xl`) no desktop/tablet a partir de `sm:`; no celular a moldura some para não desperdiçar largura. Densidade alta (padding 4-6, gaps 3-5) — é uma ferramenta de uso diário, não uma landing page. Resumo do mês é uma única folha (grid com `gap-px` e fundo `pauta` fazendo as linhas, não `divide-*` nem cards separados). Histórico do mês é duas colunas (Entradas | Saídas) lado a lado no desktop, abas no celular. Botão de nova transação vira botão flutuante redondo só no celular (`sm:hidden`).

## Elevation & Depth

**The Flat Paper Rule.** Sem sombra como identidade. Profundidade vem só de mudança de tom (`papel` → `papel-elevado` → `papel-hover`) e de linhas de pauta (`border-rule`), nunca de `box-shadow` colorido. A única sombra real do sistema é neutra e utilitária: o leve `shadow-sm` na moldura externa da página (desktop) e no botão flutuante do celular, ambos sem cor de marca.

## Shapes

Raio pequeno e consistente: `rounded-sm` (2px) em selos/badges pequenos, `rounded-md` (6px) em painéis/inputs/botões, `rounded-3xl` só na moldura externa da página. `rounded-full` é reservado para exatamente um elemento: o botão flutuante "+" do celular — é o único elemento redondo de verdade do sistema, de propósito.

## Components

### Buttons
- **Shape:** `rounded-md` (6px).
- **Primary:** fundo `azul-tinta` sólido, texto `papel` (não branco fixo — inverte com o tema pra sempre contrastar), `hover:opacity-90`. Sem sombra colorida.
- **Secundário/Ghost:** fundo `papel-elevado`, borda `pauta`, texto `tinta`, `hover:bg-papel-hover`.
- **Ícone só:** sempre com `aria-label` (não só `title`), área de toque mínima ~40px mesmo com ícone de 16-20px.

### Chips / Selos de categoria
- **Estilo:** quadrado `rounded-sm` com borda na cor de tinta da categoria, fundo `papel` (não preenchido), ícone da mesma cor da borda. Contorno, não badge cheio.
- **Estado:** cor fixa por categoria (mostarda/Alimentação, azul/Moradia, ameixa/Lazer, verde-azulado/Transporte, verde/Salário, terracota/Freela).

### Cards / Painéis (modais, gráficos)
- **Corner Style:** `rounded-md`.
- **Background:** `papel-elevado`.
- **Shadow Strategy:** nenhuma; ver Elevation & Depth.
- **Border:** 1-2px `pauta`.
- **Internal Padding:** 16-24px (p-4 a p-6).

### Inputs / Fields
- **Style:** fundo `papel` (mais escuro que o painel ao redor, efeito "afundado"), borda `pauta`, `rounded-md`.
- **Focus:** borda muda para `azul-tinta` + anel de foco global (`:focus-visible`) na mesma cor, com offset — nunca só a cor do navegador.
- **Label:** sempre `<label htmlFor>` associado ao `id` do campo, mesmo quando visualmente óbvio.

### Navigation
Sem navegação por rota — é um cabeçalho fixo com seletor de conta, navegação de mês (◄ mês ►) e botões de ação. Mobile: mesma estrutura em coluna, botões de ação em grade 2×2.

## Do's and Don'ts

### Do:
- **Do** usar `.tabular` (IBM Plex Mono) em todo valor monetário e data.
- **Do** tirar a identidade de uma seção do ícone + texto colorido, nunca de uma borda decorativa.
- **Do** manter os dois temas (claro/escuro) como inversão dos mesmos tokens — nunca um componente novo só num tema.
- **Do** dar `aria-label` a todo botão que só tem ícone.

### Don't:
- **Don't** usar sombra colorida, `backdrop-blur` decorativo ou `border-left`/`border-top` colorido acima de 1px.
- **Don't** usar Inter, Arial ou a fonte padrão do sistema como voz do produto — é IBM Plex Sans/Mono.
- **Don't** empilhar card dentro de card. As colunas Entradas/Saídas e o resumo do mês são uma folha única com pauta interna, não cartões separados.
- **Don't** usar `rounded-full` em nada além do botão flutuante do celular.

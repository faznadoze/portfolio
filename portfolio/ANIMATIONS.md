# Guia de Implementação — Animações Apple-style

> **Para o Claude Code:** Leia este documento inteiro antes de modificar qualquer arquivo.
> Seu objetivo é implementar animações de alta performance inspiradas na Apple no site HTML/CSS/JS puro deste projeto.
> Siga cada instrução na ordem apresentada. Não instale bibliotecas externas.

---

## 1. Contexto do Projeto

- **Stack:** HTML, CSS e JavaScript vanilla (sem frameworks, sem bundler)
- **Libs de animação:** Nenhuma — use apenas APIs nativas do browser
- **Meta de performance:** 60fps contínuos, zero jank
- **Regra absoluta:** Anime **somente** `transform` e `opacity`. Nunca anime `width`, `height`, `top`, `left`, `margin` ou `background-color` diretamente — essas propriedades causam reflow/repaint e quebram a performance.

---

## 2. Reconhecimento do Projeto

Antes de escrever qualquer código, faça o seguinte:

1. Liste todos os arquivos `.html`, `.css` e `.js` do projeto
2. Leia o HTML principal e identifique:
   - Qual elemento é o `<main>` ou wrapper principal do conteúdo
   - Quais seções (`<section>`) existem e seus IDs/classes
   - Quais elementos são títulos (`h1`, `h2`, `h3`)
   - Quais elementos são cards ou grids de cards
   - Quais seções têm textos longos que se beneficiariam de reveal
3. Leia o CSS principal e identifique:
   - Se já existe alguma `transition` ou `animation` declarada (para não conflitar)
   - Se existe algum `overflow: hidden` nos containers (importante para o text reveal)
   - O esquema de cores e fontes do projeto
4. Leia todos os arquivos `.js` existentes e identifique:
   - Se já existe algum `scroll` event listener (para consolidar no RAF loop)
   - Se existe algum `IntersectionObserver` (para não duplicar)

---

## 3. Estrutura de Arquivos a Criar

Crie os seguintes arquivos novos — **não modifique** os arquivos JS existentes do projeto ainda:

```
animations/
├── animations.css     ← Todos os estilos de animação
└── animations.js      ← Todo o JS de animação
```

Depois de criar os arquivos, adicione as seguintes linhas no `<head>` do HTML principal (antes do `</head>`):

```html
<link rel="stylesheet" href="animations/animations.css">
```

E antes do `</body>` do HTML principal:

```html
<script src="animations/animations.js" defer></script>
```

---

## 4. Técnica 1 — Text Reveal

### O que faz
Títulos e parágrafos sobem "de dentro para fora" quando entram na viewport, como uma cortina que abre. É a animação mais característica da Apple para textos.

### Como identificar os elementos
Aplique esta técnica em:
- Todos os `h1`, `h2`, `h3` que estejam dentro de `<section>`
- Parágrafos introdutórios (primeiro `<p>` de cada seção)
- **Não aplique** em textos dentro de navegação, footer ou formulários

### Implementação no HTML
Para cada elemento identificado acima, envolva-o em um wrapper sem quebrar a semântica:

```html
<!-- Antes -->
<h2>Título da seção</h2>

<!-- Depois -->
<div class="reveal-line">
  <h2 class="reveal-text">Título da seção</h2>
</div>
```

Se o título tiver múltiplas linhas, quebre por linha:
```html
<div class="reveal-line">
  <h2 class="reveal-text">Primeira linha</h2>
</div>
<div class="reveal-line" style="--reveal-delay: 0.12s">
  <h2 class="reveal-text">Segunda linha</h2>
</div>
```

### CSS em `animations/animations.css`

```css
/* ── TEXT REVEAL ─────────────────────────────── */
.reveal-line {
  overflow: hidden;       /* esconde o texto abaixo do limite */
  line-height: 1.15;
}

.reveal-text {
  display: block;
  transform: translateY(110%);
  will-change: transform;
  transition: transform 1.1s cubic-bezier(0.16, 1, 0.3, 1) var(--reveal-delay, 0s);
}

.reveal-line.is-visible .reveal-text {
  transform: translateY(0);
}
```

### JS em `animations/animations.js`

```js
// ── TEXT REVEAL ───────────────────────────────
function initTextReveal() {
  const lines = document.querySelectorAll('.reveal-line');
  if (!lines.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // dispara só uma vez
      }
    });
  }, { threshold: 0.2, rootMargin: '-40px 0px' });

  lines.forEach(line => observer.observe(line));
}
```

---

## 5. Técnica 2 — Parallax

### O que faz
Elementos de fundo se movem em velocidade menor que o scroll, criando profundidade.

### Como identificar os elementos
Aplique em:
- Elementos decorativos de fundo (imagens de background, formas geométricas, blobs, gradientes)
- **Não aplique** em textos do conteúdo principal — apenas em elementos visuais de suporte
- Se não houver elementos de fundo claros, aplique em imagens de hero ou banners

### Implementação no HTML
Adicione o atributo `data-parallax` com o fator de velocidade:

```html
<!-- Fator 0.3 = movimento lento (fundo distante) -->
<img class="hero-bg-image" data-parallax="0.3" src="..." alt="">

<!-- Fator 0.5 = movimento médio -->
<div class="decorative-blob" data-parallax="0.5"></div>

<!-- Fator 0.7 = movimento mais rápido (elemento mais próximo) -->
<div class="decorative-shape" data-parallax="0.7"></div>
```

Adicione `will-change: transform` nos elementos via CSS para pré-alocar camada GPU.

### CSS em `animations/animations.css`

```css
/* ── PARALLAX ────────────────────────────────── */
[data-parallax] {
  will-change: transform;
}
```

### JS em `animations/animations.js`

```js
// ── PARALLAX ──────────────────────────────────
function initParallax() {
  const elements = document.querySelectorAll('[data-parallax]');
  if (!elements.length) return;

  // Guarda o fator de cada elemento para não reler o DOM no loop
  const items = Array.from(elements).map(el => ({
    el,
    factor: parseFloat(el.getAttribute('data-parallax')) || 0.3
  }));

  // Função chamada pelo RAF loop central (ver Seção 8)
  window._parallaxUpdate = function() {
    const scrollY = window.scrollY;
    items.forEach(({ el, factor }) => {
      const rect = el.getBoundingClientRect();
      // Só processa se o elemento está próximo da viewport
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2);
      el.style.transform = `translateY(${offset * factor * -0.15}px)`;
    });
  };
}
```

---

## 6. Técnica 3 — Scroll Scrubbing (Sticky)

### O que faz
Uma seção "gruda" na tela enquanto o usuário scrolla e anima elementos com base no progresso (0→1) do scroll dentro dessa seção. Ideal para seções de destaque/hero com uma mensagem central.

### Como identificar o elemento
Escolha **uma única seção** — preferencialmente a principal/hero ou uma seção de destaque com texto curto e impactante. Não aplique em múltiplas seções pois cria conflito de UX.

### Implementação no HTML
Identifique a seção escolhida e reestruture assim:

```html
<!-- A section externa define a "altura do scroll" -->
<div class="scrub-section" id="scrub-[nome-da-secao]">
  <!-- O wrapper interno fica sticky -->
  <div class="scrub-sticky">
    <!-- Conteúdo original da seção vai aqui dentro -->
    <div class="scrub-content">
      <!-- Mantenha os elementos originais da seção -->
    </div>
  </div>
</div>
```

### CSS em `animations/animations.css`

```css
/* ── SCROLL SCRUBBING ────────────────────────── */
.scrub-section {
  height: 350vh;  /* espaço de scroll — ajuste conforme necessidade */
  position: relative;
}

.scrub-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.scrub-content {
  width: 100%;
  text-align: center;
  will-change: transform, opacity;
}

/* Elementos dentro do scrubbing que serão animados pelo JS */
.scrub-section [data-scrub-word] {
  display: inline-block;
  opacity: 0.12;
  will-change: opacity;
  transition: none; /* controlado 100% pelo JS/RAF */
}
```

### JS em `animations/animations.js`

```js
// ── SCROLL SCRUBBING ──────────────────────────
function initScrollScrubbing() {
  const section = document.querySelector('.scrub-section');
  if (!section) return;

  // Identifica palavras dentro do scrubbing para iluminação progressiva
  // Quebra os text nodes em spans individuais por palavra
  const content = section.querySelector('.scrub-content');
  if (content) {
    const headings = content.querySelectorAll('h1, h2, h3');
    headings.forEach(heading => {
      const words = heading.textContent.trim().split(/\s+/);
      heading.innerHTML = words
        .map(w => `<span data-scrub-word>${w}</span>`)
        .join(' ');
    });
  }

  const words = section.querySelectorAll('[data-scrub-word]');

  // Função chamada pelo RAF loop central (ver Seção 8)
  window._scrubUpdate = function() {
    const rect = section.getBoundingClientRect();
    const sectionHeight = section.offsetHeight - window.innerHeight;
    if (sectionHeight <= 0) return;

    // progress: 0 no início da seção, 1 no final
    const progress = Math.max(0, Math.min(1, -rect.top / sectionHeight));

    // Ilumina palavras progressivamente
    words.forEach((word, i) => {
      const wordProgress = (progress - i * (0.8 / words.length)) / 0.4;
      word.style.opacity = 0.12 + Math.max(0, Math.min(1, wordProgress)) * 0.88;
    });
  };
}
```

---

## 7. Técnica 4 — 3D Tilt em Cards

### O que faz
Cards inclinam suavemente seguindo o movimento do mouse, com luz especular que acompanha o cursor. No `mouseleave`, voltam ao normal com um efeito de "mola" (spring).

### Como identificar os elementos
Aplique em:
- Grids de cards (portfólio, serviços, produtos, features)
- Elementos que o usuário claramente interage/clica
- **Não aplique** em cards de texto longo ou artigos

### Implementação no HTML
Adicione o atributo `data-tilt` nos cards:

```html
<!-- Antes -->
<div class="card">...</div>

<!-- Depois -->
<div class="card" data-tilt>...</div>
```

O container pai dos cards precisa ter `perspective` para que o 3D funcione:

```html
<!-- Adicione data-tilt-container no elemento pai dos cards -->
<div class="cards-grid" data-tilt-container>
  <div class="card" data-tilt>...</div>
  <div class="card" data-tilt>...</div>
</div>
```

### CSS em `animations/animations.css`

```css
/* ── 3D TILT ─────────────────────────────────── */
[data-tilt-container] {
  perspective: 1000px;
}

[data-tilt] {
  transform-style: preserve-3d;
  will-change: transform;
  transition: box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* Camada de luz especular que segue o mouse */
[data-tilt]::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at var(--tilt-x, 50%) var(--tilt-y, 50%),
    rgba(255, 255, 255, 0.08) 0%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

[data-tilt]:hover::after {
  opacity: 1;
}

[data-tilt]:hover {
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
}
```

### JS em `animations/animations.js`

```js
// ── 3D TILT ───────────────────────────────────
function initTiltCards() {
  const cards = document.querySelectorAll('[data-tilt]');
  if (!cards.length) return;

  const MAX_TILT = 10; // graus máximos de inclinação

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normaliza de -1 a 1
      const nx = (x / rect.width - 0.5) * 2;
      const ny = (y / rect.height - 0.5) * 2;

      const rotateX = -ny * MAX_TILT;
      const rotateY =  nx * MAX_TILT;

      // Atualiza posição da luz especular via CSS custom property
      card.style.setProperty('--tilt-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--tilt-y', `${(y / rect.height) * 100}%`);

      card.style.transition = 'transform 0.08s ease, box-shadow 0.3s ease';
      card.style.transform = `
        perspective(1000px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
        scale3d(1.03, 1.03, 1.03)
      `;
    });

    card.addEventListener('mouseleave', () => {
      // Spring easing no retorno (overshoot leve)
      card.style.transition = 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease';
      card.style.transform = `
        perspective(1000px)
        rotateX(0deg)
        rotateY(0deg)
        scale3d(1, 1, 1)
      `;
    });
  });
}
```

---

## 8. RAF Loop Central

> **Importante:** Nunca adicione múltiplos `scroll` event listeners. Consolide tudo em um único `requestAnimationFrame` loop para garantir 60fps.

Adicione este bloco no final de `animations/animations.js`, **depois** de todas as funções `init*`:

```js
// ── INICIALIZAÇÃO E RAF LOOP CENTRAL ──────────
document.addEventListener('DOMContentLoaded', () => {

  // Inicializa todas as técnicas
  initTextReveal();
  initParallax();
  initScrollScrubbing();
  initTiltCards();

  // Loop RAF único — todas as animações de scroll rodam aqui
  function rafLoop() {
    if (typeof window._parallaxUpdate === 'function') {
      window._parallaxUpdate();
    }
    if (typeof window._scrubUpdate === 'function') {
      window._scrubUpdate();
    }
    requestAnimationFrame(rafLoop);
  }
  requestAnimationFrame(rafLoop);

});
```

---

## 9. Regras de Segurança (Não quebre o site)

O Claude Code **deve** seguir estas regras ao modificar o HTML:

1. **Nunca remova classes existentes** — apenas adicione novas (`data-tilt`, `data-parallax`, `.reveal-line`)
2. **Nunca altere IDs existentes** — âncoras de navegação e JS dependem deles
3. **Nunca mova elementos para fora de seus containers semânticos** — mantenha `<article>`, `<section>`, `<nav>` intactos
4. **Não adicione `will-change` em mais de 8 elementos** — cada um consome memória GPU
5. **O scrubbing é aplicado em no máximo 1 seção** — mais de uma seção sticky cria UX confusa
6. **Não toque no CSS existente** — todas as regras de animação ficam exclusivamente em `animations/animations.css`
7. **Não toque nos JS existentes** — toda lógica nova fica exclusivamente em `animations/animations.js`
8. **Teste responsividade** — em telas menores que 768px, desative tilt e reduza intensidade do parallax:

```css
@media (max-width: 768px) {
  [data-parallax] { will-change: auto; }
  .scrub-section { height: auto; }
  .scrub-sticky { position: relative; height: auto; }
}
```

```js
// No initTiltCards(), adicione no início da função:
if (window.matchMedia('(max-width: 768px)').matches) return;
```

---

## 10. Checklist Final

Após implementar tudo, verifique:

- [ ] Arquivo `animations/animations.css` criado
- [ ] Arquivo `animations/animations.js` criado  
- [ ] `<link>` do CSS adicionado no `<head>` do HTML
- [ ] `<script>` do JS adicionado antes do `</body>` do HTML
- [ ] Text Reveal aplicado nos títulos e parágrafos principais de cada `<section>`
- [ ] Parallax aplicado em elementos decorativos (com `data-parallax`)
- [ ] Scroll Scrubbing aplicado em **uma** seção principal (com `.scrub-section`)
- [ ] 3D Tilt aplicado nos cards existentes (com `data-tilt` e `data-tilt-container`)
- [ ] RAF loop central inicializando todas as técnicas
- [ ] Media query adicionada para desativar efeitos em mobile
- [ ] Nenhum arquivo existente foi modificado além do HTML principal (somente para adicionar os `<link>` e `<script>`)
- [ ] Nenhuma biblioteca externa foi instalada ou importada

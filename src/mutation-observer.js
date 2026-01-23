const allTranslations = { ...databaseData, ...uiTranslations };
const sortedTranslations = Object.entries(allTranslations)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([chinese, english]) => ({
    pattern: new RegExp(chinese.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    english
  }));

function translateText(text) {
  let result = text;
  for (const { pattern, english } of sortedTranslations) {
    result = result.replace(pattern, english);
  }
  return result;
}

function translateElement(element) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while ((node = walker.nextNode())) {
    const original = node.textContent;
    const translated = translateText(original);
    if (original !== translated) {
      node.textContent = translated;
    }
  }

  element.querySelectorAll('[title]').forEach(el => {
    const original = el.title;
    const translated = translateText(original);
    if (original !== translated) {
      el.title = translated;
    }
  });

  element.querySelectorAll('[placeholder]').forEach(el => {
    const original = el.placeholder;
    const translated = translateText(original);
    if (original !== translated) {
      el.placeholder = translated;
    }
  });
}

// Debounced translation queue
let pendingNodes = new Set();
let rafId = null;

function queueTranslation(node) {
  pendingNodes.add(node);
  if (!rafId) {
    rafId = requestAnimationFrame(processPendingTranslations);
  }
}

function processPendingTranslations() {
  rafId = null;
  const nodes = pendingNodes;
  pendingNodes = new Set();

  for (const node of nodes) {
    if (!document.contains(node)) continue;

    if (node.nodeType === Node.ELEMENT_NODE) {
      translateElement(node);
    } else if (node.nodeType === Node.TEXT_NODE) {
      const original = node.textContent;
      const translated = translateText(original);
      if (original !== translated) {
        node.textContent = translated;
      }
    }
  }
}

// Initial translation
translateElement(document.body);

// MutationObserver for dynamic content
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      queueTranslation(node);
    }
    if (mutation.type === 'characterData') {
      queueTranslation(mutation.target);
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});
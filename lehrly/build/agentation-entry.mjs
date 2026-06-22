// Build-Entry für die Agentation-Toolbar.
// Wird von esbuild mit React + agentation zu EINER Datei gebündelt
// (vendor/agentation.bundle.js). Lädt/mountet die Toolbar nur bei ?annotate.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Agentation } from 'agentation';

function mount() {
  if (document.getElementById('agentation-root')) return;
  const el = document.createElement('div');
  el.id = 'agentation-root';
  document.body.appendChild(el);
  createRoot(el).render(
    React.createElement(Agentation, {
      onSubmit: (output, annotations) => {
        console.log('[Agentation] Annotationen:', annotations);
        console.log(output);
      },
    })
  );
  console.info('[Agentation] aktiv — Toolbar unten rechts.');
}

function maybeMount() {
  if (new URLSearchParams(location.search).has('annotate')) {
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);
  }
}

maybeMount();

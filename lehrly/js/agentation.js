// Agentation — visuelles Feedback-Tool für AI-Agents.
// Wird NUR geladen, wenn die URL den Parameter ?annotate enthält,
// damit normale Besucher die Toolbar nicht sehen.
// React/ReactDOM/agentation kommen buildless per Import-Map vom ESM-CDN.

if (new URLSearchParams(location.search).has('annotate')) {
  Promise.all([
    import('react'),
    import('react-dom/client'),
    import('agentation'),
  ])
    .then(([React, { createRoot }, { Agentation }]) => {
      const mount = document.createElement('div');
      mount.id = 'agentation-root';
      document.body.appendChild(mount);
      createRoot(mount).render(
        React.createElement(Agentation, {
          onSubmit: (output, annotations) => {
            console.log('[Agentation] Annotationen:', annotations);
            console.log(output);
          },
        })
      );
      console.info('[Agentation] aktiv — Toolbar unten rechts. Klicke Elemente an, um sie zu annotieren.');
    })
    .catch((err) => console.error('[Agentation] Laden fehlgeschlagen:', err));
}

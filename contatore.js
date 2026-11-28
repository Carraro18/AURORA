/* AURORA – contatore privato v1.00 (GoatCounter, senza cookie)
   Da caricare in ogni pagina, subito prima di </body>:
   <script data-goatcounter="https://aurorab.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
   <script src="contatore.js"></script>
   (account GoatCounter: AuroraB → aurorab.goatcounter.com)

   Cosa conta:
   - visite di ogni pagina (lo fa GoatCounter da solo)
   - fin dove si legge ogni pagina: evento "lettura/<pagina>/<n>-<titolo sezione>"
   - clic sui link: "clic/<pagina>/telegram", "clic/<pagina>/<pagina di arrivo>"
   - test: "test/iniziato", "test/esito/rosso|giallo|verde",
           "test/profilo/P|D|A" (solo verdi), "test/domanda-N/risposta-K"
*/
(function () {
  var pagina = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  var inviati = {};

  function conta(path, titolo) {
    if (inviati[path]) return;            // ogni evento una sola volta per visita
    inviati[path] = true;
    var tentativi = 0;
    (function prova() {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: path, title: titolo || path, event: true });
      } else if (tentativi++ < 40) {
        setTimeout(prova, 250);
      }
    })();
  }

  // 1) Fin dove si legge: una tappa per ogni titolo di sezione (h2) che entra nello schermo
  function tappeLettura() {
    if (pagina === 'test' || !('IntersectionObserver' in window)) return;
    var titoli = document.querySelectorAll('h2');
    var obs = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (!v.isIntersecting) return;
        var i = Array.prototype.indexOf.call(titoli, v.target) + 1;
        var nome = (v.target.textContent || '').trim().toLowerCase()
          .replace(/[^a-z0-9àèéìòù]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
        conta('lettura/' + pagina + '/' + (i < 10 ? '0' : '') + i + '-' + nome);
        obs.unobserve(v.target);
      });
    }, { threshold: 0.6 });
    titoli.forEach(function (t) { obs.observe(t); });
    // fondo pagina raggiunto
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 80) {
        conta('lettura/' + pagina + '/99-fondo-pagina');
      }
    }, { passive: true });
  }

  // 2) Clic sui link (Telegram, altre pagine, FP)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    var dove;
    if (/t\.me|telegram/i.test(h)) dove = 'telegram';
    else if (/fptrading|fpglobaltrading|fpmarkets/i.test(h)) dove = 'fp';
    else dove = (h.split('#')[0].split('/').pop() || 'index.html').replace('.html', '') || 'index';
    conta('clic/' + pagina + '/' + dove);
  }, true);

  // 3) Test "Sei pronto per AURORA?"
  function agganciaTest() {
    if (pagina !== 'test') return;
    if (typeof window.pick === 'function') {
      var pickOrig = window.pick;
      window.pick = function () { conta('test/iniziato'); return pickOrig.apply(this, arguments); };
    }
    if (typeof window.result === 'function') {
      var resultOrig = window.result;
      window.result = function () {
        var r = resultOrig.apply(this, arguments);
        var testo = ((document.getElementById('rt') || {}).textContent || '').toLowerCase();
        var esito = testo.indexOf('non è il momento') >= 0 ? 'rosso'
                  : testo.indexOf('prudente') >= 0 ? 'giallo'
                  : testo.indexOf('pronto') >= 0 ? 'verde' : 'sconosciuto';
        conta('test/esito/' + esito);
        // risposta scelta per ogni domanda (1 = prima opzione)
        for (var n = 0; n < 5; n++) {
          var q = document.getElementById('q' + n);
          if (!q) continue;
          var opz = q.querySelectorAll('button.opt');
          for (var k = 0; k < opz.length; k++) {
            if (opz[k].classList.contains('sel')) conta('test/domanda-' + (n + 1) + '/risposta-' + (k + 1));
          }
        }
        if (esito === 'verde') {
          var d = ((document.getElementById('rd') || {}).textContent || '').toLowerCase();
          var prof = d.indexOf('aggressiv') >= 0 ? 'A' : d.indexOf('dinamic') >= 0 ? 'D' : d.indexOf('prudent') >= 0 ? 'P' : '?';
          conta('test/profilo/' + prof);
        }
        return r;
      };
    }
  }

  // il test può essere rifatto: azzera gli eventi del test quando si clicca "Rifai il test"
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a,button');
    if (a && /rifai/i.test(a.textContent || '')) {
      Object.keys(inviati).forEach(function (k) { if (k.indexOf('test/') === 0) delete inviati[k]; });
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { tappeLettura(); agganciaTest(); });
  } else { tappeLettura(); agganciaTest(); }
})();

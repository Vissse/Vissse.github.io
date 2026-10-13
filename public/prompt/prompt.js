/* Shared behaviour of the prompt pages: collapsible groups on the index,
   markdown rendering + copy button on the detail pages. */

/* ── Index: collapsible groups ── */
document.querySelectorAll(".group-header").forEach(function (btn) {
  var content = document.getElementById(btn.getAttribute("aria-controls"));
  btn.addEventListener("click", function () {
    var isOpen = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!isOpen));
    content.classList.toggle("open", !isOpen);
  });
});

/* ── Detail: prompt text, copy, download ── */
var promptEl = document.getElementById("promptText");
if (promptEl) {
  var copyBtn = document.getElementById("copyBtn");
  var copyLabel = document.getElementById("copyLabel");
  var rawText = "";
  var copyResetTimer = null;

  var fallbackCopy = function (text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    try {
      document.execCommand("copy");
    } catch (e) {
      /* best effort */
    }
    document.body.removeChild(ta);
  };

  copyBtn.addEventListener("click", function () {
    copyBtn.classList.add("copied");
    copyLabel.textContent = "Zkopírováno";
    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(function () {
      copyBtn.classList.remove("copied");
      copyLabel.textContent = "Kopírovat";
    }, 1800);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(rawText).catch(function () {
          fallbackCopy(rawText);
        });
      } else {
        fallbackCopy(rawText);
      }
    } catch (e) {
      fallbackCopy(rawText);
    }
  });

  var revealMarkdown = function () {
    var blocks = Array.prototype.slice.call(
      promptEl.querySelectorAll(
        ":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > p, :scope > ul, :scope > ol, :scope > pre, :scope > blockquote, :scope > hr, :scope > table"
      )
    );
    blocks.forEach(function (el) {
      el.classList.add("md-reveal");
    });
    if (!window.IntersectionObserver) {
      blocks.forEach(function (el) {
        el.classList.add("md-active");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries
          .filter(function (entry) {
            return entry.isIntersecting;
          })
          .sort(function (a, b) {
            return blocks.indexOf(a.target) - blocks.indexOf(b.target);
          })
          .forEach(function (entry, i) {
            entry.target.style.transitionDelay = i * 0.07 + "s";
            entry.target.classList.add("md-active");
            obs.unobserve(entry.target);
          });
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );
    blocks.forEach(function (el) {
      io.observe(el);
    });
  };

  fetch("prompt.md")
    .then(function (r) {
      return r.text();
    })
    .then(function (text) {
      rawText = text;
      var html = typeof marked !== "undefined" ? marked.parse(text) : text;
      var skeleton = document.getElementById("skeleton");
      if (skeleton) skeleton.classList.add("md-active-out");
      setTimeout(function () {
        promptEl.innerHTML = html;
        revealMarkdown();
      }, skeleton ? 180 : 0);
    })
    .catch(function () {
      promptEl.innerHTML = '<p class="md-error">Nepodařilo se načíst obsah promptu.</p>';
    });
}

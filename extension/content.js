(function () {
  "use strict";

  const Core = globalThis.ResumeAutofillCore;
  if (!Core) return;

  function visible(element) {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function textOf(node) {
    return String(node && (node.innerText || node.textContent) || "").replace(/\s+/g, " ").trim();
  }

  function primaryText(element) {
    const parts = [];
    if (element.labels) parts.push(...Array.from(element.labels).map(textOf));
    if (element.id) {
      try {
        const linked = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (linked) parts.push(textOf(linked));
      } catch (_) { /* invalid selector is ignored */ }
    }
    const wrappingLabel = element.closest("label");
    if (wrappingLabel) parts.push(textOf(wrappingLabel));
    for (const attr of ["aria-label", "placeholder", "title", "name", "id", "autocomplete", "data-label"]) {
      const value = element.getAttribute && element.getAttribute(attr);
      if (value) parts.push(value);
    }
    const previous = element.previousElementSibling;
    if (previous) parts.push(textOf(previous));
    return Array.from(new Set(parts.filter(Boolean))).join(" | ").slice(0, 500);
  }

  function contextText(element, primary) {
    const parts = [primary];
    let cursor = element.parentElement;
    for (let depth = 0; cursor && depth < 3; depth += 1, cursor = cursor.parentElement) {
      const classes = String(cursor.className || "");
      const role = cursor.getAttribute && cursor.getAttribute("role");
      const isLikelyField = /form|field|item|control|row|group|cell|input/i.test(classes) || role === "group" || ["FIELDSET", "TD", "LI"].includes(cursor.tagName);
      if (isLikelyField || depth === 0) parts.push(textOf(cursor).slice(0, 800));
    }
    const fieldset = element.closest("fieldset");
    if (fieldset) {
      const legend = fieldset.querySelector("legend");
      if (legend) parts.push(textOf(legend));
    }
    return Array.from(new Set(parts.filter(Boolean))).join(" | ").slice(0, 1800);
  }

  function nativeSet(element, property, value) {
    const prototype = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    if (descriptor && descriptor.set) descriptor.set.call(element, value);
    else element[property] = value;
  }

  function dispatch(element) {
    for (const type of ["input", "change", "blur"]) {
      element.dispatchEvent(new Event(type, { bubbles: true }));
    }
  }

  function isAffirmative(value) {
    return /^(是|有|接受|true|yes|y|1)$/i.test(String(value).trim());
  }

  function radioLabel(element) {
    return [element.value, primaryText(element), textOf(element.closest("label"))].join(" ");
  }

  function applyValue(element, value) {
    const tag = element.tagName;
    const type = String(element.type || "").toLowerCase();
    if (["hidden", "password", "file", "submit", "button", "reset", "image"].includes(type)) return false;

    if (type === "checkbox") {
      nativeSet(element, "checked", isAffirmative(value));
      dispatch(element);
      return true;
    }

    if (type === "radio") {
      const desired = Core.normalizeText(value);
      const ownText = Core.normalizeText(radioLabel(element));
      if (!desired || !(ownText.includes(desired) || desired.includes(Core.normalizeText(element.value)))) return false;
      nativeSet(element, "checked", true);
      dispatch(element);
      return true;
    }

    if (tag === "SELECT") {
      const desired = Core.normalizeText(value);
      const options = Array.from(element.options || []);
      const match = options.find(option => Core.normalizeText(option.value) === desired || Core.normalizeText(option.text) === desired)
        || options.find(option => Core.normalizeText(option.text).includes(desired) || desired.includes(Core.normalizeText(option.text)));
      if (!match) return false;
      nativeSet(element, "value", match.value);
      dispatch(element);
      return true;
    }

    if (element.isContentEditable) {
      element.textContent = value;
      dispatch(element);
      return true;
    }

    let finalValue = value;
    if (type === "date") finalValue = String(value).slice(0, 10).replaceAll("/", "-");
    if (type === "month") finalValue = String(value).slice(0, 7).replaceAll("/", "-");
    nativeSet(element, "value", finalValue);
    dispatch(element);
    return true;
  }

  function currentValue(element) {
    if (element.type === "checkbox" || element.type === "radio") return element.checked ? "checked" : "";
    if (element.isContentEditable) return element.textContent || "";
    return element.value || "";
  }

  function highlight(element) {
    const oldOutline = element.style.outline;
    const oldOffset = element.style.outlineOffset;
    element.style.outline = "2px solid #14b8a6";
    element.style.outlineOffset = "2px";
    setTimeout(() => {
      element.style.outline = oldOutline;
      element.style.outlineOffset = oldOffset;
    }, 2600);
  }

  async function run(options) {
    const stored = await chrome.storage.local.get(["profile"]);
    const profile = Core.deepMergeWithEmpty(stored.profile);
    const config = Object.assign({ includeSensitive: false, overwrite: false, highlight: true }, options || {});
    const elements = Array.from(document.querySelectorAll("input, textarea, select, [contenteditable='true']"));
    const result = { filled: 0, skippedExisting: 0, matchedButUnsupported: 0, inspected: elements.length, frame: location.href };
    const radioGroups = new Set();

    for (const element of elements) {
      if (!visible(element) || element.disabled || element.readOnly) continue;
      if (["one-time-code", "new-password", "current-password"].includes(element.autocomplete)) continue;
      const primary = primaryText(element);
      const context = contextText(element, primary);
      const match = Core.findBestRule(primary, context, profile, config.includeSensitive);
      if (!match) continue;

      const groupKey = element.type === "radio" ? `${element.name}:${match.path}` : "";
      if (groupKey && radioGroups.has(groupKey)) continue;
      if (Core.hasValue(currentValue(element)) && !config.overwrite && !["checkbox", "radio"].includes(element.type)) {
        result.skippedExisting += 1;
        continue;
      }

      const changed = applyValue(element, match.value);
      if (changed) {
        result.filled += 1;
        if (groupKey) radioGroups.add(groupKey);
        if (config.highlight) highlight(element);
        element.dataset.resumeAutofillPath = match.path;
      } else {
        result.matchedButUnsupported += 1;
      }
    }
    return result;
  }

  globalThis.__resumeAutofillRun = run;
})();


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

  const FORM_ITEM_SELECTOR = [
    ".el-form-item", ".ant-form-item", ".ivu-form-item", ".arco-form-item",
    "[class~='form-item']", "[class~='formItem']", "[data-field]", ".field"
  ].join(",");
  const FORM_LABEL_SELECTOR = [
    ".el-form-item__label", ".ant-form-item-label", ".ivu-form-item-label",
    ".arco-form-item-label", "[class*='form-item-label']", "[class*='formItemLabel']",
  ].join(",");
  const CUSTOM_CONTROL_SELECTOR = [
    ".el-select", ".ant-select", ".ivu-select", ".arco-select",
    ".el-cascader", ".ant-cascader-picker", ".arco-cascader",
    ".el-date-editor", ".ant-picker", "[role='combobox']"
  ].join(",");

  function directLabelText(element) {
    const parts = [];
    const labelledBy = String(element.getAttribute && element.getAttribute("aria-labelledby") || "").trim();
    for (const id of labelledBy.split(/\s+/).filter(Boolean)) {
      const node = document.getElementById(id);
      if (node) parts.push(textOf(node));
    }

    const formItem = element.closest(FORM_ITEM_SELECTOR);
    if (formItem) {
      let labels = Array.from(formItem.querySelectorAll(FORM_LABEL_SELECTOR));
      if (!labels.length) {
        labels = Array.from(formItem.querySelectorAll("label")).filter(label => {
          const nestedControl = label.querySelector("input, textarea, select");
          return !nestedControl || nestedControl === element;
        });
      }
      for (const label of labels.slice(0, 4)) {
        const value = textOf(label);
        if (value && value.length <= 120) parts.push(value);
      }
    }

    return Array.from(new Set(parts.filter(Boolean))).join(" | ");
  }

  function primaryText(element) {
    const parts = [directLabelText(element)];
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
    for (let depth = 0; cursor && depth < 5; depth += 1, cursor = cursor.parentElement) {
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

  function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  function customControlFor(element) {
    return element.closest(CUSTOM_CONTROL_SELECTOR);
  }

  function usableControl(element) {
    if (visible(element)) return true;
    if (["radio", "checkbox"].includes(String(element.type || "").toLowerCase())) {
      const wrapper = element.closest("label, .el-radio, .el-checkbox, .ant-radio-wrapper, .ant-checkbox-wrapper, [role='radio'], [role='checkbox']");
      return Boolean(wrapper && visible(wrapper));
    }
    return false;
  }

  function dateLike(value, element, primary) {
    if (!/^\d{4}[-/]\d{2}([-/]\d{2})?$/.test(String(value).trim())) return false;
    const hint = `${primary} ${element.className || ""} ${customControlFor(element)?.className || ""}`;
    return /日期|时间|年月|date|month|picker/i.test(hint);
  }

  function visibleOptions() {
    const selectors = [
      ".el-select-dropdown__item", ".el-cascader-node", ".ant-select-item-option",
      ".ant-cascader-menu-item", ".ivu-select-item", ".arco-select-option",
      ".arco-cascader-option", "[role='option']", "[role='menuitemradio']"
    ].join(",");
    return Array.from(document.querySelectorAll(selectors)).filter(option => {
      const disabled = option.getAttribute("aria-disabled") === "true" || /disabled/i.test(String(option.className || ""));
      return !disabled && visible(option) && textOf(option);
    });
  }

  function bestOption(options, desiredValue) {
    const desired = Core.normalizeText(desiredValue);
    return options.find(option => Core.normalizeText(textOf(option)) === desired)
      || options.find(option => {
        const optionText = Core.normalizeText(textOf(option));
        return optionText && (optionText.includes(desired) || desired.includes(optionText));
      });
  }

  async function selectCustomOption(element, value) {
    const control = customControlFor(element) || element;
    const clickTarget = control.querySelector("[role='combobox'], input") || control;
    clickTarget.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
    clickTarget.click();
    await wait(140);

    const segments = String(value).split(/\s*[/／>＞]\s*/).map(part => part.trim()).filter(Boolean);
    for (const segment of segments.length ? segments : [String(value)]) {
      let options = visibleOptions();
      let match = bestOption(options, segment);
      if (!match) {
        await wait(180);
        options = visibleOptions();
        match = bestOption(options, segment);
      }
      if (!match) return false;
      match.scrollIntoView({ block: "nearest" });
      match.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
      match.click();
      await wait(140);
    }
    return true;
  }

  async function applyValue(element, value, primary) {
    const tag = element.tagName;
    const type = String(element.type || "").toLowerCase();
    if (["hidden", "password", "file", "submit", "button", "reset", "image"].includes(type)) return { changed: false };

    if (type === "checkbox") {
      const desired = isAffirmative(value);
      if (element.checked !== desired) element.click();
      return { changed: element.checked === desired, kind: "choice" };
    }

    if (type === "radio") {
      const desired = Core.normalizeText(value);
      const ownText = Core.normalizeText(radioLabel(element));
      if (!desired || !(ownText.includes(desired) || desired.includes(Core.normalizeText(element.value)))) return { changed: false };
      if (!element.checked) element.click();
      return { changed: element.checked, kind: "choice" };
    }

    if (tag === "SELECT") {
      const desired = Core.normalizeText(value);
      const options = Array.from(element.options || []);
      const match = options.find(option => Core.normalizeText(option.value) === desired || Core.normalizeText(option.text) === desired)
        || options.find(option => Core.normalizeText(option.text).includes(desired) || desired.includes(Core.normalizeText(option.text)));
      if (!match) return { changed: false };
      nativeSet(element, "value", match.value);
      dispatch(element);
      return { changed: true, kind: "select" };
    }

    if (element.isContentEditable) {
      element.textContent = value;
      dispatch(element);
      return { changed: true, kind: "text" };
    }

    const customControl = customControlFor(element);
    if (dateLike(value, element, primary)) {
      const finalValue = String(value).replaceAll("/", "-");
      nativeSet(element, "value", finalValue);
      dispatch(element);
      return { changed: Core.normalizeText(element.value) === Core.normalizeText(finalValue), kind: customControl ? "custom" : "text" };
    }

    if (customControl && (element.readOnly || /select|cascader|combobox/i.test(`${customControl.className || ""} ${element.getAttribute("role") || ""}`))) {
      const selected = await selectCustomOption(element, value);
      return { changed: selected, kind: "custom" };
    }

    if (element.readOnly) return { changed: false };

    let finalValue = value;
    if (type === "date") finalValue = String(value).slice(0, 10).replaceAll("/", "-");
    if (type === "month") finalValue = String(value).slice(0, 7).replaceAll("/", "-");
    nativeSet(element, "value", finalValue);
    dispatch(element);
    return { changed: true, kind: "text" };
  }

  function currentValue(element) {
    if (element.type === "checkbox" || element.type === "radio") return element.checked ? "checked" : "";
    if (element.isContentEditable) return element.textContent || "";
    return element.value || "";
  }

  function highlight(element) {
    const target = visible(element) ? element : element.closest("label, .el-radio, .el-checkbox, .ant-radio-wrapper, .ant-checkbox-wrapper") || element;
    const oldOutline = target.style.outline;
    const oldOffset = target.style.outlineOffset;
    target.style.outline = "2px solid #14b8a6";
    target.style.outlineOffset = "2px";
    setTimeout(() => {
      target.style.outline = oldOutline;
      target.style.outlineOffset = oldOffset;
    }, 2600);
  }

  async function run(options) {
    const stored = await chrome.storage.local.get(["profile"]);
    const profile = Core.deepMergeWithEmpty(stored.profile);
    const config = Object.assign({ includeSensitive: false, overwrite: false, highlight: true }, options || {});
    const elements = Array.from(document.querySelectorAll("input, textarea, select, [contenteditable='true']"));
    const result = { filled: 0, customFilled: 0, skippedExisting: 0, matchedButUnsupported: 0, inspected: elements.length, frame: location.href };
    const radioGroups = new Set();

    for (const element of elements) {
      if (!usableControl(element) || element.disabled) continue;
      if (["one-time-code", "new-password", "current-password"].includes(element.autocomplete)) continue;
      const primary = primaryText(element);
      const context = contextText(element, primary);
      const match = Core.findBestRule(primary, context, profile, config.includeSensitive);
      if (!match) continue;

      const groupKey = element.type === "radio" ? `${element.name || primary}:${match.path}` : "";
      if (groupKey && radioGroups.has(groupKey)) continue;
      if (Core.hasValue(currentValue(element)) && !config.overwrite && !["checkbox", "radio"].includes(element.type)) {
        result.skippedExisting += 1;
        continue;
      }

      const outcome = await applyValue(element, match.value, primary);
      if (outcome.changed) {
        result.filled += 1;
        if (outcome.kind === "custom") result.customFilled += 1;
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

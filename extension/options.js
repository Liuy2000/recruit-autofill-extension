(async function () {
  "use strict";
  const Core = globalThis.ResumeAutofillCore;
  const editor = document.getElementById("editor");
  const navigation = document.getElementById("navigation");
  const toast = document.getElementById("toast");
  let profile = Core.emptyProfile();

  const stored = await chrome.storage.local.get(["profile"]);
  profile = Core.deepMergeWithEmpty(stored.profile);
  render();

  function fieldPath(sectionId, fieldId) { return `${sectionId}.${fieldId}`; }

  function createField(field, path, value) {
    const [id, label, type = "text", sensitive = false] = field;
    const wrapper = document.createElement("div");
    wrapper.className = `field${type === "textarea" ? " wide" : ""}`;
    const labelNode = document.createElement("label");
    labelNode.htmlFor = `field-${path.replaceAll(".", "-")}`;
    labelNode.append(document.createTextNode(label));
    if (sensitive) {
      const badge = document.createElement("em");
      badge.textContent = "敏感";
      labelNode.append(badge);
    }
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    input.id = labelNode.htmlFor;
    if (type !== "textarea") input.type = type;
    input.value = value == null ? "" : value;
    input.dataset.path = path;
    input.autocomplete = "off";
    wrapper.append(labelNode, input);
    return wrapper;
  }

  function sectionHeader(section, addButton) {
    const heading = document.createElement("div");
    heading.className = "section-heading";
    const text = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = section.title;
    const description = document.createElement("p");
    description.textContent = section.description || `可添加多条${section.itemName}记录。`;
    text.append(title, description);
    heading.append(text);
    if (section.sensitive) {
      const badge = document.createElement("span");
      badge.className = "sensitive-badge";
      badge.textContent = "默认不自动填写";
      heading.append(badge);
    } else if (addButton) heading.append(addButton);
    return heading;
  }

  function render() {
    editor.replaceChildren();
    navigation.replaceChildren();
    for (const section of Core.FORM_SECTIONS) renderScalarSection(section);
    for (const section of Core.ARRAY_SECTIONS) renderArraySection(section);
  }

  function addNav(section) {
    const link = document.createElement("a");
    link.href = `#section-${section.id}`;
    link.textContent = section.title;
    navigation.append(link);
  }

  function renderScalarSection(section) {
    addNav(section);
    const card = document.createElement("section");
    card.className = "section-card";
    card.id = `section-${section.id}`;
    const fields = document.createElement("div");
    fields.className = "fields";
    for (const field of section.fields) {
      const path = fieldPath(section.id, field[0]);
      fields.append(createField(field, path, Core.getByPath(profile, path)));
    }
    card.append(sectionHeader(section), fields);
    editor.append(card);
  }

  function renderArraySection(section) {
    addNav(section);
    const card = document.createElement("section");
    card.className = "section-card";
    card.id = `section-${section.id}`;
    const body = document.createElement("div");
    body.className = "array-body";
    const records = Array.isArray(profile[section.id]) ? profile[section.id] : [];
    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "empty-records";
      empty.textContent = `尚未添加${section.itemName}记录。`;
      body.append(empty);
    }
    records.forEach((record, index) => body.append(createRecord(section, record, index)));
    const add = document.createElement("button");
    add.className = "add-record";
    add.textContent = `＋ 添加${section.itemName}`;
    add.addEventListener("click", () => {
      collectFromDom();
      profile[section.id].push({});
      render();
      document.getElementById(`section-${section.id}`).scrollIntoView({ block: "start" });
    });
    body.append(add);
    card.append(sectionHeader(section), body);
    editor.append(card);
  }

  function createRecord(section, record, index) {
    const details = document.createElement("details");
    details.className = "record";
    details.open = index === 0;
    const summary = document.createElement("summary");
    const title = document.createElement("span");
    title.className = "record-title";
    const nameField = section.fields[0][0];
    title.textContent = `${section.itemName} ${index + 1}${record[nameField] ? ` · ${record[nameField]}` : ""}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "record-remove";
    remove.textContent = "删除";
    remove.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      collectFromDom();
      profile[section.id].splice(index, 1);
      render();
    });
    summary.append(title, remove);
    const fields = document.createElement("div");
    fields.className = "record-fields";
    for (const field of section.fields) {
      const path = `${section.id}.${index}.${field[0]}`;
      fields.append(createField(field, path, record[field[0]]));
    }
    details.append(summary, fields);
    return details;
  }

  function collectFromDom() {
    document.querySelectorAll("[data-path]").forEach(input => {
      const value = input.value.trim();
      Core.setByPath(profile, input.dataset.path, value);
    });
    for (const section of Core.ARRAY_SECTIONS) {
      profile[section.id] = (profile[section.id] || []).map(record => {
        const clean = {};
        for (const [key] of section.fields) if (Core.hasValue(record[key])) clean[key] = record[key];
        return clean;
      }).filter(record => Object.keys(record).length);
    }
  }

  async function save() {
    collectFromDom();
    profile.updatedAt = new Date().toISOString();
    await chrome.storage.local.set({ profile });
    showToast(`已保存 ${Core.countValues(profile)} 项资料。`);
    render();
  }

  document.getElementById("saveButton").addEventListener("click", save);
  document.getElementById("importButton").addEventListener("click", () => document.getElementById("fileInput").click());
  document.getElementById("fileInput").addEventListener("change", importFile);
  document.getElementById("exportJson").addEventListener("click", () => {
    collectFromDom();
    download("简历自动填写-个人资料.json", JSON.stringify(profile, null, 2), "application/json;charset=utf-8");
  });
  document.getElementById("exportCsv").addEventListener("click", () => {
    collectFromDom();
    download("简历自动填写-个人资料.csv", "\ufeff" + toCsv(profile), "text/csv;charset=utf-8");
  });
  document.getElementById("resetButton").addEventListener("click", async () => {
    if (!confirm("确定清空浏览器中保存的全部个人资料吗？此操作不会删除你导出的备份文件。")) return;
    profile = Core.emptyProfile();
    await chrome.storage.local.set({ profile });
    render();
    showToast("已清空全部资料。", true);
  });

  async function importFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const imported = file.name.toLowerCase().endsWith(".csv") ? fromCsv(text) : JSON.parse(text);
      profile = Core.deepMergeWithEmpty(imported);
      profile.updatedAt = new Date().toISOString();
      await chrome.storage.local.set({ profile });
      render();
      showToast(`已导入 ${Core.countValues(profile)} 项资料。`);
    } catch (error) {
      showToast(`导入失败：${error.message}`, true);
    }
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function quoteCsv(value) {
    const text = String(value == null ? "" : value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function toCsv(data) {
    const rows = [["section", "index", "field", "label", "value"]];
    for (const section of Core.FORM_SECTIONS) {
      for (const field of section.fields) {
        const value = Core.getByPath(data, `${section.id}.${field[0]}`);
        if (Core.hasValue(value)) rows.push([section.id, "", field[0], field[1], value]);
      }
    }
    for (const section of Core.ARRAY_SECTIONS) {
      (data[section.id] || []).forEach((record, index) => {
        for (const field of section.fields) {
          if (Core.hasValue(record[field[0]])) rows.push([section.id, index, field[0], field[1], record[field[0]]]);
        }
      });
    }
    return rows.map(row => row.map(quoteCsv).join(",")).join("\r\n");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    const source = String(text).replace(/^\ufeff/, "");
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") { row.push(cell); cell = ""; }
      else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
      else cell += char;
    }
    if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
    return rows;
  }

  function fromCsv(text) {
    const rows = parseCsv(text);
    if (!rows.length || rows[0].slice(0, 5).join(",") !== "section,index,field,label,value") {
      throw new Error("CSV 格式不正确，请使用本扩展导出的 CSV 模板");
    }
    const imported = Core.emptyProfile();
    for (const row of rows.slice(1)) {
      const [section, index, field, , value] = row;
      if (!section || !field || !Core.hasValue(value)) continue;
      const path = index === "" ? `${section}.${field}` : `${section}.${Number(index)}.${field}`;
      Core.setByPath(imported, path, value);
    }
    return imported;
  }

  let toastTimer;
  function showToast(message, isError) {
    toast.textContent = message;
    toast.className = `show${isError ? " error" : ""}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = ""; }, 3000);
  }
})();


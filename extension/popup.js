(async function () {
  "use strict";
  const Core = globalThis.ResumeAutofillCore;
  const summary = document.getElementById("profileSummary");
  const result = document.getElementById("result");
  const fillButton = document.getElementById("fillButton");
  const includeSensitive = document.getElementById("includeSensitive");
  const overwrite = document.getElementById("overwrite");
  const highlight = document.getElementById("highlight");
  document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;

  const stored = await chrome.storage.local.get(["profile", "popupSettings"]);
  const profile = Core.deepMergeWithEmpty(stored.profile);
  const count = Core.countValues(profile);
  summary.textContent = count ? `${profile.personal.fullName || "本地资料"} · 已保存 ${count} 项` : "尚未导入个人资料";
  const settings = Object.assign({ includeSensitive: false, overwrite: false, highlight: true }, stored.popupSettings || {});
  includeSensitive.checked = Boolean(settings.includeSensitive);
  overwrite.checked = Boolean(settings.overwrite);
  highlight.checked = settings.highlight !== false;

  document.getElementById("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

  fillButton.addEventListener("click", async () => {
    result.className = "";
    if (!Core.countValues(profile)) {
      result.textContent = "请先导入或填写个人资料。";
      result.className = "error";
      return;
    }
    const options = {
      includeSensitive: includeSensitive.checked,
      overwrite: overwrite.checked,
      highlight: highlight.checked
    };
    await chrome.storage.local.set({ popupSettings: options });
    fillButton.disabled = true;
    fillButton.textContent = "正在识别表单…";
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) throw new Error("未找到当前标签页");
      await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["core.js", "content.js"] });
      const executions = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: opts => globalThis.__resumeAutofillRun ? globalThis.__resumeAutofillRun(opts) : { filled: 0, inspected: 0 },
        args: [options]
      });
      const reports = await Promise.all(executions.map(item => Promise.resolve(item.result)));
      const totals = reports.reduce((acc, item) => {
        const value = item || {};
        acc.filled += Number(value.filled || 0);
        acc.customFilled += Number(value.customFilled || 0);
        acc.skippedExisting += Number(value.skippedExisting || 0);
        acc.matchedButUnsupported += Number(value.matchedButUnsupported || 0);
        acc.inspected += Number(value.inspected || 0);
        return acc;
      }, { filled: 0, customFilled: 0, skippedExisting: 0, matchedButUnsupported: 0, inspected: 0 });
      if (totals.filled) {
        result.textContent = `已填写 ${totals.filled} 项${totals.customFilled ? `（含自定义组件 ${totals.customFilled} 项）` : ""}${totals.skippedExisting ? `，保留已有内容 ${totals.skippedExisting} 项` : ""}。请核对后再提交。`;
        result.className = "success";
      } else {
        result.textContent = totals.matchedButUnsupported
          ? `识别到 ${totals.matchedButUnsupported} 个字段，但页面组件暂不接受自动赋值。`
          : totals.inspected ? "未找到可高置信匹配的空白字段。可在设置中补充资料。" : "当前页面没有可访问的表单字段。";
      }
    } catch (error) {
      result.textContent = /Cannot access|chrome:\/\/|edge:\/\//i.test(error.message)
        ? "浏览器内部页面不允许扩展注入，请在招聘网站页面使用。"
        : `填写失败：${error.message}`;
      result.className = "error";
    } finally {
      fillButton.disabled = false;
      fillButton.textContent = "填写当前页面";
    }
  });
})();

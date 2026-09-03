# 招聘简历自动填写助手

一个面向 Chrome / Edge 的本地浏览器扩展，用于在招聘网站上按需填写个人信息。扩展不会联网，不会自动提交表单，身份证、紧急联系人和家庭成员等敏感字段默认关闭。

## 已完成的 GitHub 调研

截至 2026-09-03，GitHub 上存在通用求职自动填写项目，例如：

- [OpenJobAutofill](https://github.com/Br1an67/OpenJobAutofill)：隐私优先、AI 辅助的通用项目。
- [EasyApp](https://github.com/EasyApp-RPI/EasyApp)：面向英文招聘表单的早期项目。
- [AutoFill Pro](https://github.com/Zobayerul/AutoFill-Pro-Job-Portal-Autofill-Extension)：通用职位门户自动填写项目。
- [Resume Autofill Chrome Extension](https://github.com/tao-991/Resume_Autofill_Chrome_Extension)：带资料界面的通用扩展。

没有检索到能直接覆盖中文招聘字段、适配本项目资料结构且默认本地保存敏感信息的成熟项目。因此本项目采用独立、无依赖的 Manifest V3 实现，不复制上述项目代码。

## 安装

1. 打开 Chrome 的 `chrome://extensions`，或 Edge 的 `edge://extensions`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目的 `extension` 文件夹。
5. 点击扩展图标，再点“修改 / 导入个人资料”。
6. 导入你自己的本地个人资料 JSON，确认内容后点击“保存资料”。如需先测试，可使用不含真实信息的 `fixtures/sample-profile.json`。

`private` 目录不会被打进发布压缩包，也已加入 `.gitignore`，避免把个人信息误传到 GitHub。仓库内的示例资料全部为虚构数据。

## 使用

1. 打开招聘网站的申请表单页面。
2. 点击扩展图标。
3. 默认保持“允许填写敏感字段”关闭。
4. 点击“填写当前页面”。
5. 检查绿色高亮的字段，补充网站自定义组件，最后由你手动提交。

扩展默认不覆盖已有内容。若页面里已经有旧数据，可在弹窗中临时开启“覆盖已有内容”。

## 资料编辑与 Excel

设置页可以直接编辑基本信息、求职意向、教育、项目、实习、外语、奖项和家庭成员，也支持：

- JSON 导入 / 导出：完整保留层级结构，推荐用于备份。
- CSV 导入 / 导出：采用 `section,index,field,label,value` 长表格式，Excel 可直接打开和编辑。重新导入时请保留列名和字段标识。

## 隐私与安全设计

- 资料只写入 `chrome.storage.local`，没有网络请求或远程接口。
- 仅在用户点击扩展按钮后，借助 `activeTab` 临时注入当前页面。
- 不申请 `<all_urls>` 常驻访问权限。
- 不自动点击“下一步”“投递”或“提交”。
- 密码、验证码、文件上传控件永远不会填写。
- 敏感字段必须在每次需要时显式开启。

## 当前限制

- Ant Design、Element Plus 等框架的自定义级联地区、搜索下拉框可能需要手动选择。
- 浏览器出于安全原因禁止脚本自动设置文件上传框，因此简历附件仍需手动上传。
- 重复经历表单的布局差异很大；扩展优先填写高置信字段，不确定时会留空。
- 浏览器内部页面、扩展商店和部分受保护页面禁止脚本注入。

## 版本记录

- `1.0.3`：针对北森 `zhiye.com` 简历表单增加 Phoenix 下拉框、选项列表和地区选择弹层支持，并在弹窗中显示当前版本。
- `1.0.2`：支持无原生输入框的新版 Element/Ant 自定义下拉框，并增强多级户口所在地级联选择。
- `1.0.1`：增强企业招聘系统兼容性，支持 Element/Ant 风格的外置字段标签、隐藏单选框、只读日期框、自定义下拉框和多级地区选择。
- `1.0.0`：首个隐私优先版本。

## 本地验证

在项目根目录运行：

```powershell
node tests/core.test.cjs
node --check extension/core.js
node --check extension/content.js
node --check extension/popup.js
node --check extension/options.js
```

也可以在浏览器打开 `tests/form-demo.html`，加载扩展后进行人工填写测试。

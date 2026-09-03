"use strict";
const assert = require("node:assert/strict");
const Core = require("../extension/core.js");

const profile = Core.emptyProfile();
profile.personal = {
  fullName: "示例用户",
  email: "demo@example.com",
  phone: "13800000000",
  idNumber: "TEST-ID-0001",
  graduationSchool: "示例大学"
};
profile.emergencyContact = { name: "示例联系人", phone: "13900000000" };
profile.education = [{ school: "示例大学", major: "机械工程" }];

assert.equal(Core.findBestRule("姓名", "个人信息 姓名", profile, false).value, "示例用户");
assert.equal(Core.findBestRule("联系邮箱", "个人信息 联系邮箱", profile, false).value, "demo@example.com");
assert.equal(Core.findBestRule("紧急联系人姓名", "紧急联系人姓名", profile, false), null);
assert.equal(Core.findBestRule("紧急联系人姓名", "紧急联系人姓名", profile, true).value, "示例联系人");
assert.equal(Core.findBestRule("身份证号码", "证件信息 身份证号码", profile, false), null);
assert.equal(Core.findBestRule("身份证号码", "证件信息 身份证号码", profile, true).value, "TEST-ID-0001");
assert.equal(Core.findBestRule("学校名称", "教育背景 学校名称", profile, false).value, "示例大学");
assert.equal(Core.findBestRule("专业名称", "教育背景 专业名称", profile, false).value, "机械工程");
assert.equal(Core.findBestRule("联系电话", "紧急联系人 联系电话", profile, true).value, "13900000000");

const merged = Core.deepMergeWithEmpty({ personal: { fullName: "示例用户" } });
assert.deepEqual(merged.projects, []);
assert.equal(Core.countValues(merged), 1);

console.log("core tests passed");

(function (root, factory) {
  const api = factory();
  root.ResumeAutofillCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PROFILE_VERSION = 1;

  const FORM_SECTIONS = [
    {
      id: "personal",
      title: "基本信息",
      description: "常见招聘表单字段。空白字段不会参与自动填写。",
      fields: [
        ["fullName", "姓名"], ["gender", "性别"], ["email", "邮箱", "email"],
        ["phone", "手机号", "tel"], ["wechat", "微信号"], ["qq", "QQ号"],
        ["birthDate", "出生日期", "date"], ["nationality", "国籍"], ["ethnicity", "民族"],
        ["maritalStatus", "婚姻状况"], ["politicalStatus", "政治面貌"],
        ["idType", "证件类型", "text", true], ["idNumber", "身份证号", "text", true],
        ["currentAddress", "现居住地"], ["nativePlace", "籍贯"], ["studentOrigin", "生源地"],
        ["highestDegree", "最高学位"], ["highestEducation", "最高学历"],
        ["graduationSchool", "毕业院校"], ["studyType", "学习形式"],
        ["graduationDate", "毕业时间", "date"], ["englishLevel", "英语等级"],
        ["gaokaoDate", "高考时间", "date"], ["gaokaoScore", "高考分数", "number"],
        ["gaokaoSubjects", "高考科目"], ["workYears", "工作年限", "number"],
        ["postalCode", "邮政编码"], ["healthStatus", "健康状况"], ["bloodType", "血型"],
        ["pinyin", "姓名拼音"], ["freshGraduate", "是否应届生"],
        ["recommendedExempt", "是否保研"], ["overseasExperience", "是否有留学经历"],
        ["colorWeakness", "是否色弱"], ["leagueJoinDate", "入团/入党时间", "date"],
        ["householdType", "户口性质"], ["householdLocation", "户口所在地"],
        ["archiveLocation", "档案所在地"], ["heightCm", "身高（cm）", "number"],
        ["weightKg", "体重（kg）", "number"],
        ["selfIntroduction", "自我介绍", "textarea"]
      ]
    },
    {
      id: "jobIntent",
      title: "求职意向",
      description: "会随投递岗位变化的内容，请在填写前确认。",
      fields: [
        ["targetRole", "目标岗位"], ["expectedCity", "期望城市"],
        ["expectedSalary", "期望薪资"], ["availableDate", "预计到岗时间", "date"],
        ["recruitmentSource", "招聘信息来源"], ["acceptTransfer", "是否接受调剂"]
      ]
    },
    {
      id: "emergencyContact",
      title: "紧急联系人（敏感）",
      description: "仅在弹窗中勾选“允许填写敏感字段”后才会使用。",
      sensitive: true,
      fields: [
        ["name", "联系人姓名", "text", true], ["relationship", "与本人关系", "text", true],
        ["phone", "联系人电话", "tel", true]
      ]
    },
    {
      id: "skills",
      title: "技能与证书",
      description: "适合填写技能、证书和语言能力等长文本字段。",
      fields: [
        ["technical", "技术技能", "textarea"], ["language", "语言能力", "textarea"],
        ["software", "软件技能", "textarea"], ["certificates", "证书认证", "textarea"]
      ]
    }
  ];

  const ARRAY_SECTIONS = [
    {
      id: "education", title: "教育背景", itemName: "教育经历",
      fields: [
        ["school", "学校"], ["studentId", "学号"], ["college", "院系"], ["major", "专业"],
        ["city", "学校城市"], ["advisor", "导师"], ["level", "学历"], ["status", "学历状态"],
        ["degree", "学位"], ["durationYears", "学制（年）"], ["startDate", "入学时间", "date"],
        ["endDate", "毕业时间", "date"], ["studyType", "教育方式"],
        ["admissionType", "招生类别"], ["schoolType", "学校类型"],
        ["courses", "专业课程", "textarea"], ["description", "教育描述", "textarea"]
      ]
    },
    {
      id: "projects", title: "项目 / 科研经历", itemName: "项目",
      fields: [
        ["name", "项目名称"], ["role", "项目职务"], ["type", "实践方式"],
        ["startDate", "开始时间", "date"], ["endDate", "结束时间", "date"],
        ["location", "项目地址"], ["organization", "合作单位/项目来源"],
        ["witnessName", "证明人", "text", true], ["witnessPhone", "证明人电话", "tel", true],
        ["witnessTitle", "证明人职位", "text", true],
        ["description", "项目描述", "textarea"], ["responsibilities", "项目职责", "textarea"],
        ["result", "项目成果", "textarea"]
      ]
    },
    {
      id: "internships", title: "实习经历", itemName: "实习",
      fields: [
        ["company", "实习单位"], ["department", "部门"], ["position", "职位"],
        ["startDate", "开始时间", "date"], ["endDate", "结束时间", "date"],
        ["location", "实习地址"], ["employmentType", "用工性质"],
        ["witnessName", "证明人", "text", true], ["description", "实习描述", "textarea"]
      ]
    },
    {
      id: "languages", title: "外语能力", itemName: "语言",
      fields: [
        ["language", "语言"], ["certificate", "证书名称"], ["score", "成绩"],
        ["obtainedDate", "获得时间", "date"], ["level", "掌握程度"]
      ]
    },
    {
      id: "awards", title: "获奖经历", itemName: "奖项",
      fields: [
        ["name", "奖项名称"], ["issuer", "颁发机构"], ["date", "获奖时间", "date"],
        ["level", "奖项级别"], ["type", "奖励类型"], ["grade", "奖励等级"],
        ["description", "获奖描述", "textarea"]
      ]
    },
    {
      id: "family", title: "家庭成员（敏感）", itemName: "家庭成员", sensitive: true,
      fields: [
        ["name", "姓名", "text", true], ["relationship", "关系", "text", true],
        ["gender", "性别", "text", true], ["education", "教育程度", "text", true],
        ["ethnicity", "民族", "text", true], ["birthDate", "出生日期", "date", true],
        ["phone", "联系电话", "tel", true], ["occupation", "职业/职位", "text", true],
        ["politicalStatus", "政治面貌", "text", true], ["address", "联系地址", "text", true]
      ]
    }
  ];

  const FIELD_RULES = [
    rule("personal.fullName", ["姓名", "真实姓名", "应聘者姓名", "中文姓名", "name", "full name"], { exclude: ["紧急", "联系人", "家庭", "成员", "导师", "证明人", "推荐人"] }),
    rule("personal.gender", ["性别", "gender", "sex"]),
    rule("personal.email", ["邮箱", "电子邮箱", "联系邮箱", "email", "e-mail"]),
    rule("personal.phone", ["手机", "手机号", "手机号码", "联系电话", "电话", "mobile", "phone"], { exclude: ["紧急", "联系人", "家庭", "成员", "证明人", "推荐人", "辅导员"] }),
    rule("personal.wechat", ["微信", "微信号", "wechat"]),
    rule("personal.qq", ["qq", "qq号", "qq号码"]),
    rule("personal.birthDate", ["出生日期", "出生年月", "生日", "date of birth", "birth date", "birthday"]),
    rule("personal.nationality", ["国籍", "nationality", "citizenship"]),
    rule("personal.ethnicity", ["民族", "ethnicity"]),
    rule("personal.maritalStatus", ["婚姻状况", "婚姻状态", "marital status"]),
    rule("personal.politicalStatus", ["政治面貌", "political status"]),
    rule("personal.idType", ["证件类型", "证件种类", "id type"], { sensitive: true }),
    rule("personal.idNumber", ["身份证号", "身份证号码", "证件号码", "证件号", "id number", "identity number"], { sensitive: true }),
    rule("personal.currentAddress", ["现居住地", "现住址", "居住地址", "当前地址", "联系地址", "current address", "address"]),
    rule("personal.nativePlace", ["籍贯", "native place", "hometown"]),
    rule("personal.studentOrigin", ["生源地", "毕业生生源地"]),
    rule("personal.highestDegree", ["最高学位", "学位", "degree"], { exclude: ["教育经历", "第1条", "第2条"] }),
    rule("personal.highestEducation", ["最高学历", "学历", "education level", "highest education"], { exclude: ["教育经历", "第1条", "第2条"] }),
    rule("personal.graduationSchool", ["毕业院校", "毕业学校", "最高学历院校", "school", "university", "college"]),
    rule("personal.studyType", ["学习形式", "教育方式", "培养方式", "study type"]),
    rule("personal.graduationDate", ["毕业时间", "毕业日期", "graduation date"]),
    rule("personal.englishLevel", ["英语等级", "英语水平", "english level"]),
    rule("personal.gaokaoDate", ["高考时间", "高考参加时间"]),
    rule("personal.gaokaoScore", ["高考分数", "高考成绩"]),
    rule("personal.gaokaoSubjects", ["高考科目", "选科组合", "高考选科"]),
    rule("personal.workYears", ["工作年限", "总工作年限", "years of experience", "work experience years"]),
    rule("personal.postalCode", ["邮政编码", "邮编", "zip code", "postal code"]),
    rule("personal.healthStatus", ["健康状况", "健康状态", "health status"]),
    rule("personal.bloodType", ["血型", "blood type"]),
    rule("personal.pinyin", ["姓名拼音", "拼音姓名", "name pinyin", "pinyin"]),
    rule("personal.freshGraduate", ["是否应届生", "应届毕业生", "fresh graduate"]),
    rule("personal.recommendedExempt", ["是否保研", "推荐免试"]),
    rule("personal.overseasExperience", ["是否有留学经历", "海外留学经历", "overseas experience"]),
    rule("personal.colorWeakness", ["是否色弱", "色觉弱"]),
    rule("personal.leagueJoinDate", ["入团时间", "入党时间", "入团/入党时间"]),
    rule("personal.householdType", ["户口性质", "household type"]),
    rule("personal.householdLocation", ["户口所在地", "户籍所在地", "household location"]),
    rule("personal.archiveLocation", ["档案所在地", "人事档案所在地"]),
    rule("personal.heightCm", ["身高", "身高(cm)", "height"]),
    rule("personal.weightKg", ["体重", "体重(kg)", "weight"]),
    rule("personal.selfIntroduction", ["自我介绍", "个人介绍", "自我评价", "个人简介", "summary", "about me"]),
    rule("jobIntent.targetRole", ["目标岗位", "应聘岗位", "求职意向", "期望职位", "target role", "desired position"]),
    rule("jobIntent.expectedCity", ["期望城市", "工作城市", "意向城市", "desired city"]),
    rule("jobIntent.expectedSalary", ["期望薪资", "期望月薪", "薪资要求", "expected salary"]),
    rule("jobIntent.availableDate", ["预计到岗时间", "预计入职时间", "到岗时间", "available date"]),
    rule("jobIntent.recruitmentSource", ["招聘信息来源", "信息来源", "获知渠道", "source"]),
    rule("jobIntent.acceptTransfer", ["是否接受调剂", "接受调剂"]),
    rule("emergencyContact.name", ["紧急联系人姓名", "紧急联系人"], { sensitive: true }),
    rule("emergencyContact.relationship", ["紧急联系人关系", "与紧急联系人关系"], { sensitive: true }),
    rule("emergencyContact.phone", ["紧急联系电话", "紧急联系人电话", "联系电话"], { sensitive: true }),
    rule("skills.technical", ["技术技能", "专业技能", "技能专长", "technical skills"]),
    rule("skills.language", ["语言能力", "外语能力", "language skills"]),
    rule("skills.software", ["软件技能", "软件能力", "software skills", "tools"]),
    rule("skills.certificates", ["证书认证", "资格证书", "获得证书", "certificates", "certifications"]),
    rule(["personal.graduationSchool", "education.0.school"], ["学校名称", "学校", "院校名称"]),
    rule("education.0.studentId", ["学号", "在校学号", "student id"]),
    rule("education.0.college", ["院系", "院系名称", "学院", "college department"]),
    rule("education.0.major", ["最高学历专业", "专业", "专业名称", "major"], { exclude: ["学科评估", "评估等级"] }),
    rule("education.0.city", ["学校城市", "学校所在城市"]),
    rule("education.0.advisor", ["导师姓名", "导师"]),
    rule("education.0.startDate", ["入学时间", "入学日期", "education start date"]),
    rule("education.0.endDate", ["教育毕业时间", "预计毕业时间", "education end date"]),
    rule("education.0.schoolType", ["最高学历毕业院校类型", "毕业院校类型", "学校类型"]),
    rule(["education.1.schoolType", "education.0.schoolType"], ["第一学历毕业院校类型", "第一学历院校类型"]),
    rule("education.0.courses", ["专业课程", "核心课程", "主修课程", "relevant coursework"]),
    rule("projects.0.name", ["项目名称", "科研项目名称", "project name"]),
    rule("projects.0.role", ["项目职务", "项目角色", "project role"]),
    rule("projects.0.description", ["项目描述", "项目简介", "project description"]),
    rule("projects.0.responsibilities", ["项目职责", "职责与贡献", "project responsibilities"]),
    rule("projects.0.result", ["项目成果", "项目结果", "project result"]),
    rule("languages.0.certificate", ["外语证书名称", "语言证书", "language certificate"]),
    rule("languages.0.score", ["外语成绩", "语言成绩", "language score"]),
    rule("family.0.name", ["家庭成员姓名"], { sensitive: true }),
    rule("family.0.phone", ["家庭成员联系电话"], { sensitive: true })
  ];

  function rule(paths, aliases, options) {
    return Object.assign({ paths: Array.isArray(paths) ? paths : [paths], aliases }, options || {});
  }

  function emptyProfile() {
    return {
      schemaVersion: PROFILE_VERSION,
      updatedAt: "",
      personal: {}, jobIntent: {}, emergencyContact: {}, skills: {},
      education: [], projects: [], internships: [], languages: [], awards: [], family: []
    };
  }

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/[\s\u00a0_\-—–:：;；,，.。/\\()（）\[\]【】*]/g, "");
  }

  function getByPath(object, path) {
    return String(path).split(".").reduce((value, key) => value == null ? undefined : value[key], object);
  }

  function setByPath(object, path, value) {
    const keys = String(path).split(".");
    let cursor = object;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) cursor[key] = value;
      else {
        const nextIsArray = /^\d+$/.test(keys[index + 1]);
        if (cursor[key] == null) cursor[key] = nextIsArray ? [] : {};
        cursor = cursor[key];
      }
    });
    return object;
  }

  function hasValue(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function firstValue(profile, paths) {
    for (const path of paths) {
      const value = getByPath(profile, path);
      if (hasValue(value)) return { path, value: String(value) };
    }
    return null;
  }

  function scoreAlias(text, alias, base) {
    const source = normalizeText(text);
    const target = normalizeText(alias);
    if (!source || !target) return 0;
    if (source === target) return base + 45 + Math.min(target.length, 20);
    if (source.startsWith(target) || source.endsWith(target)) return base + 28 + Math.min(target.length, 20);
    if (source.includes(target)) return base + 15 + Math.min(target.length, 20);
    if (target.length >= 5 && target.includes(source)) return base + 5;
    return 0;
  }

  function findBestRule(primaryText, contextText, profile, includeSensitive) {
    const contextNormalized = normalizeText(contextText);
    let best = null;
    for (const item of FIELD_RULES) {
      const candidate = firstValue(profile, item.paths);
      if (!candidate) continue;
      if (item.sensitive && !includeSensitive) continue;
      if ((item.exclude || []).some(term => contextNormalized.includes(normalizeText(term)))) continue;
      let score = 0;
      for (const alias of item.aliases) {
        score = Math.max(score, scoreAlias(primaryText, alias, 55), scoreAlias(contextText, alias, 15));
      }
      if (score >= 74 && (!best || score > best.score)) {
        best = { rule: item, score, path: candidate.path, value: candidate.value };
      }
    }
    return best;
  }

  function countValues(value) {
    if (Array.isArray(value)) return value.reduce((sum, item) => sum + countValues(item), 0);
    if (value && typeof value === "object") {
      return Object.entries(value).reduce((sum, entry) => {
        if (["schemaVersion", "updatedAt"].includes(entry[0])) return sum;
        return sum + countValues(entry[1]);
      }, 0);
    }
    return hasValue(value) ? 1 : 0;
  }

  function deepMergeWithEmpty(input) {
    const profile = emptyProfile();
    const source = input && typeof input === "object" ? input : {};
    for (const key of Object.keys(profile)) {
      if (source[key] !== undefined) profile[key] = source[key];
    }
    profile.schemaVersion = PROFILE_VERSION;
    return profile;
  }

  return {
    PROFILE_VERSION, FORM_SECTIONS, ARRAY_SECTIONS, FIELD_RULES,
    emptyProfile, normalizeText, getByPath, setByPath, hasValue,
    findBestRule, countValues, deepMergeWithEmpty
  };
});

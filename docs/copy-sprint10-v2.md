# Sprint 10 文案补充 V2：H5 三关增长流程补全

项目路径：`/Users/y/Documents/H5版商家NFC寻宝增长平台/nfc-merchant-growth`  
目标文件：`docs/copy-sprint10-v2.md`  
用途：在 `docs/copy-sprint10.md` 基础上追加，供 Codex / Claude Code 直接复制到代码中。

---

## 0. 合规与表达总原则

### 0.1 全链路表达原则

```text
1. 不诱导固定好评。
2. 不要求五星评价。
3. 不承诺流量、播放、点赞、上热门。
4. 不把 AI 文案包装成用户真实原话。
5. 不把商家素材包装成用户现场实拍。
6. 第二关强调“图文点评参考”，第三关强调“真实体验创作”。
7. 第三关必须审核通过后才可获得霸王餐抽奖资格。
8. 核销码必须由店员核销，用户不能自行确认已使用。
```

### 0.2 统一合规提示

```ts
export const complianceCopy = {
  truthfulExperience: "请基于真实到店体验发布，文案和图片仅供参考，发布前请自行修改确认。",
  noFixedPositiveReview: "本活动不要求固定好评、不要求五星评价，也不要求使用固定模板。",
  adDisclosure: "如你的内容属于体验分享、消费测评并附加购买方式，请按平台规则添加必要标识。",
  privacyShort: "本活动仅记录你的任务进度、提交内容和奖励核销状态，用于活动审核与发奖。",
  privacyUpload: "你上传的图片、截图或链接仅用于任务审核、奖励发放和安全核验。",
  redeemPrivacy: "核销时将记录奖励状态、核销时间和核销门店，用于防止重复使用和处理售后争议。",
  lotteryQualification: "第三关内容需通过质量审核后，才可获得霸王餐抽奖资格。"
}
```

---

# D1. 首页完整文案补全

## 1.1 可机读文案

```ts
export const homeCopyV2 = {
  title: "60 秒启动 2 关，解锁本店隐藏福利",
  subtitle: "本活动由 {{storeName}} 官方发起。完成到店确认和图文点评任务，即可领取门店奖励；发布优质图文/视频并通过审核后，还可参与霸王餐抽奖。",
  shortSubtitle: "完成 2 步领福利，发布优质内容还可抽霸王餐。",
  storeBadge: "{{storeName}} 官方活动",
  techBadge: "平台提供技术支持",
  privacyLine: "本活动仅记录你的任务进度、提交内容和奖励核销状态，用于活动审核与发奖。",
  primaryButton: "开始闯关",
  ruleButton: "查看活动规则",
  rewardButton: "查看我的奖励",
  askStaffButton: "有疑问，问店员",
  cards: {
    step1: {
      title: "第 1 关：确认到店",
      desc: "点击确认到店，领取进门礼。",
      reward: "奖励：{{reward1Name}}",
      tag: "约 10 秒完成",
      statusNotStarted: "未开始",
      statusAvailable: "可领取",
      statusDone: "已完成"
    },
    step2: {
      title: "第 2 关：生成图文点评",
      desc: "选平台、选标签、配图片，AI 帮你生成真实体验参考文案。",
      reward: "奖励：{{reward2Name}}",
      tag: "商家核心任务",
      statusLocked: "完成第 1 关后解锁",
      statusAvailable: "可开始",
      statusPending: "待确认",
      statusDone: "已通过"
    },
    step3: {
      title: "第 3 关：发布真实体验",
      desc: "按拍摄建议发布图文或视频，通过审核后参与霸王餐抽奖。",
      reward: "奖励：霸王餐抽奖资格",
      tag: "进阶任务",
      statusLocked: "完成第 2 关后解锁",
      statusAvailable: "可参与",
      statusPending: "待审核",
      statusInLottery: "已入池"
    }
  },
  empty: {
    noCampaign: "当前门店暂无可参与活动",
    noCampaignDesc: "你可以咨询店员，或稍后再试。",
    refresh: "刷新页面"
  },
  toast: {
    campaignEnded: "当前活动已结束",
    campaignNotStarted: "当前活动暂未开始",
    loadFailed: "活动信息加载失败，请刷新重试",
    nfcNotBound: "该 NFC 入口暂未绑定活动"
  }
}
```

## 1.2 首页规则补充

```text
活动奖励以页面展示为准；具体使用条件、有效期和核销方式，请在奖励详情页查看。
```

---

# D2. 第二关结果页文案

## 2.1 可机读文案

```ts
export const step2ResultCopyV2 = {
  generating: {
    title: "正在生成图文点评",
    desc: "AI 正在根据你选择的平台、体验标签和图片生成参考内容。",
    loadingLines: [
      "正在整理你的真实体验标签…",
      "正在匹配平台语气…",
      "正在组合图片和文案…",
      "正在过滤不适合评价场景的表达…"
    ]
  },
  result: {
    title: "图文点评已生成",
    desc: "以下内容仅供参考。发布前请按你的真实体验修改，避免夸大或不准确表达。",
    titleLabel: "推荐标题",
    contentLabel: "参考文案",
    tagsLabel: "推荐标签",
    imagesLabel: "推荐配图",
    editTip: "你可以直接修改文案，让它更像自己的真实表达。"
  },
  buttons: {
    copy: "复制文案",
    saveImages: "保存图片",
    publish: "去 {{platformName}} 发布",
    regenerate: "换一种写法",
    backEdit: "返回修改标签/图片",
    confirmDone: "我已发布，去确认"
  },
  compliance: {
    main: "请基于真实到店体验发布，不要求固定好评。文案和图片仅供参考，发布前请自行修改确认。",
    adMark: "如内容属于体验分享、消费测评并附加购买方式，请按平台规则添加必要标识。",
    imageTip: "请选择与你本次体验相关的图片，避免使用无关图片。"
  },
  toast: {
    generated: "图文点评已生成",
    generateFailed: "生成失败，请稍后重试",
    copied: "文案已复制，请按真实体验修改后发布",
    copyFailed: "复制失败，请手动长按复制",
    imageSaved: "图片已保存",
    imageSaveFailed: "保存失败，请长按图片保存",
    jumpFailed: "跳转失败，请手动打开对应 App",
    filtered: "系统已自动过滤不适合评价场景的表达"
  },
  empty: {
    noResult: "暂未生成点评文案",
    noResultDesc: "请选择平台、体验标签和图片后生成。",
    goGenerate: "去生成"
  }
}
```

---

# D3. 第二关确认方式文案

```ts
export const step2ConfirmCopyV2 = {
  page: {
    title: "发布完成后，选择一种方式确认",
    desc: "推荐给店员现场确认，审核更快。无法现场确认时，可提交链接或截图。"
  },
  staffConfirm: {
    title: "给店员确认",
    desc: "发布后给店员看一下，店员确认后奖励即可到账。",
    button: "请店员确认",
    waiting: "等待店员确认…",
    success: "店员已确认，奖励已到账",
    failed: "店员暂未确认，请稍后再试"
  },
  linkSubmit: {
    title: "粘贴评价链接",
    desc: "复制你发布后的评价链接，粘贴到这里提交审核。",
    placeholder: "请粘贴评价链接",
    button: "提交链接",
    success: "链接已提交，门店将尽快审核",
    invalid: "链接格式不正确，请检查后重新提交",
    empty: "请先粘贴评价链接"
  },
  screenshotUpload: {
    title: "上传发布截图",
    desc: "如果不会复制链接，可以上传发布成功后的截图。截图建议包含平台名称、发布内容和发布时间。",
    uploadTip: "支持 JPG、PNG、WebP 格式，建议截图清晰可读。",
    uploadButton: "上传截图",
    submitButton: "提交审核",
    success: "截图已提交，门店将尽快审核",
    failed: "截图上传失败，请重新上传",
    empty: "请先上传发布截图"
  },
  buttons: {
    backEdit: "返回继续修改",
    viewRewards: "查看我的奖励",
    goStep3: "进入第三关"
  },
  toast: {
    submitted: "提交成功，等待门店审核",
    approved: "审核通过，奖励已到账",
    rejected: "审核未通过，请查看原因后重新提交",
    failed: "提交失败，请稍后重试"
  }
}
```

---

# D4. 第三关拍摄指导完整文案

```ts
export const step3GuideCopyV2 = {
  page: {
    title: "不知道怎么拍？按这个拍就行",
    desc: "不用拍得很专业。画面清楚、内容真实、能看出门店或菜品即可。",
    rewardTip: "内容通过审核后，可获得霸王餐抽奖资格。清晰、完整、真实的内容可能获得更多抽奖机会。"
  },
  videoTemplate: {
    title: "15 秒视频模板",
    shots: [
      "镜头 1：门头或店内环境，3 秒",
      "镜头 2：招牌菜上桌或夹菜特写，6 秒",
      "镜头 3：桌面全景、朋友用餐或空盘，6 秒"
    ],
    tip: "拍不出复杂转场也没关系，画面清楚、内容真实更重要。"
  },
  imageTextTemplate: {
    title: "图文笔记模板",
    images: [
      "图 1：门头或环境",
      "图 2：招牌菜",
      "图 3：桌面全景",
      "图 4：菜单或活动福利",
      "图 5：你觉得不错的细节"
    ],
    tip: "建议至少 3 张有效图片，其中 1 张与本次到店体验强相关。"
  },
  platformTips: {
    xiaohongshu: {
      title: "小红书怎么拍",
      desc: "建议 4-6 张图，标题生活化，正文写清楚场景、菜品和真实感受。",
      example: "适合写：朋友聚餐、周末打卡、菜品体验、环境氛围。"
    },
    douyin: {
      title: "抖音怎么拍",
      desc: "建议 8-30 秒视频，前 3 秒直接拍菜品、环境或上菜画面。",
      example: "适合拍：锅底沸腾、烤肉翻面、菜品上桌、夹起一口。"
    },
    wechatChannels: {
      title: "视频号怎么拍",
      desc: "适合自然真实的短视频，可以拍门店环境、菜品上桌和用餐氛围。",
      example: "语气不用太夸张，像正常分享一次到店体验。"
    },
    moments: {
      title: "朋友圈怎么发",
      desc: "适合轻松自然的分享，1-3 张图加一句真实感受即可。",
      example: "不要像广告，写得像你平时和朋友分享就可以。"
    },
    bilibili: {
      title: "B 站怎么拍",
      desc: "适合稍完整的体验视频，标题和简介可以写得更清楚。",
      example: "可以按“到店环境—菜品体验—整体感受”的顺序拍。"
    }
  },
  safetyTips: [
    "尽量不要拍到其他顾客正脸。",
    "避免画面严重模糊。",
    "不要上传与门店无关的内容。",
    "不要使用明显夸张或不真实的表达。"
  ],
  buttons: {
    understood: "我知道怎么拍了",
    useAssets: "使用门店素材",
    generateCopy: "生成发布文案"
  },
  toast: {
    templateSelected: "已选择拍摄模板",
    selectPlatformFirst: "请先选择发布平台"
  }
}
```

---

# D5. 第三关 AI 生成结果页文案

```ts
export const step3CreateCopyV2 = {
  page: {
    title: "生成你的发布内容",
    desc: "选择内容形式后，AI 会根据门店素材、拍摄建议和你的真实体验生成标题、正文、标签或视频脚本。"
  },
  contentType: {
    imageText: {
      title: "图文",
      desc: "适合小红书、朋友圈和图文分享，建议 3-6 张图。"
    },
    video: {
      title: "视频",
      desc: "适合抖音、视频号、快手和 B 站，建议 8-30 秒。"
    },
    moments: {
      title: "朋友圈",
      desc: "适合轻量分享，1-3 张图加一句真实感受即可。"
    }
  },
  generating: {
    title: "正在生成发布内容",
    desc: "AI 正在匹配平台风格、素材和拍摄脚本。",
    loadingLines: [
      "正在匹配平台风格…",
      "正在整理拍摄脚本…",
      "正在生成标题和正文…",
      "正在生成推荐标签…"
    ]
  },
  result: {
    title: "发布内容已生成",
    desc: "以下内容仅供参考。发布前请根据你的真实体验修改，避免夸大或不准确表达。",
    titleLabel: "推荐标题",
    contentLabel: "参考正文",
    tagsLabel: "推荐标签",
    scriptLabel: "拍摄脚本",
    shotListLabel: "拍摄清单",
    materialLabel: "建议使用素材"
  },
  publishGuide: {
    title: "发布前检查一下",
    items: [
      "画面是否清楚？",
      "内容是否和本店相关？",
      "文案是否像真实体验？",
      "是否避免夸大和固定好评表达？"
    ]
  },
  buttons: {
    generate: "生成发布内容",
    regenerate: "换一种风格",
    copy: "复制标题和文案",
    saveMaterial: "保存素材",
    publish: "去 {{platformName}} 发布",
    submit: "发布完成，去提交"
  },
  toast: {
    generated: "内容已生成",
    copied: "文案已复制",
    materialSaved: "素材已保存",
    failed: "生成失败，请稍后重试"
  },
  empty: {
    noResult: "暂未生成内容",
    noResultDesc: "请选择平台、内容形式和素材后生成。"
  }
}
```

---

# D6. 霸王餐抽奖页文案

```ts
export const lotteryCopyV2 = {
  page: {
    title: "霸王餐抽奖",
    quota: "今日霸王餐名额：{{dailyQuota}} 个",
    entryCount: "当前入池人数：{{entryCount}} 人",
    myWeight: "我的抽奖机会：{{lotteryWeight}} 次",
    drawTime: "开奖时间：{{drawTime}}"
  },
  status: {
    notEligible: {
      title: "暂未获得抽奖资格",
      desc: "完成第 3 关并通过审核后，即可进入霸王餐抽奖池。",
      button: "去完成第三关"
    },
    pendingReview: {
      title: "内容正在审核中",
      desc: "审核通过后，你将自动进入抽奖池。"
    },
    inPool: {
      title: "你已进入抽奖池",
      desc: "请等待开奖。内容质量越高，可能获得更多抽奖机会。"
    },
    waitingDraw: {
      title: "待开奖",
      desc: "开奖时间：{{drawTime}}。请留意本页面结果。"
    },
    won: {
      title: "恭喜中奖！",
      desc: "霸王餐奖励已发放，请到“我的奖励”查看核销码。",
      guide: "请在有效期内到店出示核销码，由店员核销后使用。",
      button: "查看奖励"
    },
    notWon: {
      title: "本次未中奖",
      desc: "感谢你的参与。你仍可查看已获得的其他门店奖励。",
      encourage: "你提交的内容仍会保留在任务记录中，后续活动还可以继续参与。",
      button: "查看我的奖励"
    },
    expired: {
      title: "本期抽奖已结束",
      desc: "你可以参与门店后续活动。"
    }
  },
  compliance: {
    qualification: "只有第三关内容审核通过后，才会进入霸王餐抽奖池。",
    noGuarantee: "参与抽奖不代表必中奖，中奖结果以页面展示为准。"
  },
  toast: {
    updated: "抽奖状态已更新",
    rewardIssued: "奖励已发放",
    noRecord: "当前暂无抽奖记录"
  },
  empty: {
    title: "暂无可参与抽奖",
    desc: "完成第 3 关并通过审核后，即可参与。"
  }
}
```

---

# D7. 我的奖励页文案

```ts
export const rewardsCopyV2 = {
  page: {
    title: "我的奖励",
    desc: "查看你已获得、待审核、已核销和已过期的奖励。"
  },
  tabs: {
    available: {
      label: "可使用",
      desc: "已到账且可核销的奖励。"
    },
    pending: {
      label: "待审核",
      desc: "已提交任务，等待门店审核。"
    },
    redeemed: {
      label: "已核销",
      desc: "已由店员核销使用的奖励。"
    },
    expired: {
      label: "已过期",
      desc: "超过有效期，无法继续核销的奖励。"
    },
    lottery: {
      label: "抽奖中",
      desc: "已进入抽奖池或等待开奖的记录。"
    },
    notWon: {
      label: "未中奖",
      desc: "已开奖但未中奖的记录。"
    }
  },
  card: {
    rewardName: "奖励：{{rewardName}}",
    campaignName: "来源活动：{{campaignName}}",
    storeName: "适用门店：{{storeName}}",
    expiresAt: "有效期至：{{expiresAt}}",
    status: "状态：{{status}}",
    usageRule: "使用条件：{{usageRule}}"
  },
  status: {
    unclaimed: "待领取",
    available: "可使用",
    pendingReview: "待审核",
    rejected: "审核未通过",
    redeemed: "已核销",
    expired: "已过期",
    cancelled: "已取消",
    inLottery: "抽奖中",
    won: "已中奖",
    notWon: "未中奖"
  },
  buttons: {
    viewRedeemCode: "查看核销码",
    viewRejectReason: "查看审核原因",
    resubmit: "重新提交",
    viewLottery: "查看抽奖",
    askStaff: "联系店员"
  },
  empty: {
    available: {
      title: "暂无可使用奖励",
      desc: "完成任务后，奖励会显示在这里。"
    },
    pending: {
      title: "暂无待审核任务",
      desc: "提交任务后，可在这里查看审核进度。"
    },
    redeemed: {
      title: "暂无已核销奖励",
      desc: "核销完成后，记录会显示在这里。"
    },
    expired: {
      title: "暂无已过期奖励",
      desc: "过期奖励会显示在这里。"
    },
    lottery: {
      title: "暂无抽奖记录",
      desc: "第三关审核通过后，可在这里查看抽奖状态。"
    }
  },
  toast: {
    loaded: "奖励列表已更新",
    loadFailed: "奖励状态加载失败",
    expired: "该奖励已过期",
    redeemed: "该奖励已核销"
  }
}
```

---

# D8. 核销码页文案

```ts
export const redeemCodeCopyV2 = {
  page: {
    title: "出示核销码",
    desc: "请向店员出示下方核销码，由店员扫码或输入数字码完成核销。"
  },
  fields: {
    rewardName: "奖励名称：{{rewardName}}",
    storeName: "适用门店：{{storeName}}",
    expiresAt: "有效期至：{{expiresAt}}",
    usageRule: "使用条件：{{usageRule}}",
    redeemCode: "核销码：{{redeemCode}}"
  },
  usage: {
    condition: "以门店页面展示规则为准，不可兑换现金，不可重复使用。",
    validity: "请在有效期内使用，过期后奖励将无法核销。",
    staffOnly: "请勿自行确认已使用。奖励需由店员核销后生效。"
  },
  privacy: "核销时将记录奖励状态、核销时间和核销门店，用于防止重复使用和处理售后争议。",
  status: {
    available: "当前奖励可核销",
    redeemed: "该奖励已核销",
    expired: "该奖励已过期",
    wrongStore: "该奖励不适用于当前门店",
    cancelled: "该奖励已取消",
    loading: "正在加载核销码…"
  },
  buttons: {
    refresh: "刷新核销码",
    backRewards: "返回我的奖励",
    askStaff: "联系店员"
  },
  toast: {
    refreshed: "核销码已刷新",
    success: "核销成功",
    redeemed: "该奖励已核销",
    expired: "该奖励已过期",
    failed: "核销码加载失败，请刷新重试"
  }
}
```

---

# D9. 员工核销页文案

```ts
export const staffRedeemCopyV2 = {
  page: {
    title: "员工核销",
    desc: "扫描顾客出示的核销码，或输入 6 位数字码完成核销。"
  },
  scan: {
    title: "扫码核销",
    desc: "请对准顾客奖励页中的二维码进行扫描。",
    button: "扫码核销"
  },
  manual: {
    title: "输入核销码",
    placeholder: "请输入 6 位核销码",
    button: "查询奖励"
  },
  confirm: {
    title: "确认核销",
    desc: "请核对奖励名称、适用门店和有效期，确认无误后再核销。",
    rewardName: "奖励名称：{{rewardName}}",
    storeName: "适用门店：{{storeName}}",
    expiresAt: "有效期：{{expiresAt}}",
    user: "用户：{{userDisplayName}}",
    status: "当前状态：{{rewardStatus}}",
    confirmButton: "确认核销",
    cancelButton: "取消"
  },
  success: {
    title: "核销成功",
    desc: "该奖励已完成核销，系统已同步记录。",
    backButton: "继续核销"
  },
  failure: {
    title: "核销失败",
    invalidCode: "核销码无效",
    alreadyRedeemed: "该奖励已核销",
    expired: "该奖励已过期",
    wrongStore: "该奖励不属于当前门店",
    noPermission: "当前员工无核销权限",
    abnormal: "奖励状态异常，请联系管理员",
    network: "网络异常，请稍后重试"
  },
  toast: {
    scanFirst: "请扫描核销码",
    inputFirst: "请输入核销码",
    querying: "正在查询奖励…",
    success: "核销成功",
    failed: "核销失败，请查看原因"
  },
  empty: {
    title: "暂无核销记录",
    desc: "完成核销后，记录会显示在这里。"
  }
}
```

---

# D10. 合规文案全链路

## 10.1 首页隐私简短说明

```ts
export const homeComplianceV2 = {
  privacyLine: "本活动仅记录你的任务进度、提交内容和奖励核销状态，用于活动审核与发奖。",
  privacyModalTitle: "隐私说明",
  privacyModalContent: "为记录任务进度、审核提交内容和发放奖励，我们可能需要收集你的活动参与记录、上传图片、发布链接、核销状态及必要的设备信息。相关信息仅用于本次活动审核、奖励发放、核销和安全风控。",
  privacyConfirm: "知道了"
}
```

## 10.2 第二关广告标识提醒

```ts
export const step2ComplianceV2 = {
  truthful: "文案和图片仅供参考，请按你的真实到店体验修改后发布。不要求固定好评。",
  adDisclosure: "如你的内容属于体验分享、消费测评并附加购买方式，请按平台规则添加必要标识。",
  noGuarantee: "本活动不承诺评价展示效果、流量、排名或曝光。"
}
```

## 10.3 第三关真实体验承诺

```ts
export const step3ComplianceV2 = {
  truthful: "请发布与你本次到店体验相关的真实内容。",
  noFixedReview: "本活动不要求固定好评、不要求照搬模板，也不要求夸大表达。",
  reviewBeforeLottery: "内容需通过清晰度、相关性、完整度、真实感和表达质量审核后，才可获得抽奖资格。",
  noTrafficPromise: "参与活动不代表内容一定获得流量、点赞或推荐。"
}
```

## 10.4 核销页个人信息处理说明

```ts
export const redeemComplianceV2 = {
  privacy: "核销时将记录奖励状态、核销时间、核销门店和核销操作，用于防止重复使用、处理售后争议和保障活动公平。",
  userTip: "请向店员出示核销码，由店员完成核销。",
  noCash: "奖励不可兑换现金，不可重复使用，具体使用条件以页面展示为准。"
}
```

## 10.5 禁用词过滤策略

```ts
export const forbiddenWordPolicyV2 = {
  userVisibleTip: "系统已自动过滤夸大、绝对化或不适合评价场景的表达。",
  internalRule: "禁用词仅用于生成后过滤和重写，不在用户端展示完整列表，避免用户反向模仿。",
  fallback: "当前文案存在不适合发布的表达，已为你重新生成更稳妥的版本。"
}
```

---

# E. 追加到现有文档的位置建议

建议将本文作为 `docs/copy-sprint10.md` 的 V2 增补章节：

```text
## Sprint 10 V2：H5 页面补充文案
```

建议代码结构：

```text
copywriting/
  h5/
    home.v2.ts
    step2-result.v2.ts
    step2-confirm.v2.ts
    step3-guide.v2.ts
    step3-create.v2.ts
    lottery.v2.ts
    rewards.v2.ts
    redeem-code.v2.ts
    compliance.v2.ts
  merchant/
    staff-redeem.v2.ts
```

---

# F. 验收清单

```text
[ ] 首页完整文案补齐：主标题、副标题、三关卡片、按钮、隐私说明
[ ] 第二关结果页补齐：生成中、结果字段、复制/保存/发布/重新生成、合规提示
[ ] 第二关确认方式补齐：店员确认、链接提交、截图上传
[ ] 第三关拍摄指导补齐：小红书/抖音/视频号/朋友圈/B站差异建议
[ ] 第三关 AI 结果页补齐：标题、正文、标签、脚本、发布引导
[ ] 霸王餐抽奖页补齐：待开奖、已中奖、未中奖、中奖引导、未中奖鼓励
[ ] 我的奖励页补齐：Tab 说明、空状态、奖励卡片
[ ] 核销码页补齐：展示说明、使用条件、有效期、状态文案
[ ] 员工核销页补齐：扫码、输入、确认、成功/失败
[ ] 全链路合规文案补齐：隐私说明、广告标识提醒、真实体验承诺、核销信息处理说明
[ ] 文案以可机读对象形式输出，方便 Codex 复制进代码
```

---

# G. Commit Message 建议

```text
docs(copywriting): add sprint10 v2 h5 supplemental copy

- add complete home copy for three-step H5 campaign flow
- add step2 AI review result and confirmation copy
- add step3 shooting guide and AI creation result copy
- add lottery, rewards, redeem code and staff redemption copy
- add compliance copy for truthful experience, ad disclosure, forbidden word filtering and personal information notice
```

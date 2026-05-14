# NFC门店寻宝增长系统

基于 Next.js 14+ App Router 的全栈项目骨架。

## 技术栈

- **前端框架**: Next.js 14+ (App Router)
- **UI框架**: React 18+, TypeScript, Tailwind CSS, shadcn/ui
- **状态管理**: Zustand, TanStack Query
- **数据库**: PostgreSQL + Prisma ORM

## 项目结构

```
merchant-growth-h5/
├── app/                      # Next.js App Router 页面
│   ├── h5/                   # H5活动页面
│   │   └── campaign/
│   │       └── [campaignId]/ # 活动详情页
│   │           ├── page.tsx
│   │           ├── rules/
│   │           ├── tasks/
│   │           ├── ai-copy/
│   │           ├── submit/
│   │           ├── rewards/
│   │           └── alliance/
│   ├── merchant/             # 商家后台
│   │   ├── dashboard/
│   │   ├── stores/
│   │   ├── campaigns/
│   │   ├── tasks/
│   │   ├── rewards/
│   │   ├── reviews/
│   │   └── analytics/
│   ├── platform/             # 平台后台
│   │   ├── dashboard/
│   │   ├── merchants/
│   │   ├── stores/
│   │   ├── campaigns/
│   │   ├── nfc-cards/
│   │   └── analytics/
│   └── api/                  # API 路由
├── components/
│   ├── ui/                   # shadcn/ui 组件
│   ├── h5/                   # H5专用组件
│   ├── merchant/             # 商家后台组件
│   └── platform/             # 平台后台组件
├── lib/                      # 工具函数
│   ├── utils.ts
│   └── api.ts
└── prisma/
    └── schema.prisma         # 数据库Schema
```

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## H5寻宝流程

1. **活动首页** - 展示活动信息、三关任务预览
2. **规则说明** - 详细规则和奖励说明
3. **三关任务** - 当前任务、已完成任务、奖励展示
4. **AI文案生成** - 上传图片、生成文案、复制发布
5. **上传凭证** - 提交截图/链接
6. **奖励领取** - 核销码展示
7. **异业券领取** - 周边商家优惠券

## 商家后台功能

- 门店管理
- 活动管理
- 任务配置
- 奖励配置
- NFC卡管理
- 用户审核
- 数据看板

## 平台后台功能

- 商家管理
- 门店管理
- 活动管理
- NFC卡管理
- 数据总览

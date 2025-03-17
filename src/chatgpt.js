import createRequest from "./request.js";
import { logger } from "./utils.js";
import fs from 'fs';
import path from 'path';
const isDevelopment = process.env.NODE_ENV === "development";
const configPath = path.resolve(process.cwd(), isDevelopment ? "assets/config.json" : "dist/assets/config.json");
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

export default class ChatGPT {
  constructor(configMsg) {
    this.language = "Chinese";
  }

  generatePrompt = (patch) => {
    const answerLanguage = `Answer me in ${this.language},`;
    return `下面是gitlab代码代码，请帮我做一个简短的代码审查, 不需要前面的描述，需要严格按照如下回答模版，输出以下两点 1潜在问题限制在100字以内，2 是否存在安全漏洞，3改进建议，用代码给出 ${answerLanguage} 
    ${patch}
    `;
  };

  // openai
  sendChatGPT = async (prompt) => {
    const API = config.api_config_chatgpt;
    const request = createRequest(API.host, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API.api_key}`,
      },
    });
    return request
      .post(`/api/generate`, {
        model: API.model,
        prompt: prompt,
        temperature: 1,
        top_p: 1,
        presence_penalty: 1,
        stream: false,
        max_tokens: 1000,
      });
  }

  // deepseek
  sendDeepSeek = async (prompt) => {
    const API = config.api_config_deepseek;
    const request = createRequest(API.host, {});
    return request
      .post(`/api/generate`, {
        model: API.model,
        prompt: prompt,
        stream: false,
      });
  };
  // 智谱清言
  sendZP = async (prompt) => {
    const API = config.api_config_glm;
    const request = createRequest(API.host, {});
    return request
      .post(`/api/generate`, {
        model: API.model,
        prompt: prompt,
        stream: false,
      });
  };

// curl https://api.lkeap.cloud.tencent.com/v1/chat/completions \
// -H "Content-Type: application/json" \
// -H "Authorization: Bearer sk-BM3Ezl79rnE88jQw8tSbJGTElj8Dcom4GF6ihGMy8sHw6mRY" \
// -d '{
//   "model": "deepseek-r1",
//   "messages": [
//         {
//             "role": "user",
//             "content": "为什么草是绿的？"
//         }
//     ],
//   "stream": false
// }'


  codeReview = async (patch) => {
    if (!patch) {
      logger.error("patch is empty");
      return "";
    }
    const prompt = this.generatePrompt(patch);
    const res = await this.sendDeepSeek(prompt);

    if (res.status === 200) {
      return res.data.response;
    } else {
      return "暂无建议";
    }

  };
}

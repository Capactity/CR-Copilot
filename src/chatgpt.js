import createRequest from "./request.js";
import { logger } from "./utils.js";
import OpenAI from "openai";
export default class ChatGPT {
  constructor(config) {
    const baseUrl = "https://api.openai.com";
    this.request = createRequest(baseUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer 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`,
      },
      data: {
        model: "gpt3.5-turbo",
        temperature: 1,
        top_p: 1,
        presence_penalty: 1,
        stream: false,
        max_tokens: 1000,
      },
    });
    this.language = "Chinese";

    this.openai = new OpenAI({
      apiKey: "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",
    });
  }

  generatePrompt = (patch) => {
    const answerLanguage = `Answer me in ${this.language},`;
    return `下面是gitlab代码代码，请帮我做一个简短的代码审查, 不需要前面的描述，需要严格按照如下回答模版，输出以下两点 1潜在问题限制在100字以内，2 是否存在安全漏洞，3改进建议，用代码给出 ${answerLanguage} 
    ${patch}
    `;
  };

  sendMessage = async (msg) => {
    const currentDate = new Date().toISOString().split("T")[0];
    return this.request.post("/v1/chat/completions", {
      messages: [
        {
          role: "system",
          content:
            "You are ChatGPT, a large language model trained by OpenAI. Answer as concisely as possible.\n" +
            "Knowledge cutoff: 2021-09-01\n" +
            `Current date: ${currentDate}`,
        },
        { role: "user", content: msg, name: undefined },
      ],
    });
  };


  sendDeepSeek = async (prompt) => {
    const host = "http://192.168.1.210:11434";
    const request = createRequest(host, {});
    return request
      .post(`/api/generate`, {
        model: "deepseek-r1:32b",
        prompt: prompt,
        stream: false,
      });
  };

  sendZP = async (prompt) => {
    const host = "http://10.10.10.18:8080";
    const request = createRequest(host, {});
    return request
      .post(`/api/generate`, {
        model: "glm-4",
        prompt: prompt,
        stream: false,
      });
  };

//   curl https://api.lkeap.cloud.tencent.com/v1/chat/completions \
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
  // 腾讯云deepseek
  sendDeepSeekCloud = async (prompt) => {
    const host = "https://api.lkeap.cloud.tencent.com";
    console.log("host", host);
    const request = createRequest(host, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer sk-BM3Ezl79rnE88jQw8tSbJGTElj8Dcom4GF6ihGMy8sHw6mRY`,
      },
    });
    return request
      .post(`/v1/chat/completions`, {
        model: "deepseek-r1",
        messages: [{role: "user", content: prompt}],
        stream: false,
      });
  };



  codeReview = async (patch) => {
    if (!patch) {
      logger.error("patch is empty");
      return "";
    }
    const prompt = this.generatePrompt(patch);
    // console.log("prompt", prompt);
    // const res = await this.sendDeepSeekCloud(prompt);
    const res = await this.sendDeepSeek(prompt);

    if (res.status === 200) {
      console.log("res", res);
      return res.data.response;
    } else {
      return "暂无建议";
    }

  };
}

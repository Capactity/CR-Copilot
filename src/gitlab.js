import createRequest from "./request.js";
import { config } from "./utils.js";
import camelCase from "camelcase";
import logger from './logger.js';


const formatByCamelCase = (obj) => {
  const target = Object.keys(obj).reduce((result, key) => {
    const newkey = camelCase(key);
    return { ...result, [newkey]: obj[key] };
  }, {});

  return target;
};

/**
对diff 的处理：
Gitlab 的每一行 diff 其实是由三种状态组成 ‘+’ ‘-’ 和 ‘’：
如果最后一行是 ‘+’，则给该接口传入 new_line 和 new_path；
如果最后一行是 ‘-’ ，则给该接口传入 old_line 和 old_path；
如果最后一行是 ‘’， 则 new_line、new_path 和 old_line、old_path 都要传入
*/

const parseLastDiff = (gitDiff) => {
  const diffList = gitDiff.split("\n").reverse();
  const lastLineFirstChar = diffList?.[1]?.[0];
  const lastDiff =
    diffList.find((item) => {
      return /^@@ \-\d+,\d+ \+\d+,\d+ @@/g.test(item);
    }) || "";

  const [lastOldLineCount, lastNewLineCount] = lastDiff
    .replace(/@@ \-(\d+),(\d+) \+(\d+),(\d+) @@.*/g, ($0, $1, $2, $3, $4) => {
      return `${+$1 + +$2},${+$3 + +$4}`;
    })
    .split(",");

  if (!/^\d+$/.test(lastOldLineCount) || !/^\d+$/.test(lastNewLineCount)) {
    return {
      lastOldLine: -1,
      lastNewLine: -1,
    };
  }

  const lastOldLine =
    lastLineFirstChar === "+" ? -1 : (parseInt(lastOldLineCount) || 0) - 1;
  const lastNewLine =
    lastLineFirstChar === "-" ? -1 : (parseInt(lastNewLineCount) || 0) - 1;

  return {
    lastOldLine,
    lastNewLine,
  };
};

export default class Gitlab {
  projectId;
  mrIId;
  request;
  target;

  constructor({ projectId, mrIId, accessToken }) {
    // 定义请求的主机地址
    const host = config.gitlab.host;
    console.log("host", host);
    // 创建请求对象，并传入请求参数
    this.request = createRequest(host, {
      params: { private_token: accessToken },
    });
    // 保存合并请求的id
    this.mrIId = mrIId;
    // 保存项目id
    this.projectId = projectId;
    // 需要检测的文件类型仅为 python,js,ts,jsx,tsx, html, vue, java

    // 保存需要检测的文件类型
    this.target = /\.(py|js|ts|jsx|tsx|html|vue|java|dart)$/;
  }

  /**
   * 获取单个合并请求的变化
   *
   * @returns Promise，解析为包含状态、变化和引用信息的对象
   *
   * @throws 如果请求失败，则抛出一个包含错误信息的Promise
   */
  // async getChanges() {
  //   try {
  //     const res = await this.request.get(
  //       `/api/v4/projects/${this.projectId}/merge_requests/${this.mrIId}/changes`
  //     );
  //     const { changes, diff_refs: diffRef, state } = res.data;
  
  //     // 获取所有符合条件的代码变更项
  //     const codeChanges = await Promise.all(
  //       changes
  //         .map((item) => formatByCamelCase(item))
  //         .filter((item) => {
  //           const { newPath, renamedFile, deletedFile } = item;
  //           if (renamedFile || deletedFile) return false;
  //           if (!this.target.test(newPath)) return false;
  //           return true;
  //         })
  //         .map(async (item) => {
  //           const { lastOldLine, lastNewLine } = parseLastDiff(item.diff);
  //           const refName = diffRef.head_sha; // 获取目标分支的 SHA
  //           const fileContent = await this.getFileContent(item.newPath, refName);
  //           const context = this.extractContext(fileContent, lastNewLine, 30); // ±3 行上下文
  //           console.log("context", context);
  //           return {
  //             ...item,
  //             lastNewLine,
  //             lastOldLine,
  //             context,
  //           };
  //         })
  //     );
  
  //     return {
  //       state,
  //       changes: codeChanges,
  //       ref: formatByCamelCase(diffRef),
  //     };
  //   } catch (error) {
  //     logger.error(error);
  //     return {
  //       state: "",
  //       changes: [],
  //       ref: {},
  //     };
  //   }
  // }
  
  getChanges() {
    /** https://docs.gitlab.com/ee/api/merge_requests.html#get-single-merge-request-changes */
    return this.request
      .get(
        `/api/v4/projects/${this.projectId}/merge_requests/${this.mrIId}/changes`
      )
      .then((res) => {
        const { changes, diff_refs: diffRef, state } = res.data;
        const codeChanges = changes
          .map((item) => formatByCamelCase(item))
          .filter((item) => {
            const { newPath, renamedFile, deletedFile } = item;
            if (renamedFile || deletedFile) {
              return false;
            }
            if (!this.target.test(newPath)) {
              return false;
            }
            return true;
          })
          .map((item) => {
            const { lastOldLine, lastNewLine } = parseLastDiff(item.diff);
            return { ...item, lastNewLine, lastOldLine };
          });
        return {
          state,
          changes: codeChanges,
          ref: formatByCamelCase(diffRef),
        };
      })
      .catch((error) => {
        logger.error(error);
        return {
          state: "",
          changes: [],
          ref: {},
        };
      });
  }

  async getFileContent(newPath, ref) {
    const encodedPath = encodeURIComponent(newPath);
    try {
      const res = await this.request.get(
        `/api/v4/projects/${this.projectId}/repository/files/${encodedPath}/raw`,
        {
          params: { ref },
        }
      );
      return res.data;
    } catch (err) {
      logger.error(`Failed to fetch file content: ${newPath}`, err);
      return "";
    }
  }

  // 提取上下文
  extractContext(content, targetLine, range = 30) {
    // 如果目标行数为-1，则返回空字符串
    if (targetLine === -1) return { before: "", target: "", after: "" };
    // 将内容按行分割
    const lines = content.split("\n");
    // 计算起始行数，不能小于0
    const start = Math.max(0, targetLine - range - 1);
    const end = Math.min(lines.length, targetLine + range);
    return {
      before: lines.slice(start, targetLine - 1).join("\n"),
      target: lines[targetLine - 1] || "",
      after: lines.slice(targetLine, end).join("\n"),
    };
  }

  postComment({ newPath, newLine, oldPath, oldLine, body, ref }) {
    /** https://docs.gitlab.com/ee/api/discussions.html#create-a-new-thread-in-the-merge-request-diff */
    return this.request
      .post(
        `/api/v4/projects/${this.projectId}/merge_requests/${this.mrIId}/discussions`,
        {
          body,
          position: {
            position_type: "text",
            base_sha: ref?.baseSha,
            head_sha: ref?.headSha,
            start_sha: ref?.startSha,
            new_path: newPath,
            new_line: newLine,
            old_path: oldPath,
            old_line: oldLine,
          },
        }
      )
      .catch((error) => {
        logger.error(error);
      });
  }

  // 异步代码审查函数
  async codeReview({ change, message, ref }) {
    // 解构赋值，获取change对象的lastNewLine、lastOldLine、newPath、oldPath属性
    const { lastNewLine = -1, lastOldLine = -1, newPath, oldPath } = change;

    // 如果lastNewLine和lastOldLine都为-1，则输出错误信息
    if (lastNewLine === -1 && lastOldLine === -1) {
      logger.error("Code line error");
      return;
    }

    // 定义params对象
    const params = {};

    // 如果lastOldLine不为-1，则将lastOldLine和oldPath赋值给params对象的oldLine和oldPath属性
    if (lastOldLine !== -1) {
      params.oldLine = lastOldLine;
      params.oldPath = oldPath;
    }

    // 如果lastNewLine不为-1，则将lastNewLine和newPath赋值给params对象的newLine和newPath属性
    if (lastNewLine !== -1) {
      params.newLine = lastNewLine;
      params.newPath = newPath;
    }

    return await this.postComment({
      ...params,
      body: message,
      ref,
    });
  }
}

import express from "express";
import cors from "cors";
import ChatGPT from "./chatgpt.js";
import Gitlab from "./gitlab.js";
import * as dotenv from "dotenv";
import { addTask, updateTask, deleteTask, getTasks } from "./taskManage.js";
import logger from './logger.js';
import { sendMessage } from "./message.js";

const app = express();

// let stopLoop = false;

dotenv.config();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", async (req, res) => {
  logger.success(new Date().toLocaleString(), req.url, req.method);
  res.send("get-ok");
});

app.post("/code-review", async (req, res) => {
  try {
    const { body, query } = req;
    const chatgpt = new ChatGPT();
    const gitlab = new Gitlab({
      projectId: body.project.id,
      mrIId: body.object_attributes.iid,
      accessToken: query.access_token,
    });
    if(!body.object_attributes.iid) {
      return res.status(200).send({ status: "200", msg: "no changes" });
    }
    const { state, changes, ref } = await gitlab.getChanges();
    logger.info("changes", changes.length);
    if(changes.length === 0) {
      await deleteTask(body.object_attributes.iid);
      return res.status(200).send({ status: "200", msg: "no changes" });
    }
    if (state !== "opened") {
      logger.info("MR is closed");
      await updateTask(body.project.name, body.object_attributes.iid, "closed");
      await deleteTask(body.object_attributes.iid);
      // stopLoop = true;
      return res.status(200).send({ status: "200", msg: "MR is closed" });
    }
    if (!chatgpt) {
      logger.error("Chat is null");
      return res.status(200).send({ status: "200", msg: "ChatGpt is null" });
    }
    const tasks = await getTasks();
    // 任务是否已经存在，如果存在，则不再创建新任务，不做二次审核
    if (tasks.some(task => task.mergeId === body.object_attributes.iid && task.project === body.project.name)) {
      logger.warn(`⚠️ 任务已存在: ${body.project.name} - ${body.object_attributes.iid}`);
      return res.status(200).send({ status: "200", msg: "Task already exists" });
    } else {
      await addTask(body, state, changes.length);
      for (let i = 0; i <= changes.length; i += 1) {
        const tasksList = await getTasks();
        const task = tasksList.find(task => task.mergeId === body.object_attributes.iid && task.project === body.project.name);
        logger.info(`🔄 任务状态: ${body.project.name} - ${body.object_attributes.iid} - ${task.status}`);
        if (task.status === "closed") {
          logger.info(`🔄 任务已关闭: ${body.project.name} - ${body.object_attributes.iid}`);
          await deleteTask(body.object_attributes.iid);
          break;
        }
        if(i === changes.length) {
          const message = '本次变更涉及的所有代码审查已完成，供参考，谢谢！';
          await sendMessage(body.user.name, `项目${body.project.name}的MR#${body.object_attributes.iid}已完成代码审查，请前往仓库查看。`);
          await gitlab.codeReview({ message, ref, change: changes[i - 1] });
          // stopLoop = true;
        } else {
          const change = changes[i];
          const message = await chatgpt.codeReview(change.diff);

          await gitlab.codeReview({ message, ref, change });
        }
      }
      res.status(200).send({ status: "200", msg: "ok" });
    }

  } catch (error) {
    res.status(500).send({ status: "500", error });
  }
});
app.use((err, req, res, next) => {
  logger.error("something run err...");
  res.status(500).json({ message: err.message });
});
app.listen(4000, '0.0.0.0',() => {
  logger.info("listening on 4000...");
});

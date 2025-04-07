import fs from "fs";
import path from "path";
import flock from "proper-lockfile";
import logger, {incrementCounter} from './logger.js';


const isDevelopment = process.env.NODE_ENV === "development";
const TASK_FILE = path.resolve(process.cwd(), isDevelopment ? "assets/task.json" : "dist/assets/task.json");

// 读取任务数据
async function readTasks() {
    if (!fs.existsSync(TASK_FILE)) {
        logger.error("任务文件不存在");
        throw new Error("任务文件不存在");
    }
    try {
        const data = await fs.promises.readFile(TASK_FILE, "utf8");
        logger.debug("成功读取任务文件");
        return JSON.parse(data);
    } catch (err) {
        logger.error("读取文件失败", { error: err.message });
        throw new Error("读取文件失败", err);
    }
}

// 写入任务数据（带锁）
async function writeTasks(tasks) {
    if (!tasks || !tasks.taskList) {
        logger.error("任务数据格式错误");
        throw new Error("任务数据格式错误");
    }
    const release = await flock.lock(TASK_FILE, { stale: 5000, retries: 3 });
    if (!release) {
        logger.error("无法获取文件锁");
        throw new Error("无法获取文件锁");
    }
    try {
        await fs.promises.writeFile(TASK_FILE, JSON.stringify(tasks, null, 2), "utf8");
        logger.debug("成功写入任务文件");
    } catch (err) {
        logger.error("写入文件失败", { error: err.message });
        throw new Error("写入文件失败", err);
    } finally {
        await release(); // 释放锁
    }
}

// 添加任务
async function addTask(data, status = "open", length) {
    const project = data.project.name, mergeId = data.object_attributes.iid, userName = data.user.name;
    logger.info(`尝试添加新任务: ${project} - ${mergeId}`);
    incrementCounter(project, length); // 增加计数器

    const tasks = await readTasks();
    if (tasks.taskList.some(task => task.mergeId === mergeId && task.project === project)) {
        logger.warn(`任务已存在: ${project} - ${mergeId}`);
        return;
    }
    tasks.taskList.push({ project, mergeId, status, userName });
    await writeTasks(tasks);
    logger.info(`成功添加任务: ${project} - ${mergeId}`);
}

// 更新任务状态
async function updateTask(project, mergeId, newStatus) {
    logger.info(`尝试更新任务状态: ${project} - ${mergeId} -> ${newStatus}`);
    const tasks = await readTasks();
    const task = tasks.taskList.find(t => t.mergeId === mergeId && t.project === project);
    if (task) {
        task.status = newStatus;
        await writeTasks(tasks);
        logger.info(`成功更新任务状态: ${mergeId} -> ${newStatus}`);
    } else {
        logger.warn(`未找到任务: ${mergeId}`);
    }
}

// 删除任务
async function deleteTask(mergeId) {
    logger.info(`尝试删除任务: ${mergeId}`);
    const tasks = await readTasks();
    const newTaskList = tasks.taskList.filter(t => t.mergeId !== mergeId);
    if (newTaskList.length !== tasks.taskList.length) {
        tasks.taskList = newTaskList;
        await writeTasks(tasks);
        logger.info(`成功删除任务: ${mergeId}`);
    } else {
        logger.warn(`未找到任务: ${mergeId}`);
    }
}

// 获取所有任务
async function getTasks() {
    logger.info("获取所有任务");
    const tasks = await readTasks();
    logger.debug("当前任务列表:", { taskCount: tasks.taskList.length });
    return tasks.taskList;
}

export { addTask, updateTask, deleteTask, getTasks };
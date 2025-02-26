import fs from "fs";
import path from "path";
import flock from "proper-lockfile";

const TASK_FILE = path.resolve(process.cwd(), "assets/task.json");

// 读取任务数据
async function readTasks() {
    try {
        const data = await fs.promises.readFile(TASK_FILE, "utf8");
        return JSON.parse(data);
    } catch (err) {
        return { taskList: [] }; // 文件不存在时返回默认结构
    }
}

// 写入任务数据（带锁）
async function writeTasks(tasks) {
    const release = await flock.lock(TASK_FILE, { stale: 5000, retries: 3 });
    try {
        await fs.promises.writeFile(TASK_FILE, JSON.stringify(tasks, null, 2), "utf8");
    } finally {
        await release(); // 释放锁
    }
}

// 添加任务
async function addTask(project, mergeId, status = "open") {
    const tasks = await readTasks();
    if (tasks.taskList.some(task => task.mergeId === mergeId && task.project === project)) {
        console.log(`⚠️ 任务已存在: ${project} - ${mergeId}`);
        return;
    }
    tasks.taskList.push({ project, mergeId, status });
    await writeTasks(tasks);
    console.log(`✅ 任务已添加: ${project} - ${mergeId}`);
}

// 更新任务状态
async function updateTask(project, mergeId, newStatus) {
    const tasks = await readTasks();
    const task = tasks.taskList.find(t => t.mergeId === mergeId && t.project === project);
    if (task) {
        task.status = newStatus;
        await writeTasks(tasks);
        console.log(`🔄 任务状态更新: ${mergeId} -> ${newStatus}`);
    } else {
        console.log(`⚠️ 未找到任务: ${mergeId}`);
    }
}

// 删除任务
async function deleteTask(mergeId) {
    const tasks = await readTasks();
    const newTaskList = tasks.taskList.filter(t => t.mergeId !== mergeId);
    if (newTaskList.length !== tasks.taskList.length) {
        tasks.taskList = newTaskList;
        await writeTasks(tasks);
        console.log(`🗑 任务已删除: ${mergeId}`);
    } else {
        console.log(`⚠️ 未找到任务: ${mergeId}`);
    }
}

// 获取所有任务
async function getTasks() {
    const tasks = await readTasks();
    console.log("📋 当前任务列表:", tasks.taskList);
    return tasks.taskList;
}

export { addTask, updateTask, deleteTask, getTasks };
import winston from 'winston';
import path from 'path';
import fs from 'fs';

const isDevelopment = process.env.NODE_ENV === "development";
const logDir = path.join(process.cwd(), isDevelopment ? "logs" : "dist/logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// 创建Winston logger实例
const logger = winston.createLogger({
  format: logFormat,
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    }),
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

// 计数器文件路径
const COUNTER_FILE = path.join(logDir, 'counters.json');

// 读取计数器数据
const readCounters = () => {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = fs.readFileSync(COUNTER_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    logger.error('读取计数器文件失败', { error: err.message });
  }
  return {};
};

// 写入计数器数据
const writeCounters = (counters) => {
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(counters, null, 2), 'utf8');
  } catch (err) {
    logger.error('写入计数器文件失败', { error: err.message });
  }
};

// 获取今天的日期字符串
const getTodayString = () => {
  return new Date().toISOString().split('T')[0];
};

// 计数器对象
let counters = readCounters();

// 获取计数器值
export const getCounter = (name) => {
  const today = getTodayString();
  return (counters[today] && counters[today][name]) || 0;
};

// 获取指定日期的计数器值
export const getCounterByDate = (name, date) => {
  return (counters[date] && counters[date][name]) || 0;
};

// 增加计数器值
export const incrementCounter = (name, length) => {
  const today = getTodayString();
  
  // 初始化今天的计数器
  if (!counters[today]) {
    counters[today] = {};
  }
  
  // 增加计数
  counters[today][name] = (counters[today][name] || 0) + length;
  
  // 写入文件
  writeCounters(counters);
  
  // 创建计数器专用的日志记录
  const counterLogger = winston.createLogger({
    format: logFormat,
    transports: [
      new winston.transports.File({
        filename: path.join(logDir, 'counter.log'),
      })
    ]
  });
  
  // 记录计数信息
  counterLogger.info(`${today} - ${name}: ${counters[today][name]} ${length ? `(length: ${length})` : ''}`);
};

// 获取所有计数器统计
export const getAllCounters = () => {
  return counters;
};

export default logger;
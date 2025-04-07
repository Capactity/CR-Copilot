import { config } from './utils.js';
import logger from './logger.js';
import createRequest from './request.js';



export const getToken = async () => {
  const { host, app_id, app_secret } = config.feishu;

  const request = createRequest(host, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const res = await request.post('/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: app_id?.trim(),
    app_secret: app_secret?.trim(),
  });
  return res.data?.tenant_access_token;
};



 export async function sendMessage (userName, text) {
  console.log('📨 准备发送消息，userName:', userName, '内容:', text);
  const feishuConfig = config.feishu;
  const user = config.user_list.find(u => u.name === userName);

  if (!user) {
    const msg = `用户 ${userName} 未在映射表中，请手动配置`;
    logger.error(msg);
    throw new Error(msg);
  }

  const token = await getToken();
  if (!token) {
    const msg = '获取飞书 token 失败';
    logger.error(msg);
    throw new Error(msg);
  }

  try {
    // ✅ 创建 request 实例并发送消息
    const request = createRequest(feishuConfig.host, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const res = await request.post(`/open-apis/message/v4/send?receive_id_type=user_id`, {
      user_id: user.user_id,
      msg_type: 'text',
      content: {
        text,
      },
    });

    console.log('✅ 消息发送成功:', res?.data);
    return res.data;
  } catch (err) {
    console.error('❌ sendMessage 错误:', err.message);
    if (err.response) {
      console.error('状态码:', err.response.status);
      console.error('响应内容:', err.response.data);
    }
    logger.error('发送消息失败:', err.message);
    throw err;
  }
};

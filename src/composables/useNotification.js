import { ref } from 'vue';
import { NOTIFICATION_DURATION } from '@/constants';

/**
 * 通知管理 composable
 * @returns {Object} 通知状态和方法
 */
export const useNotification = () => {
  const notification = ref({ show: false, message: '', type: 'success' });

  /**
   * 显示通知
   * @param {string} msg - 通知消息
   * @param {string} type - 通知类型（success/error）
   */
  const showNotification = (msg, type = 'success') => {
    notification.value = { show: true, message: msg, type };
    setTimeout(() => {
      notification.value.show = false;
    }, NOTIFICATION_DURATION);
  };

  return {
    notification,
    showNotification
  };
};

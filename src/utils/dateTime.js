import { format, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { parseDate } from '@internationalized/date';

/**
 * 合并日期和时间为 ISO 字符串
 * @param {CalendarDate} date - Reka UI CalendarDate 对象
 * @param {string} time - 时间字符串，格式 HH:mm
 * @returns {string} ISO 8601 格式的日期时间字符串
 */
export const combineDateTime = (date, time) => {
  if (!date) return '';
  const dateStr = date.toString();
  const dateObj = new Date(dateStr);
  const [hours, minutes] = time.split(':');
  dateObj.setHours(parseInt(hours), parseInt(minutes));
  return dateObj.toISOString();
};

/**
 * 从 ISO 字符串提取时间部分
 * @param {string} isoString - ISO 8601 格式的日期时间字符串
 * @returns {string} HH:mm 格式的时间字符串
 */
export const extractTimeFromISO = (isoString) => {
  const dateObj = new Date(isoString);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * 从 ISO 字符串提取日期部分
 * @param {string} isoString - ISO 8601 格式的日期时间字符串
 * @returns {CalendarDate} Reka UI CalendarDate 对象
 */
export const extractDateFromISO = (isoString) => {
  try {
    const isoDateStr = isoString.split('T')[0];
    return parseDate(isoDateStr);
  } catch (e) {
    return undefined;
  }
};

/**
 * 格式化 ISO 日期为显示文本（带时间）
 * @param {string} iso - ISO 8601 格式的日期时间字符串
 * @returns {string} 格式化的日期时间文本
 */
export const formatDate = (iso) =>
  iso ? format(new Date(iso), 'MMM do HH:mm', { locale: zhCN }) : '';

/**
 * 格式化 ISO 日期为简单格式（YYYY/MM/DD）
 * @param {string} iso - ISO 8601 格式的日期时间字符串
 * @returns {string} 格式化的日期文本
 */
export const formatSimpleDate = (iso) =>
  iso ? format(new Date(iso), 'yyyy/MM/dd', { locale: zhCN }) : '-';

/**
 * 生成 30 分钟间隔的时间选项数组
 * @returns {string[]} 时间数组 ['00:00', '00:30', '01:00', ...]
 */
export const generateTimeOptions = () => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    const h = i.toString().padStart(2, '0');
    times.push(`${h}:00`);
    times.push(`${h}:30`);
  }
  return times;
};

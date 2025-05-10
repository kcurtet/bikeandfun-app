export const convertToUTC = (date: Date): Date => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000);
};

export const convertToLocal = (date: Date): Date => {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};

export const formatDateTime = (dateString: string, locale: string = 'es-ES'): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '-';
    }
    const localDate = convertToLocal(date);
    return localDate.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}; 
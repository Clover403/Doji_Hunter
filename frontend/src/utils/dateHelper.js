// Date formatting helper
export const formatDateTime = (dateString) => {
  try {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // 25 instead of 2025
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert 24h to 12h format, 0 becomes 12
    hours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

// Short time format (HH:MM AM/PM)
export const formatTime = (dateString) => {
  try {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    hours = String(hours).padStart(2, '0');
    return `${hours}:${minutes} ${ampm}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

// Short date format (DD/MM/YY)
export const formatDate = (dateString) => {
  try {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'Invalid Date';
  }
};

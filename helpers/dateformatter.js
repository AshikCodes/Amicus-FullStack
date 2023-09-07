function getFormattedTimestamp() {
    const options = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata' // India Standard Time (IST)
    };
  
    const now = new Date();
    const formattedTimestamp = now.toLocaleString('en-IN', options);
  
    const [datePart, timePart] = formattedTimestamp.split(', ');
    const [day, month, year] = datePart.split('/');
    const [time, meridiem] = timePart.split(' ');
  
    const formattedTime = `${day}/${month}/${year}-${time}-${meridiem}`;
  
    return formattedTime;
  }

  module.exports = getFormattedTimestamp;
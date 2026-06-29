function getLocalDateTime() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = new Date(now - offset).toISOString().slice(0, 19).replace('T', ' ');
    return localISOTime;
}

function getLocalDateTimeWithAMPM() {
    const now = new Date();
    
    // Usar métodos directos para obtener componentes de fecha local
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Formato 12 horas con AM/PM
    const hours12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    return {
        iso: `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes}:${seconds}`,
        formatted: `${year}-${month}-${day} ${hours12}:${minutes}:${seconds} ${ampm}`,
        formatted24: `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes}:${seconds}`,
        timestamp: Math.floor(now.getTime() / 1000)
    };
}


module.exports = { 
    getLocalDateTime,
    getLocalDateTimeWithAMPM
};
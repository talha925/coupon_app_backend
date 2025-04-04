const htmlDecode = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/&amp;/g, '&')
      .replace(/&#x2F;/g, '/')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
  };
  
  module.exports = htmlDecode;
  
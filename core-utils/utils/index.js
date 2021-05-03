const fs = require('fs');

/**
 * Check if file exists
 * @param {String} file - Path to file
 * @returns {Boolean}
 */
 module.exports.existsSync = function(file) {
  try {
    fs.statSync(file);
  } catch (err) {
    return false;
  }

  return true;
};

/**
 * Check if a path is a directory
 * @param {String} dirPath - Path to a directory
 * @returns {Boolean}
 */
 module.exports.isDirectory = function(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
};
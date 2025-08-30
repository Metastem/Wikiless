module.exports.removeCacheFiles = function() {
  const config = require('../wikiless.config');

  async function deleteStatic() {
    const fs = require('fs');
    const wiki_files = './media/wikipedia/';

    fs.rm(wiki_files, { recursive: true, force: true }, () => {
      console.log('Cleared cached static media files. You can turn this off by setting the config.cache_control to false.');
    });
  }

  if(config.cache_control) {
    deleteStatic();

    let hours = config.cache_control_interval;
    if (hours < 1 || isNaN(hours)) {
      hours = 24;
    }

    setInterval(() => {
      deleteStatic();
    }, 1000 * 60 * 60 * hours);
  }
}

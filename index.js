import axios from 'axios'
import FormData from 'form-data'

/**
   * @param {Object} options
   * @param {String} options.token SourceMap upload address (Required)
   * @param {String} options.dsn Whether to retain sourceMap in production environment
   * @param {Boolean} options.productionSourceMap 生产环境是否保留sourceMap
   * @param {Array} options.uploadScript Commands that need to upload sourceMap (Optional, default: ['vite build'])
   * @param {Number} options.concurrency Concurrency limit (Optional, default: 5)
   * @param {String} options.api Upload interface URL (Optional, default: '/api/upload/sourcemap')
   * @param {String} options.logger Enable logging (Optional, default: true)
   */
function EyesSourceMap(options) {
  const {
    token,
    dsn,
    productionSourceMap,
    uploadScript = ['vite build'],
    concurrency = 5,
    api = '/api/upload/sourcemap',
    logger = true
  } = options;

  const sanitizedDsn = dsn.replace(/\/$/, '');
  const npmLifecycleScript = process.env.npm_lifecycle_script || '';

  if (!token || !dsn || typeof productionSourceMap === 'undefined') {
    throw new Error('Plugin: eyes-upload-map Missing required parameters (token, dsn, productionSourceMap)');
  }

  const checkUpload = () => {
    return uploadScript.some((cmd) => npmLifecycleScript.includes(cmd));
  };

  const upLoadMap = async (data, name) => {
    const formData = new FormData();
    formData.append('file', Buffer.from(data), name);
    formData.append('apiKey', token);

    try {
      const response = await axios.post(`${sanitizedDsn}${api}`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000, // 30s
      });

      if (response.status !== 200) {
        logger && console.warn(`Upload failed: ${response.status} (Filename: ${name})`);
        return null;
      }
      logger && console.log(`${name} upload complete`);
      return response.data;
    } catch (error) {
      logger && console.warn(`Error during upload: ${error.message} (Filename: ${name})`);
      return null;
    }
  };

  const limitedConcurrency = async (tasks, limit) => {
    const activeTasks = [];
    const results = [];

    for (const task of tasks) {
      const promise = task().catch((err) => {
        logger && console.error(`Error during upload: ${err.message} (Filename: ${task.name})`);
        return err
      });
      results.push(promise);

      const execute = promise.finally(() => activeTasks.splice(activeTasks.indexOf(execute), 1));
      activeTasks.push(execute);

      if (activeTasks.length >= limit) {
        await Promise.race(activeTasks);
      }
    }

    return Promise.allSettled(results)
  }

  return {
    name: 'eyes-sourcemap-vite',
    apply: 'build',

    async generateBundle(_, bundle) {
      if (!checkUpload()) {
        return;
      }

      const uploadTasks = [];

      for (const [filename, chunk] of Object.entries(bundle)) {
        if (filename.endsWith('.map')) {
          const source = chunk.source || chunk.code || '';
          uploadTasks.push(() => upLoadMap(source, filename));
        }
      }

      try {
        await limitedConcurrency(uploadTasks, concurrency);
      } catch (error) {
        logger && console.error('Error during upload:', error);
      }

      if (!productionSourceMap) {
        for (const filename of Object.keys(bundle)) {
          if (filename.endsWith('.map')) {
            delete bundle[filename];
          }
        }
      }
    },
  };
}

export default EyesSourceMap;

/**
   * @param {Object} options 配置选项
   * @param {String} options.token 项目唯一token 必填
   * @param {String} options.dsn sourceMap上传地址 必填
   * @param {Boolean} options.productionSourceMap 生产环境是否保留sourceMap
   * @param {Array} options.uploadScript 需要上传sourceMap的命令 可选，默认 ['vue-cli-service build']
   * @param {Number} options.concurrency 并发数量限制，可选，默认值为 5
   * @param {String} options.api 上传接口url，可选，默认值为/api/upload/sourcemap
   */
function EyesSourceMap(options) {
  const {
    token,
    dsn,
    productionSourceMap,
    uploadScript = ['vite build'],
    concurrency = 5, // 默认并发数量
    api = '/api/upload/sourcemap',
  } = options;

  const sanitizedDsn = dsn.replace(/\/$/, ''); // 确保 dsn 没有结尾斜杠
  const npmLifecycleScript = process.env.npm_lifecycle_script || '';

  if (!token || !dsn || typeof productionSourceMap === 'undefined') {
    throw new Error('插件：eyes-upload-map 缺少必填参数 (token, dsn, productionSourceMap)');
  }

  // 判断是否需要上传 sourceMap
  const checkUpload = () => {
    return uploadScript.some((cmd) => npmLifecycleScript.includes(cmd));
  };

  // 上传 map 文件
  const upLoadMap = async (data, name) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30 * 1000); // 超时时间 30s

    const formData = new FormData();
    formData.append('file', new Blob([data]), name);
    formData.append('apiKey', token);

    try {
      const response = await fetch(`${sanitizedDsn}${api}`, {
        method: 'POST',
        body: formData,
        // headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status !== 200) {
        console.warn(`上传失败：${response.status}（文件名：${name}）`);
        return null;
      }
      console.log(`${name}上传完成`);
      return response.json();
    } catch (error) {
      console.warn(`上传过程中出错：${error.message}（文件名：${name}）`);
      return null;
    }
  };

  // 控制并发上传任务
  const limitedConcurrency = async (tasks, limit) => {
    const activeTasks = [];
    const results = [];

    for (const task of tasks) {
      const promise = task().catch((err) => err); // 捕获错误以避免中断
      results.push(promise);

      const execute = promise.finally(() => activeTasks.splice(activeTasks.indexOf(execute), 1));
      activeTasks.push(execute);

      if (activeTasks.length >= limit) {
        await Promise.race(activeTasks); // 等待最快完成的任务
      }
    }

    return Promise.allSettled(results)
  }

  return {
    name: 'eyes-sourcemap-vite',
    apply: 'build',

    // Vite 插件的 `generateBundle` 钩子
    async generateBundle(_, bundle) {
      if (!checkUpload()) {
        return;
      }

      const uploadTasks = [];

      // 遍历所有生成的文件，筛选出 .map 文件
      for (const [filename, chunk] of Object.entries(bundle)) {
        if (filename.endsWith('.map')) {
          const source = chunk.source || chunk.code || ''; // 处理不同的 chunk 结构
          uploadTasks.push(() => upLoadMap(source, filename));
        }
      }

      try {
        // 使用并发控制上传文件
        await limitedConcurrency(uploadTasks, concurrency);
      } catch (error) {
        console.error('上传过程中出错:', error);
      }

      // 如果不需要保留 sourceMap，则从 bundle 中移除它们
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

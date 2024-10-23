export default {
    input: 'index.js',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs', // CommonJS 格式
      },
      {
        file: 'dist/index.mjs',
        format: 'esm', // ESModule 格式
      },
    ],
  };
  
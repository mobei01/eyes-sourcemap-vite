<div align="center">
    <p>eyes-sourcemap-vite</p>
</div>

## 功能

1、打包时自动上传sourceMap,在打包完成后，输出dist文件前运行

注意：
1、需要配置sourcemap，否则无法上传sourceMap
2、本插件需要配套编写服务端上传接口
3、本插件支持vite项目



## 安装

```bash
$ npm install eyes-sourcemap-vite -D
```

## 配置

```bash
// vite.config.js
import EyesSourceMap from 'eyes-sourcemap-vite'

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      new EyesSourceMap({
        dsn: 'http://xxx', // 上传地址, 必填
        token: '', // 项目id, 必填
        uploadScript: ['vue-cli-service build --mode staging'], // 执行上报的构建命令, 选填
        productionSourceMap: true, // 是否保留sourceMap, 选填，默认false不保留
        concurrency: 6, // 上传最大并发数，选填，默认5
        api: '' // 上传接口，选填,默认/api/upload/sourcemap
      })
    ],
    build: {
      sourcemap: 'hidden',
    } 
  }
});
```

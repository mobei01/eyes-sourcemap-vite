<div align="center">
  <h1>eyes-sourcemap-vite</h1> <p>A Vite plugin for uploading source maps during build processes, supporting error tracking and debugging in production.</p>
</div>

📋 **Introduction**

eyes-sourcemap-vite is a powerful Vite plugin that automatically uploads source maps at build time, enabling efficient debugging and error tracking. It executes after the build process, before the final output of the dist folder.

⚠️ **Important Notes**

Source maps must be enabled in your Vite build, or the plugin won't function.
You need to provide a server-side API to receive uploaded source maps.
This plugin is specifically designed for Vite projects.

🚀 **Installation**

Install the plugin via npm:

```bash
npm install eyes-sourcemap-vite --save-dev
```

⚙️ **Configuration**

Below is an example of how to configure the plugin in your vite.config.js:

```bash
// vite.config.js
import { defineConfig } from 'vite';
import EyesSourceMap from 'eyes-sourcemap-vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    EyesSourceMap({
      dsn: 'http://your-upload-url', // Required: API base URL for uploads
      token: 'your-project-token',   // Required: Unique project identifier
      uploadScript: ['vue-cli-service build --mode staging'], // Optional: Commands triggering upload
      productionSourceMap: true,     // Optional: Retain source maps (default: false)
      concurrency: 6,                 // Optional: Max upload concurrency (default: 5)
      api: '/api/upload/sourcemap',   // Optional: API endpoint for uploads (default: /api/upload/sourcemap)
      logger: true                   // Optional: Enable logging (default: true)
    })
  ],
  build: {
    sourcemap: 'hidden', // Ensure sourcemaps are generated
  }
}));

```

example with nestJS server:

```bash
@Post('sourcemap')
@UseInterceptors(FileInterceptor('file'))
async uploadSourceMap(
  @UploadedFile() file: Express.Multer.File, 
  @Body('apiKey') apiKey: string
) {
  if (!file || !apiKey) {
    throw new CustomHttpException('upload fail', ERROR_CODES.INVALID_PARAMETER);
  }
  return this.uploadService.handleUploadedFile(file, apiKey);
}

async handleUploadedFile(file: Express.Multer.File, apiKey: string) {
  try {
    const filePath = path.join(this.uploadPath, apiKey);

    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(filePath, { recursive: true });
    }

    const fileUrl = path.join(filePath, file.originalname)
    fs.writeFileSync(fileUrl, file.buffer);

    return { message: 'upload success', filename: file.filename };
  } catch (error) {
    throw new CustomHttpException('upload fail', ERROR_CODES.INVALID_PARAMETER);
  }
}
  
```

🎯 **When to Use This Plugin?**

Production Error Tracking: Upload source maps to your monitoring service for better stack traces in production.
Efficient Debugging: Retain hidden source maps to debug production issues without exposing code to end-users.

📝 **Changelog**

**v1.0.3**

* Added dependencies: axios and form-data for HTTP requests and form data handling.
* Lowered Node.js version requirements to improve compatibility with older Node environments.
* Enhanced upload logic: Improved stability for concurrent uploads.

**v1.0.2**

* Initial release of the plugin.
* Support for concurrent uploads: Allows customizable concurrency limits to improve upload efficiency.

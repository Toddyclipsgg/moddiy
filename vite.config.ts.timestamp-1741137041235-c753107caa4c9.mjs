// vite.config.ts
import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from "file:///C:/Users/toddy/Desktop/moddiy/node_modules/.pnpm/@remix-run+dev@2.15.3_@remix-run+react@2.15.3_react-dom@18.3.1_react@18.3.1__react@18.3.1_typ_sjwbb2uxj5cvy2md4ln5xc2cky/node_modules/@remix-run/dev/dist/index.js";
import UnoCSS from "file:///C:/Users/toddy/Desktop/moddiy/node_modules/.pnpm/unocss@0.61.9_postcss@8.5.2_rollup@3.29.5_vite@5.4.14_@types+node@22.13.1_sass-embedded@1.83.4_/node_modules/unocss/dist/vite.mjs";
import { defineConfig } from "file:///C:/Users/toddy/Desktop/moddiy/node_modules/.pnpm/vite@5.4.14_@types+node@22.13.1_sass-embedded@1.83.4/node_modules/vite/dist/node/index.js";
import { nodePolyfills } from "file:///C:/Users/toddy/Desktop/moddiy/node_modules/.pnpm/vite-plugin-node-polyfills@0.22.0_rollup@3.29.5_vite@5.4.14_@types+node@22.13.1_sass-embedded@1.83.4_/node_modules/vite-plugin-node-polyfills/dist/index.js";
import { optimizeCssModules } from "file:///C:/Users/toddy/Desktop/moddiy/node_modules/.pnpm/vite-plugin-optimize-css-modules@1.2.0_vite@5.4.14_@types+node@22.13.1_sass-embedded@1.83.4_/node_modules/vite-plugin-optimize-css-modules/dist/index.mjs";
import tsconfigPaths from "file:///C:/Users/toddy/Desktop/moddiy/node_modules/.pnpm/vite-tsconfig-paths@4.3.2_typescript@5.7.3_vite@5.4.14_@types+node@22.13.1_sass-embedded@1.83.4_/node_modules/vite-tsconfig-paths/dist/index.mjs";
import * as dotenv from "file:///C:/Users/toddy/Desktop/moddiy/node_modules/.pnpm/dotenv@16.4.7/node_modules/dotenv/lib/main.js";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
dotenv.config();
var getGitInfo = () => {
  try {
    return {
      commitHash: execSync("git rev-parse --short HEAD").toString().trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD").toString().trim(),
      commitTime: execSync("git log -1 --format=%cd").toString().trim(),
      author: execSync("git log -1 --format=%an").toString().trim(),
      email: execSync("git log -1 --format=%ae").toString().trim(),
      remoteUrl: execSync("git config --get remote.origin.url").toString().trim(),
      repoName: execSync("git config --get remote.origin.url").toString().trim().replace(/^.*github.com[:/]/, "").replace(/\.git$/, "")
    };
  } catch {
    return {
      commitHash: "no-git-info",
      branch: "unknown",
      commitTime: "unknown",
      author: "unknown",
      email: "unknown",
      remoteUrl: "unknown",
      repoName: "unknown"
    };
  }
};
var getPackageJson = () => {
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg2 = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return {
      name: pkg2.name,
      description: pkg2.description,
      license: pkg2.license,
      dependencies: pkg2.dependencies || {},
      devDependencies: pkg2.devDependencies || {},
      peerDependencies: pkg2.peerDependencies || {},
      optionalDependencies: pkg2.optionalDependencies || {}
    };
  } catch {
    return {
      name: "bolt.diy",
      description: "A DIY LLM interface",
      license: "MIT",
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      optionalDependencies: {}
    };
  }
};
var pkg = getPackageJson();
var gitInfo = getGitInfo();
var vite_config_default = defineConfig((config2) => {
  return {
    define: {
      __COMMIT_HASH: JSON.stringify(gitInfo.commitHash),
      __GIT_BRANCH: JSON.stringify(gitInfo.branch),
      __GIT_COMMIT_TIME: JSON.stringify(gitInfo.commitTime),
      __GIT_AUTHOR: JSON.stringify(gitInfo.author),
      __GIT_EMAIL: JSON.stringify(gitInfo.email),
      __GIT_REMOTE_URL: JSON.stringify(gitInfo.remoteUrl),
      __GIT_REPO_NAME: JSON.stringify(gitInfo.repoName),
      __APP_VERSION: JSON.stringify(process.env.npm_package_version),
      __PKG_NAME: JSON.stringify(pkg.name),
      __PKG_DESCRIPTION: JSON.stringify(pkg.description),
      __PKG_LICENSE: JSON.stringify(pkg.license),
      __PKG_DEPENDENCIES: JSON.stringify(pkg.dependencies),
      __PKG_DEV_DEPENDENCIES: JSON.stringify(pkg.devDependencies),
      __PKG_PEER_DEPENDENCIES: JSON.stringify(pkg.peerDependencies),
      __PKG_OPTIONAL_DEPENDENCIES: JSON.stringify(pkg.optionalDependencies)
    },
    build: {
      target: "esnext"
    },
    plugins: [
      nodePolyfills({
        include: ["path", "buffer", "process"]
      }),
      config2.mode !== "test" && remixCloudflareDevProxy(),
      remixVitePlugin({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true
        }
      }),
      UnoCSS(),
      tsconfigPaths(),
      chrome129IssuePlugin(),
      config2.mode === "production" && optimizeCssModules({ apply: "build" })
    ],
    envPrefix: [
      "VITE_",
      "OPENAI_LIKE_API_BASE_URL",
      "OLLAMA_API_BASE_URL",
      "LMSTUDIO_API_BASE_URL",
      "TOGETHER_API_BASE_URL"
    ],
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler"
        }
      }
    }
  };
});
function chrome129IssuePlugin() {
  return {
    name: "chrome129IssuePlugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers["user-agent"]?.match(/Chrom(e|ium)\/([0-9]+)\./);
        if (raw) {
          const version = parseInt(raw[2], 10);
          if (version === 129) {
            res.setHeader("content-type", "text/html");
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>'
            );
            return;
          }
        }
        next();
      });
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx0b2RkeVxcXFxEZXNrdG9wXFxcXG1vZGRpeVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdG9kZHlcXFxcRGVza3RvcFxcXFxtb2RkaXlcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3RvZGR5L0Rlc2t0b3AvbW9kZGl5L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgY2xvdWRmbGFyZURldlByb3h5Vml0ZVBsdWdpbiBhcyByZW1peENsb3VkZmxhcmVEZXZQcm94eSwgdml0ZVBsdWdpbiBhcyByZW1peFZpdGVQbHVnaW4gfSBmcm9tICdAcmVtaXgtcnVuL2Rldic7XHJcbmltcG9ydCBVbm9DU1MgZnJvbSAndW5vY3NzL3ZpdGUnO1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcsIHR5cGUgVml0ZURldlNlcnZlciB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgeyBub2RlUG9seWZpbGxzIH0gZnJvbSAndml0ZS1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMnO1xyXG5pbXBvcnQgeyBvcHRpbWl6ZUNzc01vZHVsZXMgfSBmcm9tICd2aXRlLXBsdWdpbi1vcHRpbWl6ZS1jc3MtbW9kdWxlcyc7XHJcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gJ3ZpdGUtdHNjb25maWctcGF0aHMnO1xyXG5pbXBvcnQgKiBhcyBkb3RlbnYgZnJvbSAnZG90ZW52JztcclxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcblxyXG5kb3RlbnYuY29uZmlnKCk7XHJcblxyXG4vLyBHZXQgZGV0YWlsZWQgZ2l0IGluZm8gd2l0aCBmYWxsYmFja3NcclxuY29uc3QgZ2V0R2l0SW5mbyA9ICgpID0+IHtcclxuICB0cnkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY29tbWl0SGFzaDogZXhlY1N5bmMoJ2dpdCByZXYtcGFyc2UgLS1zaG9ydCBIRUFEJykudG9TdHJpbmcoKS50cmltKCksXHJcbiAgICAgIGJyYW5jaDogZXhlY1N5bmMoJ2dpdCByZXYtcGFyc2UgLS1hYmJyZXYtcmVmIEhFQUQnKS50b1N0cmluZygpLnRyaW0oKSxcclxuICAgICAgY29tbWl0VGltZTogZXhlY1N5bmMoJ2dpdCBsb2cgLTEgLS1mb3JtYXQ9JWNkJykudG9TdHJpbmcoKS50cmltKCksXHJcbiAgICAgIGF1dGhvcjogZXhlY1N5bmMoJ2dpdCBsb2cgLTEgLS1mb3JtYXQ9JWFuJykudG9TdHJpbmcoKS50cmltKCksXHJcbiAgICAgIGVtYWlsOiBleGVjU3luYygnZ2l0IGxvZyAtMSAtLWZvcm1hdD0lYWUnKS50b1N0cmluZygpLnRyaW0oKSxcclxuICAgICAgcmVtb3RlVXJsOiBleGVjU3luYygnZ2l0IGNvbmZpZyAtLWdldCByZW1vdGUub3JpZ2luLnVybCcpLnRvU3RyaW5nKCkudHJpbSgpLFxyXG4gICAgICByZXBvTmFtZTogZXhlY1N5bmMoJ2dpdCBjb25maWcgLS1nZXQgcmVtb3RlLm9yaWdpbi51cmwnKVxyXG4gICAgICAgIC50b1N0cmluZygpXHJcbiAgICAgICAgLnRyaW0oKVxyXG4gICAgICAgIC5yZXBsYWNlKC9eLipnaXRodWIuY29tWzovXS8sICcnKVxyXG4gICAgICAgIC5yZXBsYWNlKC9cXC5naXQkLywgJycpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGNvbW1pdEhhc2g6ICduby1naXQtaW5mbycsXHJcbiAgICAgIGJyYW5jaDogJ3Vua25vd24nLFxyXG4gICAgICBjb21taXRUaW1lOiAndW5rbm93bicsXHJcbiAgICAgIGF1dGhvcjogJ3Vua25vd24nLFxyXG4gICAgICBlbWFpbDogJ3Vua25vd24nLFxyXG4gICAgICByZW1vdGVVcmw6ICd1bmtub3duJyxcclxuICAgICAgcmVwb05hbWU6ICd1bmtub3duJyxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLy8gUmVhZCBwYWNrYWdlLmpzb24gd2l0aCBkZXRhaWxlZCBkZXBlbmRlbmN5IGluZm9cclxuY29uc3QgZ2V0UGFja2FnZUpzb24gPSAoKSA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHBrZ1BhdGggPSBqb2luKHByb2Nlc3MuY3dkKCksICdwYWNrYWdlLmpzb24nKTtcclxuICAgIGNvbnN0IHBrZyA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBrZ1BhdGgsICd1dGYtOCcpKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBuYW1lOiBwa2cubmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246IHBrZy5kZXNjcmlwdGlvbixcclxuICAgICAgbGljZW5zZTogcGtnLmxpY2Vuc2UsXHJcbiAgICAgIGRlcGVuZGVuY2llczogcGtnLmRlcGVuZGVuY2llcyB8fCB7fSxcclxuICAgICAgZGV2RGVwZW5kZW5jaWVzOiBwa2cuZGV2RGVwZW5kZW5jaWVzIHx8IHt9LFxyXG4gICAgICBwZWVyRGVwZW5kZW5jaWVzOiBwa2cucGVlckRlcGVuZGVuY2llcyB8fCB7fSxcclxuICAgICAgb3B0aW9uYWxEZXBlbmRlbmNpZXM6IHBrZy5vcHRpb25hbERlcGVuZGVuY2llcyB8fCB7fSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBuYW1lOiAnYm9sdC5kaXknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0EgRElZIExMTSBpbnRlcmZhY2UnLFxyXG4gICAgICBsaWNlbnNlOiAnTUlUJyxcclxuICAgICAgZGVwZW5kZW5jaWVzOiB7fSxcclxuICAgICAgZGV2RGVwZW5kZW5jaWVzOiB7fSxcclxuICAgICAgcGVlckRlcGVuZGVuY2llczoge30sXHJcbiAgICAgIG9wdGlvbmFsRGVwZW5kZW5jaWVzOiB7fSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuY29uc3QgcGtnID0gZ2V0UGFja2FnZUpzb24oKTtcclxuY29uc3QgZ2l0SW5mbyA9IGdldEdpdEluZm8oKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoY29uZmlnKSA9PiB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGRlZmluZToge1xyXG4gICAgICBfX0NPTU1JVF9IQVNIOiBKU09OLnN0cmluZ2lmeShnaXRJbmZvLmNvbW1pdEhhc2gpLFxyXG4gICAgICBfX0dJVF9CUkFOQ0g6IEpTT04uc3RyaW5naWZ5KGdpdEluZm8uYnJhbmNoKSxcclxuICAgICAgX19HSVRfQ09NTUlUX1RJTUU6IEpTT04uc3RyaW5naWZ5KGdpdEluZm8uY29tbWl0VGltZSksXHJcbiAgICAgIF9fR0lUX0FVVEhPUjogSlNPTi5zdHJpbmdpZnkoZ2l0SW5mby5hdXRob3IpLFxyXG4gICAgICBfX0dJVF9FTUFJTDogSlNPTi5zdHJpbmdpZnkoZ2l0SW5mby5lbWFpbCksXHJcbiAgICAgIF9fR0lUX1JFTU9URV9VUkw6IEpTT04uc3RyaW5naWZ5KGdpdEluZm8ucmVtb3RlVXJsKSxcclxuICAgICAgX19HSVRfUkVQT19OQU1FOiBKU09OLnN0cmluZ2lmeShnaXRJbmZvLnJlcG9OYW1lKSxcclxuICAgICAgX19BUFBfVkVSU0lPTjogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYubnBtX3BhY2thZ2VfdmVyc2lvbiksXHJcbiAgICAgIF9fUEtHX05BTUU6IEpTT04uc3RyaW5naWZ5KHBrZy5uYW1lKSxcclxuICAgICAgX19QS0dfREVTQ1JJUFRJT046IEpTT04uc3RyaW5naWZ5KHBrZy5kZXNjcmlwdGlvbiksXHJcbiAgICAgIF9fUEtHX0xJQ0VOU0U6IEpTT04uc3RyaW5naWZ5KHBrZy5saWNlbnNlKSxcclxuICAgICAgX19QS0dfREVQRU5ERU5DSUVTOiBKU09OLnN0cmluZ2lmeShwa2cuZGVwZW5kZW5jaWVzKSxcclxuICAgICAgX19QS0dfREVWX0RFUEVOREVOQ0lFUzogSlNPTi5zdHJpbmdpZnkocGtnLmRldkRlcGVuZGVuY2llcyksXHJcbiAgICAgIF9fUEtHX1BFRVJfREVQRU5ERU5DSUVTOiBKU09OLnN0cmluZ2lmeShwa2cucGVlckRlcGVuZGVuY2llcyksXHJcbiAgICAgIF9fUEtHX09QVElPTkFMX0RFUEVOREVOQ0lFUzogSlNPTi5zdHJpbmdpZnkocGtnLm9wdGlvbmFsRGVwZW5kZW5jaWVzKSxcclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICB0YXJnZXQ6ICdlc25leHQnLFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgbm9kZVBvbHlmaWxscyh7XHJcbiAgICAgICAgaW5jbHVkZTogWydwYXRoJywgJ2J1ZmZlcicsICdwcm9jZXNzJ10sXHJcbiAgICAgIH0pLFxyXG4gICAgICBjb25maWcubW9kZSAhPT0gJ3Rlc3QnICYmIHJlbWl4Q2xvdWRmbGFyZURldlByb3h5KCksXHJcbiAgICAgIHJlbWl4Vml0ZVBsdWdpbih7XHJcbiAgICAgICAgZnV0dXJlOiB7XHJcbiAgICAgICAgICB2M19mZXRjaGVyUGVyc2lzdDogdHJ1ZSxcclxuICAgICAgICAgIHYzX3JlbGF0aXZlU3BsYXRQYXRoOiB0cnVlLFxyXG4gICAgICAgICAgdjNfdGhyb3dBYm9ydFJlYXNvbjogdHJ1ZSxcclxuICAgICAgICAgIHYzX2xhenlSb3V0ZURpc2NvdmVyeTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgICAgVW5vQ1NTKCksXHJcbiAgICAgIHRzY29uZmlnUGF0aHMoKSxcclxuICAgICAgY2hyb21lMTI5SXNzdWVQbHVnaW4oKSxcclxuICAgICAgY29uZmlnLm1vZGUgPT09ICdwcm9kdWN0aW9uJyAmJiBvcHRpbWl6ZUNzc01vZHVsZXMoeyBhcHBseTogJ2J1aWxkJyB9KSxcclxuICAgIF0sXHJcbiAgICBlbnZQcmVmaXg6IFtcclxuICAgICAgJ1ZJVEVfJyxcclxuICAgICAgJ09QRU5BSV9MSUtFX0FQSV9CQVNFX1VSTCcsXHJcbiAgICAgICdPTExBTUFfQVBJX0JBU0VfVVJMJyxcclxuICAgICAgJ0xNU1RVRElPX0FQSV9CQVNFX1VSTCcsXHJcbiAgICAgICdUT0dFVEhFUl9BUElfQkFTRV9VUkwnLFxyXG4gICAgXSxcclxuICAgIGNzczoge1xyXG4gICAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XHJcbiAgICAgICAgc2Nzczoge1xyXG4gICAgICAgICAgYXBpOiAnbW9kZXJuLWNvbXBpbGVyJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9O1xyXG59KTtcclxuXHJcbmZ1bmN0aW9uIGNocm9tZTEyOUlzc3VlUGx1Z2luKCkge1xyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnY2hyb21lMTI5SXNzdWVQbHVnaW4nLFxyXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcjogVml0ZURldlNlcnZlcikge1xyXG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHJhdyA9IHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J10/Lm1hdGNoKC9DaHJvbShlfGl1bSlcXC8oWzAtOV0rKVxcLi8pO1xyXG5cclxuICAgICAgICBpZiAocmF3KSB7XHJcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gcGFyc2VJbnQocmF3WzJdLCAxMCk7XHJcblxyXG4gICAgICAgICAgaWYgKHZlcnNpb24gPT09IDEyOSkge1xyXG4gICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdjb250ZW50LXR5cGUnLCAndGV4dC9odG1sJyk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgJzxib2R5PjxoMT5QbGVhc2UgdXNlIENocm9tZSBDYW5hcnkgZm9yIHRlc3RpbmcuPC9oMT48cD5DaHJvbWUgMTI5IGhhcyBhbiBpc3N1ZSB3aXRoIEphdmFTY3JpcHQgbW9kdWxlcyAmIFZpdGUgbG9jYWwgZGV2ZWxvcG1lbnQsIHNlZSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3N0YWNrYmxpdHovYm9sdC5uZXcvaXNzdWVzLzg2I2lzc3VlY29tbWVudC0yMzk1NTE5MjU4XCI+Zm9yIG1vcmUgaW5mb3JtYXRpb24uPC9hPjwvcD48cD48Yj5Ob3RlOjwvYj4gVGhpcyBvbmx5IGltcGFjdHMgPHU+bG9jYWwgZGV2ZWxvcG1lbnQ8L3U+LiBgcG5wbSBydW4gYnVpbGRgIGFuZCBgcG5wbSBydW4gc3RhcnRgIHdpbGwgd29yayBmaW5lIGluIHRoaXMgYnJvd3Nlci48L3A+PC9ib2R5PicsXHJcbiAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBuZXh0KCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSxcclxuICB9O1xyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVIsU0FBUyxnQ0FBZ0MseUJBQXlCLGNBQWMsdUJBQXVCO0FBQzFYLE9BQU8sWUFBWTtBQUNuQixTQUFTLG9CQUF3QztBQUNqRCxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLDBCQUEwQjtBQUNuQyxPQUFPLG1CQUFtQjtBQUMxQixZQUFZLFlBQVk7QUFDeEIsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxZQUFZO0FBRWQsY0FBTztBQUdkLElBQU0sYUFBYSxNQUFNO0FBQ3ZCLE1BQUk7QUFDRixXQUFPO0FBQUEsTUFDTCxZQUFZLFNBQVMsNEJBQTRCLEVBQUUsU0FBUyxFQUFFLEtBQUs7QUFBQSxNQUNuRSxRQUFRLFNBQVMsaUNBQWlDLEVBQUUsU0FBUyxFQUFFLEtBQUs7QUFBQSxNQUNwRSxZQUFZLFNBQVMseUJBQXlCLEVBQUUs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
